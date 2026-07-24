import { getGroupContentCenteringOffset, type DesignDiffGroupPreview } from '../../design-diff/model/design-diff-model'
import type { EditorGroup, EditorShape, GroupPatch, LayerReference, ShapePatch } from './types'

const round = (value: number) => Math.round(value * 100) / 100
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const groupVisualProperties = [
  'fill',
  'fillType',
  'fillGradientStart',
  'fillGradientEnd',
  'fillGradientAngle',
  'fillOpacity',
  'fillVisible',
  'fillPresent',
  'outlineVisible',
  'outlinePresent',
  'outlineWidth',
  'outlineOffset',
  'outlineColor',
  'outlineOpacity',
  'borderVisible',
  'borderPresent',
  'borderWidth',
  'borderSides',
  'borderColor',
  'borderOpacity',
  'shadowVisible',
  'shadowPresent',
  'shadowX',
  'shadowY',
  'shadowBlur',
  'shadowSpread',
  'shadowColor',
  'shadowOpacity',
  'innerShadowVisible',
  'innerShadowPresent',
  'innerShadowX',
  'innerShadowY',
  'innerShadowBlur',
  'innerShadowSpread',
  'innerShadowColor',
  'innerShadowOpacity',
] as const satisfies readonly (keyof ShapePatch & keyof GroupPatch)[]

export function applyShapePatchToShapes(shapes: EditorShape[], id: string, patch: ShapePatch) {
  return shapes.map((shape) => {
    if (shape.id !== id) return shape
    const next = { ...shape, ...patch }
    next.width = Math.max(1, round(next.width))
    next.height = Math.max(1, round(next.height))
    next.opacity = clamp(next.opacity, 0, 1)
    next.fillOpacity = clamp(next.fillOpacity, 0, 1)
    next.outlineWidth = Math.max(0, round(next.outlineWidth))
    next.outlineOffset = round(next.outlineOffset)
    next.outlineOpacity = clamp(next.outlineOpacity, 0, 1)
    next.borderWidth = Math.max(0, round(next.borderWidth))
    next.borderOpacity = clamp(next.borderOpacity, 0, 1)
    next.shadowBlur = Math.max(0, round(next.shadowBlur))
    next.shadowOpacity = clamp(next.shadowOpacity, 0, 1)
    next.shadowX = round(next.shadowX)
    next.shadowY = round(next.shadowY)
    next.shadowSpread = round(next.shadowSpread)
    next.innerShadowBlur = Math.max(0, round(next.innerShadowBlur))
    next.innerShadowOpacity = clamp(next.innerShadowOpacity, 0, 1)
    next.innerShadowX = round(next.innerShadowX)
    next.innerShadowY = round(next.innerShadowY)
    next.innerShadowSpread = round(next.innerShadowSpread)
    next.fillGradientAngle = ((round(next.fillGradientAngle) % 360) + 360) % 360
    const maximumRadius = Math.max(0, Math.min(next.width, next.height) / 2)
    next.radius = clamp(round(next.radius), 0, maximumRadius)
    next.smoothing = clamp(round(next.smoothing), 0, 1)
    const hasExplicitCornerRadius = patch.radiusTopLeft !== undefined || patch.radiusTopRight !== undefined || patch.radiusBottomRight !== undefined || patch.radiusBottomLeft !== undefined
    if (patch.radius !== undefined && !hasExplicitCornerRadius) {
      next.radiusTopLeft = next.radius
      next.radiusTopRight = next.radius
      next.radiusBottomRight = next.radius
      next.radiusBottomLeft = next.radius
    }
    next.radiusTopLeft = clamp(round(next.radiusTopLeft ?? next.radius), 0, maximumRadius)
    next.radiusTopRight = clamp(round(next.radiusTopRight ?? next.radius), 0, maximumRadius)
    next.radiusBottomRight = clamp(round(next.radiusBottomRight ?? next.radius), 0, maximumRadius)
    next.radiusBottomLeft = clamp(round(next.radiusBottomLeft ?? next.radius), 0, maximumRadius)
    next.fontSize = Math.max(1, round(next.fontSize))
    next.x = round(next.x)
    next.y = round(next.y)
    next.rotation = round(next.rotation)
    return next
  })
}

export function applyGroupPatchToDocument(
  shapes: EditorShape[],
  groups: EditorGroup[],
  id: string,
  patch: GroupPatch,
  snapGeometry = false,
) {
  const current = groups.find((group) => group.id === id)
  if (!current) return { shapes, groups }

  const normalizeGeometry = snapGeometry ? Math.round : round
  const nextWidth = patch.width === undefined ? current.width : Math.max(1, normalizeGeometry(patch.width))
  const nextHeight = patch.height === undefined ? current.height : Math.max(1, normalizeGeometry(patch.height))
  const scaleX = nextWidth / current.width
  const scaleY = nextHeight / current.height
  let nextShapes = shapes

  if (scaleX !== 1 || scaleY !== 1) {
    const radiusScale = Math.min(Math.abs(scaleX), Math.abs(scaleY))
    nextShapes = nextShapes.map((shape) => shape.groupId === id ? {
      ...shape,
      x: normalizeGeometry(shape.x * scaleX),
      y: normalizeGeometry(shape.y * scaleY),
      width: Math.max(1, normalizeGeometry(shape.width * scaleX)),
      height: Math.max(1, normalizeGeometry(shape.height * scaleY)),
      radius: Math.max(0, normalizeGeometry(shape.radius * radiusScale)),
      radiusTopLeft: Math.max(0, normalizeGeometry(shape.radiusTopLeft * radiusScale)),
      radiusTopRight: Math.max(0, normalizeGeometry(shape.radiusTopRight * radiusScale)),
      radiusBottomRight: Math.max(0, normalizeGeometry(shape.radiusBottomRight * radiusScale)),
      radiusBottomLeft: Math.max(0, normalizeGeometry(shape.radiusBottomLeft * radiusScale)),
      fontSize: shape.type === 'text' ? Math.max(1, normalizeGeometry(shape.fontSize * Math.abs(scaleY))) : shape.fontSize,
    } : shape)
  }

  const visualPatch = Object.fromEntries(
    groupVisualProperties.flatMap((property) => patch[property] === undefined ? [] : [[property, patch[property]]]),
  ) as ShapePatch
  if (Object.keys(visualPatch).length > 0) {
    nextShapes = nextShapes.map((shape) => shape.groupId === id
      ? applyShapePatchToShapes([shape], shape.id, visualPatch)[0]
      : shape)
  }

  const nextGroups = groups.map((group) => group.id === id ? {
    ...group,
    ...patch,
    width: nextWidth,
    height: nextHeight,
    x: normalizeGeometry(patch.x ?? group.x),
    y: normalizeGeometry(patch.y ?? group.y),
    rotation: normalizeGeometry(patch.rotation ?? group.rotation),
    opacity: clamp(patch.opacity ?? group.opacity, 0, 1),
    fillGradientAngle: ((round(patch.fillGradientAngle ?? group.fillGradientAngle) % 360) + 360) % 360,
    fillOpacity: clamp(patch.fillOpacity ?? group.fillOpacity, 0, 1),
    outlineWidth: Math.max(0, round(patch.outlineWidth ?? group.outlineWidth)),
    outlineOffset: round(patch.outlineOffset ?? group.outlineOffset),
    outlineOpacity: clamp(patch.outlineOpacity ?? group.outlineOpacity, 0, 1),
    borderWidth: Math.max(0, round(patch.borderWidth ?? group.borderWidth)),
    borderOpacity: clamp(patch.borderOpacity ?? group.borderOpacity, 0, 1),
    shadowX: round(patch.shadowX ?? group.shadowX),
    shadowY: round(patch.shadowY ?? group.shadowY),
    shadowBlur: Math.max(0, round(patch.shadowBlur ?? group.shadowBlur)),
    shadowSpread: round(patch.shadowSpread ?? group.shadowSpread),
    shadowOpacity: clamp(patch.shadowOpacity ?? group.shadowOpacity, 0, 1),
    innerShadowX: round(patch.innerShadowX ?? group.innerShadowX),
    innerShadowY: round(patch.innerShadowY ?? group.innerShadowY),
    innerShadowBlur: Math.max(0, round(patch.innerShadowBlur ?? group.innerShadowBlur)),
    innerShadowSpread: round(patch.innerShadowSpread ?? group.innerShadowSpread),
    innerShadowOpacity: clamp(patch.innerShadowOpacity ?? group.innerShadowOpacity, 0, 1),
  } : group)

  return { shapes: nextShapes, groups: nextGroups }
}

export function centerGroupContentOnShape(shapes: EditorShape[], groupId: string, targetId: string) {
  const target = shapes.find((shape) => shape.id === targetId && shape.groupId === groupId)
  if (!target) return shapes
  const offset = getGroupContentCenteringOffset(target, shapes.filter((shape) => shape.groupId === groupId))
  if (!offset || (offset.x === 0 && offset.y === 0)) return shapes
  return shapes.map((shape) => shape.groupId === groupId && shape.id !== targetId ? {
    ...shape,
    x: round(shape.x + offset.x),
    y: round(shape.y + offset.y),
  } : shape)
}

export function restoreGroupPreviewGeometry(shapes: EditorShape[], preview: DesignDiffGroupPreview | undefined) {
  if (!preview) return shapes
  const geometryById = new Map(preview.shapes.map((shape) => [shape.id, {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rotation: shape.rotation,
  }]))
  return shapes.map((shape) => {
    const geometry = geometryById.get(shape.id)
    return geometry ? { ...shape, ...geometry } : shape
  })
}

export function applyTopLevelLayerOrder(
  shapes: EditorShape[],
  groups: EditorGroup[],
  references: LayerReference[],
) {
  const shapeById = new Map(shapes.map((shape) => [shape.id, shape]))
  const groupById = new Map(groups.map((group) => [group.id, group]))
  const orderedShapes = references.flatMap((reference) => {
    if (reference.kind === 'shape') {
      const shape = shapeById.get(reference.id)
      return shape ? [shape] : []
    }
    const group = groupById.get(reference.id)
    return group ? group.shapeIds.flatMap((id) => {
      const shape = shapeById.get(id)
      return shape ? [shape] : []
    }) : []
  })
  const orderedIds = new Set(orderedShapes.map((shape) => shape.id))
  return [...shapes.filter((shape) => !orderedIds.has(shape.id)), ...orderedShapes]
}
