import Konva from 'konva'
import { observer } from 'mobx-react-lite'
import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Stage } from 'react-konva'
import { canvasAiResultFocusSpring } from '../../design-diff/constants/design-diff-motion'
import { CanvasAiPrompt } from '../../design-diff/components/CanvasAiPrompt'
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from '../../editor/constants/editor-constants'
import { editorStore } from '../../editor/model/editor-store'
import type { ShapeDraft, ShapeType } from '../../editor/model/types'
import { CanvasScene } from './CanvasScene'
import { PixelGridLayer } from './PixelGridLayer'
import { TextEditorOverlay } from './TextEditorOverlay'

type Point = { x: number; y: number }
type SelectionDraft = { x: number; y: number; width: number; height: number; additive: boolean }

const FOCUSED_ELEMENT_FILL = 0.52
const MAX_FOCUSED_ZOOM = 2.3
const PIXEL_GRID_ZOOM = 8
const PINCH_ZOOM_SENSITIVITY = 0.004

const getCanvasPoint = (stage: Konva.Stage): Point | null => {
  const pointer = stage.getPointerPosition()
  if (!pointer) return null
  return {
    x: (pointer.x - editorStore.viewport.panX) / editorStore.viewport.zoom,
    y: (pointer.y - editorStore.viewport.panY) / editorStore.viewport.zoom,
  }
}

export const CanvasStage = observer(function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1, height: 1 })
  const [draft, setDraft] = useState<ShapeDraft | null>(null)
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(null)
  const drawingStartRef = useRef<Point | null>(null)
  const draftRef = useRef<ShapeDraft | null>(null)
  const selectionStartRef = useRef<Point | null>(null)
  const selectionDraftRef = useRef<SelectionDraft | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const aiFocusTargetId = editorStore.designDiff.targetId
  const aiFocusPhase = editorStore.designDiff.status

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () => setSize({ width: container.clientWidth, height: container.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if ((aiFocusPhase !== 'loading' && aiFocusPhase !== 'review') || !aiFocusTargetId || size.width <= 1 || size.height <= 1) return
    const bounds = editorStore.document.selectedBounds
    if (!bounds) return

    const startZoom = editorStore.viewport.zoom
    const startPanX = editorStore.viewport.panX
    const startPanY = editorStore.viewport.panY
    const boundsWidth = Math.max(1, bounds.right - bounds.left)
    const boundsHeight = Math.max(1, bounds.bottom - bounds.top)
    const focusZoom = Math.min(
      size.width * FOCUSED_ELEMENT_FILL / boundsWidth,
      size.height * FOCUSED_ELEMENT_FILL / boundsHeight,
      MAX_FOCUSED_ZOOM,
    )
    const targetZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(startZoom, focusZoom))
    const targetPanX = size.width / 2 - (bounds.left + bounds.right) / 2 * targetZoom
    const targetPanY = size.height / 2 - (bounds.top + bounds.bottom) / 2 * targetZoom

    if (shouldReduceMotion) {
      editorStore.viewport.setViewport(targetZoom, targetPanX, targetPanY)
      return
    }

    const focusAnimation = animate(0, 1, {
      ...canvasAiResultFocusSpring,
      onUpdate: (progress) => editorStore.viewport.setViewport(
        startZoom + (targetZoom - startZoom) * progress,
        startPanX + (targetPanX - startPanX) * progress,
        startPanY + (targetPanY - startPanY) * progress,
      ),
    })
    const stopAnimation = () => focusAnimation.stop()
    globalThis.addEventListener('wheel', stopAnimation, { capture: true, passive: true })
    globalThis.addEventListener('pointerdown', stopAnimation, { capture: true })
    globalThis.addEventListener('keydown', stopAnimation, { capture: true })

    return () => {
      focusAnimation.stop()
      globalThis.removeEventListener('wheel', stopAnimation, { capture: true })
      globalThis.removeEventListener('pointerdown', stopAnimation, { capture: true })
      globalThis.removeEventListener('keydown', stopAnimation, { capture: true })
    }
  }, [aiFocusPhase, aiFocusTargetId, shouldReduceMotion, size.height, size.width])

  const isPanning = editorStore.viewport.tool === 'hand' || editorStore.viewport.isSpacePressed

  const handlePointerDown = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = event.target.getStage()
    if (!stage || event.target !== stage || isPanning) return
    if (editorStore.viewport.tool === 'select') {
      const point = getCanvasPoint(stage)
      if (!point) return
      const additive = 'shiftKey' in event.evt && event.evt.shiftKey
      if (!additive) editorStore.document.select(null)
      const nextSelectionDraft = { x: point.x, y: point.y, width: 0, height: 0, additive }
      selectionStartRef.current = point
      selectionDraftRef.current = nextSelectionDraft
      setSelectionDraft(nextSelectionDraft)
      return
    }
    if (!['rectangle', 'ellipse', 'text'].includes(editorStore.viewport.tool)) return
    const point = getCanvasPoint(stage)
    if (!point) return
    const nextDraft = { type: editorStore.viewport.tool as ShapeType, x: point.x, y: point.y, width: 0, height: 0 }
    drawingStartRef.current = point
    draftRef.current = nextDraft
    setDraft(nextDraft)
  }

  const handlePointerMove = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = event.target.getStage()
    if (!stage) return
    const point = getCanvasPoint(stage)
    if (!point) return

    const activeSelectionDraft = selectionDraftRef.current
    const selectionStart = selectionStartRef.current
    if (activeSelectionDraft && selectionStart) {
      const nextSelectionDraft = {
        ...activeSelectionDraft,
        x: Math.min(selectionStart.x, point.x),
        y: Math.min(selectionStart.y, point.y),
        width: Math.abs(point.x - selectionStart.x),
        height: Math.abs(point.y - selectionStart.y),
      }
      selectionDraftRef.current = nextSelectionDraft
      setSelectionDraft(nextSelectionDraft)
      return
    }

    const activeDraft = draftRef.current
    const drawingStart = drawingStartRef.current
    if (!activeDraft || !drawingStart) return
    const nextDraft = {
      ...activeDraft,
      x: Math.min(drawingStart.x, point.x),
      y: Math.min(drawingStart.y, point.y),
      width: Math.abs(point.x - drawingStart.x),
      height: Math.abs(point.y - drawingStart.y),
    }
    draftRef.current = nextDraft
    setDraft(nextDraft)
  }

  const handlePointerUp = () => {
    const activeSelectionDraft = selectionDraftRef.current
    if (activeSelectionDraft) {
      if (activeSelectionDraft.width >= 3 && activeSelectionDraft.height >= 3) {
        editorStore.document.selectInBounds({
          left: activeSelectionDraft.x,
          top: activeSelectionDraft.y,
          right: activeSelectionDraft.x + activeSelectionDraft.width,
          bottom: activeSelectionDraft.y + activeSelectionDraft.height,
        }, activeSelectionDraft.additive)
      }
      selectionStartRef.current = null
      selectionDraftRef.current = null
      setSelectionDraft(null)
      return
    }

    const activeDraft = draftRef.current
    if (!activeDraft) return
    const id = editorStore.document.createShape(activeDraft.type, activeDraft.x, activeDraft.y, activeDraft.width, activeDraft.height)
    drawingStartRef.current = null
    draftRef.current = null
    setDraft(null)
    if (activeDraft.type === 'text') setEditingTextId(id)
  }

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault()
    const isZoomGesture = event.evt.ctrlKey || event.evt.metaKey
    if (!isZoomGesture) {
      const deltaScale = event.evt.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.evt.deltaMode === WheelEvent.DOM_DELTA_PAGE ? size.height : 1
      editorStore.viewport.setPan(
        editorStore.viewport.panX - event.evt.deltaX * deltaScale,
        editorStore.viewport.panY - event.evt.deltaY * deltaScale,
      )
      return
    }

    const stage = event.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!stage || !pointer) return
    const oldZoom = editorStore.viewport.zoom
    const point = { x: (pointer.x - editorStore.viewport.panX) / oldZoom, y: (pointer.y - editorStore.viewport.panY) / oldZoom }
    const nextZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, oldZoom * Math.exp(-event.evt.deltaY * PINCH_ZOOM_SENSITIVITY)))
    editorStore.viewport.setViewport(nextZoom, pointer.x - point.x * nextZoom, pointer.y - point.y * nextZoom)
  }

  const editingShape = editingTextId ? editorStore.document.shapes.find((shape) => shape.id === editingTextId) ?? null : null
  const cursor = isPanning ? 'grab' : ['frame', 'rectangle', 'ellipse', 'pen', 'text'].includes(editorStore.viewport.tool) ? 'crosshair' : 'default'
  const pixelGrid = editorStore.viewport.zoom >= PIXEL_GRID_ZOOM
    ? {
        left: Math.floor(-editorStore.viewport.panX / editorStore.viewport.zoom) - 1,
        right: Math.ceil((size.width - editorStore.viewport.panX) / editorStore.viewport.zoom) + 1,
        top: Math.floor(-editorStore.viewport.panY / editorStore.viewport.zoom) - 1,
        bottom: Math.ceil((size.height - editorStore.viewport.panY) / editorStore.viewport.zoom) + 1,
      }
    : null

  return (
    <div ref={containerRef} className="absolute inset-0 touch-none overflow-hidden [&_canvas]:block" data-testid="canvas-stage" style={{ cursor }}>
      <Stage
        width={size.width}
        height={size.height}
        x={editorStore.viewport.panX}
        y={editorStore.viewport.panY}
        scaleX={editorStore.viewport.zoom}
        scaleY={editorStore.viewport.zoom}
        draggable={isPanning}
        onDragEnd={(event) => {
          const stage = event.target.getStage()
          if (stage && event.target === stage) editorStore.viewport.setPan(stage.x(), stage.y())
        }}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      >
        <CanvasScene draft={draft} editingTextId={editingTextId} selectionDraft={selectionDraft} setEditingTextId={setEditingTextId} zoom={editorStore.viewport.zoom} />
        {pixelGrid && <PixelGridLayer {...pixelGrid} />}
      </Stage>
      {editingShape && <TextEditorOverlay shape={editingShape} onClose={() => setEditingTextId(null)} />}
      <CanvasAiPrompt containerWidth={size.width} containerHeight={size.height} />
    </div>
  )
})
