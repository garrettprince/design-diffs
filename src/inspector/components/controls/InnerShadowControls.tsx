import type { EditorGroup, EditorShape, InnerShadowPatch } from '../../../editor/model/types'
import { EffectControls, type EffectValue } from './EffectControls'

type InnerShadowValue = Pick<EditorShape | EditorGroup, 'innerShadowPresent' | 'innerShadowVisible' | 'innerShadowX' | 'innerShadowY' | 'innerShadowBlur' | 'innerShadowSpread' | 'innerShadowColor' | 'innerShadowOpacity'>

type InnerShadowControlsProps = {
  value: InnerShadowValue
  onChange?: (patch: InnerShadowPatch) => void
  labelPrefix?: string
  removable?: boolean
}

export function InnerShadowControls({ value, onChange, labelPrefix = 'Inner shadow', removable = true }: InnerShadowControlsProps) {
  const effect: EffectValue = {
    present: value.innerShadowPresent,
    visible: value.innerShadowVisible,
    x: value.innerShadowX,
    y: value.innerShadowY,
    blur: value.innerShadowBlur,
    spread: value.innerShadowSpread,
    color: value.innerShadowColor,
    opacity: value.innerShadowOpacity,
  }

  return <EffectControls value={effect} labelPrefix={labelPrefix} removable={removable} onChange={onChange ? (patch) => onChange({
    ...(patch.present !== undefined ? { innerShadowPresent: patch.present } : {}),
    ...(patch.visible !== undefined ? { innerShadowVisible: patch.visible } : {}),
    ...(patch.x !== undefined ? { innerShadowX: patch.x } : {}),
    ...(patch.y !== undefined ? { innerShadowY: patch.y } : {}),
    ...(patch.blur !== undefined ? { innerShadowBlur: patch.blur } : {}),
    ...(patch.spread !== undefined ? { innerShadowSpread: patch.spread } : {}),
    ...(patch.color !== undefined ? { innerShadowColor: patch.color } : {}),
    ...(patch.opacity !== undefined ? { innerShadowOpacity: patch.opacity } : {}),
  }) : undefined} />
}
