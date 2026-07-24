import type { EditorShape } from './types'

export type CornerRadiusKey = 'radiusTopLeft' | 'radiusTopRight' | 'radiusBottomRight' | 'radiusBottomLeft'
export type CornerRadii = [number, number, number, number]

export const cornerRadiusKeys: CornerRadiusKey[] = [
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft',
]

export const getCornerRadiusMaximum = (shape: Pick<EditorShape, 'width' | 'height'>) => Math.max(0, Math.min(shape.width, shape.height) / 2)

export const clampCornerRadius = (value: number, maximum: number) => Math.min(maximum, Math.max(0, value))

export const getCornerRadii = (shape: EditorShape): CornerRadii => {
  const maximum = getCornerRadiusMaximum(shape)
  if (!shape.independentCorners) {
    const radius = clampCornerRadius(shape.radius, maximum)
    return [radius, radius, radius, radius]
  }
  return cornerRadiusKeys.map((key) => clampCornerRadius(shape[key] ?? shape.radius, maximum)) as CornerRadii
}
