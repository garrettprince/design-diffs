import type { FontWeight, TextAlignment } from '../model/types'

export const MIN_CANVAS_ZOOM = 0.2
export const MAX_CANVAS_ZOOM = 16
export const fontWeights = [400, 500, 600, 700] as const satisfies readonly FontWeight[]
export const textAlignments = ['left', 'center', 'right'] as const satisfies readonly TextAlignment[]
