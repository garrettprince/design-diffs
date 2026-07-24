import Konva from 'konva'
import { Circle, Group } from 'react-konva'
import { clampCornerRadius, cornerRadiusKeys, getCornerRadii, getCornerRadiusMaximum, type CornerRadiusKey } from '../../editor/model/radius'
import type { EditorShape } from '../../editor/model/types'
import { editorStore } from '../../editor/model/editor-store'

type CanvasRadiusHandlesProps = {
  shape: EditorShape
  zoom: number
  x?: number
  y?: number
  rotation?: number
  disabled?: boolean
}

const HANDLE_RADIUS_PX = 3.5
const HANDLE_MIN_INSET_PX = 10

const radiusToDistance = (radius: number, maximum: number, minimumInset: number) => {
  if (maximum <= minimumInset) return maximum
  return minimumInset + radius / maximum * (maximum - minimumInset)
}

const distanceToRadius = (distance: number, maximum: number, minimumInset: number) => {
  if (maximum <= minimumInset) return maximum
  return clampCornerRadius((distance - minimumInset) / (maximum - minimumInset) * maximum, maximum)
}

const getHandlePosition = (corner: CornerRadiusKey, distance: number, width: number, height: number) => {
  if (corner === 'radiusTopLeft') return { x: distance, y: distance }
  if (corner === 'radiusTopRight') return { x: width - distance, y: distance }
  if (corner === 'radiusBottomRight') return { x: width - distance, y: height - distance }
  return { x: distance, y: height - distance }
}

const getDraggedDistance = (corner: CornerRadiusKey, x: number, y: number, width: number, height: number) => {
  if (corner === 'radiusTopLeft') return Math.min(x, y)
  if (corner === 'radiusTopRight') return Math.min(width - x, y)
  if (corner === 'radiusBottomRight') return Math.min(width - x, height - y)
  return Math.min(x, height - y)
}

export function CanvasRadiusHandles({ shape, zoom, x = shape.x, y = shape.y, rotation = shape.rotation, disabled = false }: CanvasRadiusHandlesProps) {
  if (shape.type !== 'rectangle' || disabled) return null
  const inverseZoom = 1 / Math.max(zoom, 0.2)
  const maximum = getCornerRadiusMaximum(shape)
  const minimumInset = Math.min(maximum, HANDLE_MIN_INSET_PX * inverseZoom)
  const radii = getCornerRadii(shape)

  const updateRadiusFromHandle = (corner: CornerRadiusKey, node: Konva.Circle) => {
    const draggedDistance = getDraggedDistance(corner, node.x(), node.y(), shape.width, shape.height)
    const radius = Math.round(distanceToRadius(draggedDistance, maximum, minimumInset))
    editorStore.document.updateShapeLive(shape.id, { independentCorners: false, radius })
    const position = getHandlePosition(corner, radiusToDistance(radius, maximum, minimumInset), shape.width, shape.height)
    node.position(position)
    node.getLayer()?.batchDraw()
  }

  return (
    <Group x={x} y={y} rotation={rotation} listening>
      {cornerRadiusKeys.map((corner, index) => {
        const distance = radiusToDistance(radii[index], maximum, minimumInset)
        const position = getHandlePosition(corner, distance, shape.width, shape.height)
        return (
          <Circle
            key={corner}
            {...position}
            radius={HANDLE_RADIUS_PX * inverseZoom}
            fill="#FFFFFF"
            stroke="#1677FF"
            strokeWidth={1}
            strokeScaleEnabled={false}
            hitStrokeWidth={10}
            draggable
            onMouseDown={(event) => { event.cancelBubble = true }}
            onTouchStart={(event) => { event.cancelBubble = true }}
            onDragStart={(event) => {
              event.cancelBubble = true
              editorStore.document.beginInteraction()
            }}
            onDragMove={(event) => {
              event.cancelBubble = true
              updateRadiusFromHandle(corner, event.target as Konva.Circle)
            }}
            onDragEnd={(event) => {
              event.cancelBubble = true
              updateRadiusFromHandle(corner, event.target as Konva.Circle)
              editorStore.document.endInteraction()
            }}
          />
        )
      })}
    </Group>
  )
}
