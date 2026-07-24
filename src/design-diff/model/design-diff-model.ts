import {
  MAX_DESIGN_DIFF_DIMENSION,
  MAX_DESIGN_DIFF_FONT_SIZE,
  clampDesignDiffValue as clamp,
  isDesignDiffHexColor as isHexColor,
  isFiniteDesignDiffNumber as isFiniteNumber,
  parseBorderDesignDiffState,
  parseInnerShadowDesignDiffState,
  parseLayoutDesignDiffState,
  parseOutlineDesignDiffState,
  parseShadowDesignDiffState,
  serializeBorderDesignDiffState,
  serializeInnerShadowDesignDiffState,
  serializeLayoutDesignDiffState,
  serializeOutlineDesignDiffState,
  serializeShadowDesignDiffState,
  type BorderDesignDiffState,
  type DesignDiffChange,
  type DesignDiffProperty,
  type DesignDiffRequestTarget,
  type DesignDiffValue,
  type InnerShadowDesignDiffState,
  type LayoutDesignDiffState,
  type OutlineDesignDiffState,
  type ShadowDesignDiffState,
} from '../../contracts/design-diff'
import type { EditorGroup, EditorShape, LayoutPatch } from '../../editor/model/types'

export * from '../../contracts/design-diff'

export type DesignDiffTarget = EditorShape | EditorGroup
export type DesignDiffGroupPreview = {
  group: EditorGroup
  shapes: EditorShape[]
}

export type CenterPreservingLayoutPatch = Required<Pick<LayoutPatch, 'x' | 'y' | 'width' | 'height'>>
export type GroupContentCenteringOffset = Required<Pick<LayoutPatch, 'x' | 'y'>>

export type DesignDiffStep = {
  id: string
  property: DesignDiffProperty
  beforeValue: DesignDiffValue
  afterValue: DesignDiffValue
  beforeTarget: DesignDiffTarget
  afterTarget: DesignDiffTarget
  beforePreview?: DesignDiffGroupPreview
  afterPreview?: DesignDiffGroupPreview
  accepted: boolean
}

export function getDesignDiffPropertyPanelTarget(step: DesignDiffStep, side: 'before' | 'after'): DesignDiffTarget {
  const target = side === 'before' ? step.beforeTarget : step.afterTarget
  const reference = side === 'before' ? step.afterTarget : step.beforeTarget

  if ((step.property === 'fill' || step.property === 'fillOpacity') && !target.fillPresent) {
    return { ...target, fillPresent: true, fillVisible: true, fillType: reference.fillType, fill: reference.fill, fillGradientStart: reference.fillGradientStart, fillGradientEnd: reference.fillGradientEnd, fillGradientAngle: reference.fillGradientAngle, fillOpacity: 0 }
  }
  if (step.property === 'outline' && !target.outlinePresent) {
    return { ...target, outlinePresent: true, outlineVisible: true, outlineWidth: 0, outlineOffset: reference.outlineOffset, outlineColor: reference.outlineColor, outlineOpacity: reference.outlineOpacity }
  }
  if (step.property === 'border' && !target.borderPresent) {
    return { ...target, borderPresent: true, borderVisible: true, borderWidth: 0, borderSides: reference.borderSides, borderColor: reference.borderColor, borderOpacity: reference.borderOpacity }
  }
  if (step.property === 'shadow' && !target.shadowPresent) {
    return { ...target, shadowPresent: true, shadowVisible: true, shadowX: reference.shadowX, shadowY: reference.shadowY, shadowBlur: reference.shadowBlur, shadowSpread: reference.shadowSpread, shadowColor: reference.shadowColor, shadowOpacity: 0 }
  }
  if (step.property === 'innerShadow' && !target.innerShadowPresent) {
    return { ...target, innerShadowPresent: true, innerShadowVisible: true, innerShadowX: reference.innerShadowX, innerShadowY: reference.innerShadowY, innerShadowBlur: reference.innerShadowBlur, innerShadowSpread: reference.innerShadowSpread, innerShadowColor: reference.innerShadowColor, innerShadowOpacity: 0 }
  }
  return target
}

export const getShadowDesignDiffState = (target: DesignDiffTarget): ShadowDesignDiffState => ({
  shadowPresent: target.shadowPresent,
  shadowVisible: target.shadowVisible,
  shadowX: target.shadowX,
  shadowY: target.shadowY,
  shadowBlur: target.shadowBlur,
  shadowSpread: target.shadowSpread,
  shadowColor: target.shadowColor,
  shadowOpacity: target.shadowOpacity,
})

export const getOutlineDesignDiffState = (target: DesignDiffTarget): OutlineDesignDiffState => ({
  outlinePresent: target.outlinePresent,
  outlineVisible: target.outlineVisible,
  outlineWidth: target.outlineWidth,
  outlineOffset: target.outlineOffset,
  outlineColor: target.outlineColor,
  outlineOpacity: target.outlineOpacity,
})

export const getBorderDesignDiffState = (target: DesignDiffTarget): BorderDesignDiffState => ({
  borderPresent: target.borderPresent,
  borderVisible: target.borderVisible,
  borderWidth: target.borderWidth,
  borderSides: target.borderSides,
  borderColor: target.borderColor,
  borderOpacity: target.borderOpacity,
})

export const getInnerShadowDesignDiffState = (target: DesignDiffTarget): InnerShadowDesignDiffState => ({
  innerShadowPresent: target.innerShadowPresent,
  innerShadowVisible: target.innerShadowVisible,
  innerShadowX: target.innerShadowX,
  innerShadowY: target.innerShadowY,
  innerShadowBlur: target.innerShadowBlur,
  innerShadowSpread: target.innerShadowSpread,
  innerShadowColor: target.innerShadowColor,
  innerShadowOpacity: target.innerShadowOpacity,
})

export const getLayoutDesignDiffState = (target: DesignDiffTarget): LayoutDesignDiffState => ({
  width: target.width,
  height: target.height,
})

export function getCenterPreservingLayoutPatch(target: DesignDiffTarget, layout: LayoutDesignDiffState): CenterPreservingLayoutPatch {
  return {
    x: target.x + (target.width - layout.width) / 2,
    y: target.y + (target.height - layout.height) / 2,
    width: layout.width,
    height: layout.height,
  }
}

const getRotatedDesignDiffBounds = (target: DesignDiffTarget) => {
  const radians = target.rotation * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const points = [
    [0, 0],
    [target.width, 0],
    [target.width, target.height],
    [0, target.height],
  ].map(([x, y]) => ({
    x: target.x + x * cosine - y * sine,
    y: target.y + x * sine + y * cosine,
  }))

  return {
    left: Math.min(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.max(...points.map((point) => point.y)),
  }
}

export function getGroupContentCenteringOffset(target: EditorShape, shapes: EditorShape[]): GroupContentCenteringOffset | null {
  const content = shapes.filter((shape) => shape.id !== target.id && shape.visible)
  if (content.length === 0) return null

  const targetBounds = getRotatedDesignDiffBounds(target)
  const contentBounds = content.map(getRotatedDesignDiffBounds)
  const contentLeft = Math.min(...contentBounds.map((bounds) => bounds.left))
  const contentTop = Math.min(...contentBounds.map((bounds) => bounds.top))
  const contentRight = Math.max(...contentBounds.map((bounds) => bounds.right))
  const contentBottom = Math.max(...contentBounds.map((bounds) => bounds.bottom))

  return {
    x: (targetBounds.left + targetBounds.right - contentLeft - contentRight) / 2,
    y: (targetBounds.top + targetBounds.bottom - contentTop - contentBottom) / 2,
  }
}

export function getDesignDiffValue(target: DesignDiffTarget, property: DesignDiffProperty): DesignDiffValue | null {
  if (property === 'shadow') return serializeShadowDesignDiffState(getShadowDesignDiffState(target))
  if (property === 'outline') return serializeOutlineDesignDiffState(getOutlineDesignDiffState(target))
  if (property === 'border') return serializeBorderDesignDiffState(getBorderDesignDiffState(target))
  if (property === 'innerShadow') return serializeInnerShadowDesignDiffState(getInnerShadowDesignDiffState(target))
  if (property === 'layout') return serializeLayoutDesignDiffState(getLayoutDesignDiffState(target))
  const value = target[property as keyof DesignDiffTarget]
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

export function getAvailableDesignDiffProperties(target: DesignDiffTarget): DesignDiffProperty[] {
  if (!('type' in target)) return ['fill', 'outline', 'border', 'shadow', 'innerShadow', 'layout', 'opacity']
  const common: DesignDiffProperty[] = ['fill', 'outline', 'border', 'shadow', 'innerShadow', 'layout', 'opacity']
  if (target.type === 'rectangle') return ['radius', 'smoothing', ...common]
  if (target.type === 'text') return [...common, 'text', 'fontSize', 'fontWeight', 'textAlign']
  return common
}

export function getGroupDesignDiffTarget(group: EditorGroup, shapes: EditorShape[]): EditorShape | null {
  const shapeIds = new Set(group.shapeIds)
  const candidates = shapes.filter((shape) => shapeIds.has(shape.id) && shape.visible && !shape.locked)
  if (candidates.length === 0) return null

  return [...candidates].sort((left, right) => {
    const leftPriority = left.type === 'rectangle' ? 2 : left.type === 'text' ? 0 : 1
    const rightPriority = right.type === 'rectangle' ? 2 : right.type === 'text' ? 0 : 1
    if (leftPriority !== rightPriority) return rightPriority - leftPriority
    return right.width * right.height - left.width * left.height
  })[0] ?? null
}

export function getValidatedDesignDiffChanges(target: DesignDiffTarget, suggestedChanges: DesignDiffChange[]): DesignDiffChange[] {
  const available = new Set(getAvailableDesignDiffProperties(target))
  const used = new Set<DesignDiffProperty>()
  const changes: DesignDiffChange[] = []

  for (const change of suggestedChanges) {
    if (!available.has(change.property) || used.has(change.property)) continue
    let value: DesignDiffValue | null = null

    if (change.property === 'fill' && isHexColor(change.value)) value = change.value.toUpperCase()
    else if (change.property === 'outline') {
      const state = parseOutlineDesignDiffState(change.value)
      if (state) value = serializeOutlineDesignDiffState(state)
    } else if (change.property === 'border') {
      const state = parseBorderDesignDiffState(change.value)
      if (state) value = serializeBorderDesignDiffState(state)
    } else if (change.property === 'shadow') {
      const state = parseShadowDesignDiffState(change.value)
      if (state) value = serializeShadowDesignDiffState(state)
    } else if (change.property === 'innerShadow') {
      const state = parseInnerShadowDesignDiffState(change.value)
      if (state) value = serializeInnerShadowDesignDiffState(state)
    } else if (change.property === 'layout') {
      const state = parseLayoutDesignDiffState(change.value)
      if (state) value = serializeLayoutDesignDiffState(state)
    } else if (change.property === 'radius' && 'type' in target && target.type === 'rectangle' && isFiniteNumber(change.value)) {
      value = clamp(change.value, 0, Math.min(target.width, target.height) / 2)
    } else if ((change.property === 'smoothing' || change.property === 'opacity' || change.property === 'fillOpacity') && isFiniteNumber(change.value)) {
      value = clamp(change.value, 0, 1)
    } else if ((change.property === 'width' || change.property === 'height') && isFiniteNumber(change.value)) {
      value = clamp(change.value, 1, MAX_DESIGN_DIFF_DIMENSION)
    } else if (change.property === 'rotation' && isFiniteNumber(change.value)) {
      value = change.value
    } else if (change.property === 'text' && typeof change.value === 'string') {
      value = change.value
    } else if (change.property === 'fontSize' && isFiniteNumber(change.value)) {
      value = clamp(change.value, 1, MAX_DESIGN_DIFF_FONT_SIZE)
    } else if (change.property === 'fontWeight' && [400, 500, 600, 700].includes(change.value as number)) {
      value = change.value
    } else if (change.property === 'textAlign' && ['left', 'center', 'right'].includes(change.value as string)) {
      value = change.value
    }

    if (value === null || value === getDesignDiffValue(target, change.property)) continue
    used.add(change.property)
    changes.push({ property: change.property, value })
  }

  return changes
}

export function serializeDesignDiffTarget(target: DesignDiffTarget): DesignDiffRequestTarget {
  const availableProperties = getAvailableDesignDiffProperties(target)
  return {
    kind: 'type' in target ? 'shape' : 'group',
    id: target.id,
    ...('type' in target ? { type: target.type } : {}),
    name: target.name,
    availableProperties,
    properties: Object.fromEntries(availableProperties.flatMap((property) => {
      const value = getDesignDiffValue(target, property)
      return value === null ? [] : [[property, value]]
    })),
  }
}

export const designDiffLabels: Record<DesignDiffProperty, string> = {
  radius: 'Radius',
  smoothing: 'Smoothing',
  opacity: 'Blending',
  fill: 'Fill',
  fillOpacity: 'Fill opacity',
  shadow: 'Shadow',
  outline: 'Outline',
  border: 'Border',
  innerShadow: 'Inner shadow',
  layout: 'Layout',
  width: 'Width',
  height: 'Height',
  rotation: 'Rotation',
  text: 'Content',
  fontSize: 'Font size',
  fontWeight: 'Font weight',
  textAlign: 'Text alignment',
}
