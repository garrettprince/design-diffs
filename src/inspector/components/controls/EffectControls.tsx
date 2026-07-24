import { Eye, EyeOff, Grid3X3, Minus, Square } from 'lucide-react'
import { cn, iconAction, raisedControl } from '../../../styles/editor-classes'
import { CommitInput } from '../../../ui/components/CommitInput'
import { FillInput } from '../../../ui/components/PropertyInput'

export type EffectValue = {
  present: boolean
  visible: boolean
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
}

type NumericEffectField = 'x' | 'y' | 'blur' | 'spread'

type EffectControlsProps = {
  value: EffectValue
  onChange?: (patch: Partial<EffectValue>) => void
  labelPrefix: string
  removable?: boolean
}

export function EffectControls({ value, onChange, labelPrefix, removable = true }: EffectControlsProps) {
  const editable = Boolean(onChange)
  const numberField = (label: string, field: NumericEffectField, icon?: 'blur' | 'spread') => (
    <label className="flex min-w-0 items-center gap-1 px-1.5 text-black/35">
      {icon === 'blur' ? <Grid3X3 aria-hidden="true" size={12} strokeWidth={1.2} /> : icon === 'spread' ? <Square aria-hidden="true" size={11} strokeWidth={1.2} /> : <span>{label}</span>}
      <CommitInput
        className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/80 outline-0"
        aria-label={`${labelPrefix} ${label.toLowerCase()}`}
        type="number"
        value={value[field]}
        min={field === 'blur' ? 0 : undefined}
        disabled={!editable}
        onCommit={(draft) => {
          const parsed = Number(draft)
          if (!Number.isFinite(parsed)) return false
          onChange?.({ [field]: field === 'blur' ? Math.max(0, parsed) : parsed })
        }}
      />
    </label>
  )

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className={cn('grid h-6 min-w-0 flex-1 grid-cols-4 divide-x divide-[#e2e2e2] overflow-hidden', raisedControl)}>
          {numberField('X', 'x')}
          {numberField('Y', 'y')}
          {numberField('Blur', 'blur', 'blur')}
          {numberField('Spread', 'spread', 'spread')}
        </div>
        <div className="flex items-center">
          <button type="button" className={iconAction} aria-label={`${value.visible ? 'Hide' : 'Show'} ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ visible: !value.visible })}>{value.visible ? <Eye aria-hidden="true" size={15} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={15} strokeWidth={1.35} />}</button>
          {removable && <button type="button" className={iconAction} aria-label={`Remove ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ present: false })}><Minus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}
        </div>
      </div>
      <FillInput
        color={value.color}
        opacity={value.opacity}
        disabled={!editable}
        labelPrefix={labelPrefix}
        onColorChange={(color) => onChange?.({ color })}
        onOpacityChange={(opacity) => onChange?.({ opacity })}
      />
    </div>
  )
}
