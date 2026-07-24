import Konva from 'konva'
import { useLayoutEffect, useRef } from 'react'
import { Group, Rect } from 'react-konva'
import type { EditorGroup, EditorShape } from '../../editor/model/types'
import { editorStore } from '../../editor/model/editor-store'
import { CanvasAiChangeIndicator } from '../../design-diff/components/CanvasAiChangeIndicator'
import { CanvasRadiusHandles } from './CanvasRadiusHandles'
import { CanvasSelectionTransformer } from './CanvasSelectionTransformer'
import { ShapeVisual } from './ShapeVisual'

type CanvasGroupProps = {
  group: EditorGroup
  shapes: EditorShape[]
  selected: boolean
  selectedShapeId: string | null
  changing: boolean
  aiLoading: boolean
  zoom: number
}

export function CanvasGroup({ group, shapes, selected, selectedShapeId, changing, aiLoading, zoom }: CanvasGroupProps) {
  const groupRef = useRef<Konva.Group>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const selectionProxyRef = useRef<Konva.Group>(null)
  const childTransformerRef = useRef<Konva.Transformer>(null)
  const selectedShape = selectedShapeId ? shapes.find((shape) => shape.id === selectedShapeId) ?? null : null
  const groupRadians = group.rotation * Math.PI / 180
  const groupCosine = Math.cos(groupRadians)
  const groupSine = Math.sin(groupRadians)
  const selectedShapePosition = selectedShape ? {
    x: group.x + selectedShape.x * groupCosine - selectedShape.y * groupSine,
    y: group.y + selectedShape.x * groupSine + selectedShape.y * groupCosine,
    rotation: group.rotation + selectedShape.rotation,
  } : null

  useLayoutEffect(() => {
    if (!selected || !groupRef.current || !transformerRef.current) return
    transformerRef.current.nodes([groupRef.current])
    transformerRef.current.forceUpdate()
    transformerRef.current.getLayer()?.batchDraw()
  }, [selected, group.width, group.height, group.rotation, group.opacity, shapes])

  useLayoutEffect(() => {
    if (!selectedShapeId || !selectionProxyRef.current || !childTransformerRef.current) return
    childTransformerRef.current.nodes([selectionProxyRef.current])
    childTransformerRef.current.forceUpdate()
    childTransformerRef.current.getLayer()?.batchDraw()
  }, [selectedShapeId, shapes])

  const handleTransformEnd = () => {
    const node = groupRef.current
    if (!node) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    editorStore.document.updateGroupLive(group.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(12, group.width * Math.abs(scaleX)),
      height: Math.max(12, group.height * Math.abs(scaleY)),
      rotation: node.rotation(),
    })
    editorStore.document.endInteraction()
  }

  const handleChildTransformEnd = () => {
    const node = selectionProxyRef.current
    if (!node || !selectedShape) return
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    const deltaX = node.x() - group.x
    const deltaY = node.y() - group.y
    node.scaleX(1)
    node.scaleY(1)
    editorStore.document.updateShapeLive(selectedShape.id, {
      x: deltaX * groupCosine + deltaY * groupSine,
      y: -deltaX * groupSine + deltaY * groupCosine,
      width: Math.max(12, selectedShape.width * Math.abs(scaleX)),
      height: Math.max(12, selectedShape.height * Math.abs(scaleY)),
      rotation: node.rotation() - group.rotation,
    })
    editorStore.document.endInteraction()
  }

  return (
    <>
      <Group
        ref={groupRef}
        name={`group-${group.id}`}
        x={group.x}
        y={group.y}
        width={group.width}
        height={group.height}
        rotation={group.rotation}
        opacity={group.opacity}
        draggable={editorStore.viewport.tool === 'select' && !editorStore.designDiff.isWorking && !group.locked}
        onClick={(event) => {
          event.cancelBubble = true
          editorStore.document.selectGroup(group.id)
        }}
        onTap={(event) => {
          event.cancelBubble = true
          editorStore.document.selectGroup(group.id)
        }}
        onDragStart={(event) => editorStore.document.beginGroupDrag(group.id, editorStore.viewport.isOptionPressed || ('altKey' in event.evt && event.evt.altKey))}
        onDragMove={(event) => editorStore.document.updateGroupLive(group.id, { x: event.target.x(), y: event.target.y() })}
        onDragEnd={(event) => {
          editorStore.document.updateGroupLive(group.id, { x: event.target.x(), y: event.target.y() })
          editorStore.document.endInteraction()
        }}
        onTransformStart={editorStore.document.beginInteraction}
        onTransformEnd={handleTransformEnd}
      >
        {shapes.filter((shape) => shape.visible).map((shape) => (
          <Group
            key={shape.id}
            x={shape.x}
            y={shape.y}
            rotation={shape.rotation}
            opacity={shape.opacity}
            draggable={selectedShapeId === shape.id && editorStore.viewport.tool === 'select' && !editorStore.designDiff.isWorking && !group.locked && !shape.locked}
            onDblClick={(event) => {
              event.cancelBubble = true
              editorStore.document.selectNestedShape(shape.id)
            }}
            onDblTap={(event) => {
              event.cancelBubble = true
              editorStore.document.selectNestedShape(shape.id)
            }}
            onDragStart={(event) => {
              event.cancelBubble = true
              editorStore.document.beginShapeDrag(shape.id, editorStore.viewport.isOptionPressed || ('altKey' in event.evt && event.evt.altKey))
            }}
            onDragMove={(event) => {
              event.cancelBubble = true
              editorStore.document.updateShapeLive(shape.id, { x: event.target.x(), y: event.target.y() })
            }}
            onDragEnd={(event) => {
              event.cancelBubble = true
              editorStore.document.updateShapeLive(shape.id, { x: event.target.x(), y: event.target.y() })
              editorStore.document.endInteraction()
            }}
          >
            <ShapeVisual shape={shape} />
          </Group>
        ))}
      </Group>
      {changing && <CanvasAiChangeIndicator x={group.x} y={group.y} width={group.width} height={group.height} rotation={group.rotation} zoom={zoom} showActivity={aiLoading} />}
      {selectedShape && selectedShapePosition && editorStore.viewport.tool === 'select' && !aiLoading && (
        <>
          <Group
            ref={selectionProxyRef}
            x={selectedShapePosition.x}
            y={selectedShapePosition.y}
            rotation={selectedShapePosition.rotation}
            onTransformStart={editorStore.document.beginInteraction}
            onTransformEnd={handleChildTransformEnd}
          >
            <Rect width={selectedShape.width} height={selectedShape.height} fill="rgba(0,0,0,0.001)" listening={false} />
          </Group>
          <CanvasSelectionTransformer transformerRef={childTransformerRef} enabled={!editorStore.designDiff.isWorking && !group.locked && !selectedShape.locked} />
          <CanvasRadiusHandles
            shape={selectedShape}
            zoom={zoom}
            x={selectedShapePosition.x}
            y={selectedShapePosition.y}
            rotation={selectedShapePosition.rotation}
            disabled={editorStore.designDiff.isWorking || group.locked || selectedShape.locked}
          />
        </>
      )}
      {selected && editorStore.viewport.tool === 'select' && !aiLoading && (
        <CanvasSelectionTransformer transformerRef={transformerRef} enabled={!editorStore.designDiff.isWorking && !group.locked} />
      )}
    </>
  )
}
