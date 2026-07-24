import type { EditorGroup, EditorShape, ShadowPatch } from '../../../editor/model/types'
import { EffectControls, type EffectValue } from './EffectControls'

type ShadowValue = Pick<EditorShape | EditorGroup, 'shadowPresent' | 'shadowVisible' | 'shadowX' | 'shadowY' | 'shadowBlur' | 'shadowSpread' | 'shadowColor' | 'shadowOpacity'>

type ShadowControlsProps = {
  value: ShadowValue
  onChange?: (patch: ShadowPatch) => void
  labelPrefix?: string
  removable?: boolean
}

export function ShadowControls({ value, onChange, labelPrefix = 'Shadow', removable = true }: ShadowControlsProps) {
  const effect: EffectValue = {
    present: value.shadowPresent,
    visible: value.shadowVisible,
    x: value.shadowX,
    y: value.shadowY,
    blur: value.shadowBlur,
    spread: value.shadowSpread,
    color: value.shadowColor,
    opacity: value.shadowOpacity,
  }

  return <EffectControls value={effect} labelPrefix={labelPrefix} removable={removable} onChange={onChange ? (patch) => onChange({
    ...(patch.present !== undefined ? { shadowPresent: patch.present } : {}),
    ...(patch.visible !== undefined ? { shadowVisible: patch.visible } : {}),
    ...(patch.x !== undefined ? { shadowX: patch.x } : {}),
    ...(patch.y !== undefined ? { shadowY: patch.y } : {}),
    ...(patch.blur !== undefined ? { shadowBlur: patch.blur } : {}),
    ...(patch.spread !== undefined ? { shadowSpread: patch.spread } : {}),
    ...(patch.color !== undefined ? { shadowColor: patch.color } : {}),
    ...(patch.opacity !== undefined ? { shadowOpacity: patch.opacity } : {}),
  }) : undefined} />
}
