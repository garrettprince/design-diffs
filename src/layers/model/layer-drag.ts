import type { DragEvent } from 'react'
import type { LayerPlacement, LayerReference } from '../../editor/model/types'

const LAYER_MIME_TYPE = 'application/x-paper-layer'

let activeLayer: LayerReference | null = null

export function beginLayerDrag(event: DragEvent<HTMLElement>, layer: LayerReference) {
  activeLayer = layer
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(LAYER_MIME_TYPE, JSON.stringify(layer))
}

export function endLayerDrag() {
  activeLayer = null
}

export function getDraggedLayer(event?: DragEvent<HTMLElement>): LayerReference | null {
  if (activeLayer) return activeLayer
  if (!event) return null

  try {
    return JSON.parse(event.dataTransfer.getData(LAYER_MIME_TYPE)) as LayerReference
  } catch {
    return null
  }
}

export function canReorderLayer(dragged: LayerReference | null, target: LayerReference) {
  if (!dragged || dragged.groupId !== target.groupId) return false
  if (dragged.kind === target.kind && dragged.id === target.id) return false
  return dragged.groupId === null || (dragged.kind === 'shape' && target.kind === 'shape')
}

export function getLayerPlacement(event: DragEvent<HTMLElement>): LayerPlacement {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY < bounds.top + bounds.height / 2 ? 'above' : 'below'
}
