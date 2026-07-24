import Konva from 'konva'
import { useEffect, useRef } from 'react'
import { Group } from 'react-konva'
import type { EditorShape } from '../../editor/model/types'
import { editorStore } from '../../editor/model/editor-store'
import { CanvasAiChangeIndicator } from '../../design-diff/components/CanvasAiChangeIndicator'
import { CanvasRadiusHandles } from './CanvasRadiusHandles'
import { CanvasSelectionTransformer } from './CanvasSelectionTransformer'
import { ShapeVisual } from './ShapeVisual'

type CanvasShapeProps = {
  shape: EditorShape
  selected: boolean
  onEditText: (id: string) => void
  changing: boolean
  aiLoading: boolean
  zoom: number
}

export function CanvasShape({ shape, selected, onEditText, changing, aiLoading, zoom }: CanvasShapeProps) {
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    if (!selected || !groupRef.current || !transformerRef.current) return
    transformerRef.current.nodes([groupRef.current])
    transformerRef.current.forceUpdate()
    transformerRef.current.getLayer()?.batchDraw()
  }, [selected, shape.width, shape.height, shape.rotation, shape.radius, shape.smoothing, shape.radiusTopLeft, shape.radiusTopRight, shape.radiusBottomRight, shape.radiusBottomLeft, shape.fontSize, shape.text])

  const selectShape = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true
    editorStore.document.select(shape.id, 'shiftKey' in event.evt && event.evt.shiftKey)
  }

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    editorStore.document.updateShapeLive(shape.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(12, shape.width * scaleX),
      height: Math.max(12, shape.height * scaleY),
      rotation: node.rotation(),
    })
    editorStore.document.endInteraction()
  }

  return (
    <>
      <Group
        ref={groupRef}
        name={`shape-${shape.id}`}
        x={shape.x}
        y={shape.y}
        rotation={shape.rotation}
        opacity={shape.opacity}
        draggable={editorStore.viewport.tool === 'select' && !editorStore.designDiff.isWorking && !shape.locked}
        onClick={selectShape}
        onTap={selectShape}
        onDblClick={(event) => {
          selectShape(event)
          if (shape.type === 'text' && !shape.locked) onEditText(shape.id)
        }}
        onDblTap={(event) => {
          selectShape(event)
          if (shape.type === 'text' && !shape.locked) onEditText(shape.id)
        }}
        onDragStart={(event) => editorStore.document.beginShapeDrag(shape.id, editorStore.viewport.isOptionPressed || ('altKey' in event.evt && event.evt.altKey))}
        onDragMove={(event) => editorStore.document.updateShapeLive(shape.id, { x: event.target.x(), y: event.target.y() })}
        onDragEnd={(event) => {
          editorStore.document.updateShapeLive(shape.id, { x: event.target.x(), y: event.target.y() })
          editorStore.document.endInteraction()
        }}
        onTransformStart={editorStore.document.beginInteraction}
        onTransformEnd={handleTransformEnd}
      >
        <ShapeVisual shape={shape} />
      </Group>
      {changing && <CanvasAiChangeIndicator x={shape.x} y={shape.y} width={shape.width} height={shape.height} rotation={shape.rotation} zoom={zoom} showActivity={aiLoading} />}
      {selected && editorStore.viewport.tool === 'select' && !aiLoading && (
        <CanvasSelectionTransformer transformerRef={transformerRef} enabled={!editorStore.designDiff.isWorking && !shape.locked} />
      )}
      {selected && editorStore.document.selectedShape?.id === shape.id && editorStore.viewport.tool === 'select' && !aiLoading && (
        <CanvasRadiusHandles shape={shape} zoom={zoom} disabled={editorStore.designDiff.isWorking || shape.locked} />
      )}
    </>
  )
}
