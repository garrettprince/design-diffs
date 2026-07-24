import { Eye, EyeOff, Minus } from 'lucide-react'
import type { FillPaint } from '../../../editor/model/color'
import type { FillPatch, FillType } from '../../../editor/model/types'
import { cn, iconAction, raisedControl, subtlePress } from '../../../styles/editor-classes'
import { FillInput, GradientFillInput } from '../../../ui/components/PropertyInput'

type FillControlsProps = {
  value: FillPaint
  onChange?: (patch: FillPatch) => void
  labelPrefix?: string
  removable?: boolean
}

export function FillControls({ value, onChange, labelPrefix = 'Fill', removable = true }: FillControlsProps) {
  const editable = Boolean(onChange)
  const setFillType = (fillType: FillType) => onChange?.({ fillType, fillPresent: true, fillVisible: true })
  const typeButton = (fillType: FillType) => cn(
    'm-px rounded-[5px] border-0 px-1.5 text-black/60 disabled:cursor-default',
    value.fillType === fillType && cn('text-black/80', raisedControl, subtlePress),
  )

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-6 min-w-0 flex-1 grid-cols-3 overflow-hidden rounded-md bg-black/[0.05]" aria-label={`${labelPrefix} type`}>
          <button type="button" className={typeButton('solid')} aria-pressed={value.fillType === 'solid'} disabled={!editable} onClick={() => setFillType('solid')}>Solid</button>
          <button type="button" className={typeButton('gradient')} aria-pressed={value.fillType === 'gradient'} disabled={!editable} onClick={() => setFillType('gradient')}>Gradient</button>
          <button type="button" className="m-px cursor-default rounded-[5px] border-0 bg-transparent px-1.5 text-black/60 opacity-55" disabled>Image</button>
        </div>
        <div className="flex items-center">
          <button type="button" className={iconAction} aria-label={`${value.fillVisible ? 'Hide' : 'Show'} ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ fillVisible: !value.fillVisible })}>{value.fillVisible ? <Eye aria-hidden="true" size={15} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={15} strokeWidth={1.35} />}</button>
          {removable && <button type="button" className={iconAction} aria-label={`Remove ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ fillPresent: false })}><Minus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}
        </div>
      </div>
      {value.fillType === 'gradient' ? (
        <GradientFillInput
          start={value.fillGradientStart}
          end={value.fillGradientEnd}
          angle={value.fillGradientAngle}
          opacity={value.fillOpacity}
          disabled={!editable}
          labelPrefix={labelPrefix}
          onStartChange={(fillGradientStart) => onChange?.({ fillGradientStart })}
          onEndChange={(fillGradientEnd) => onChange?.({ fillGradientEnd })}
          onAngleChange={(fillGradientAngle) => onChange?.({ fillGradientAngle })}
          onOpacityChange={(fillOpacity) => onChange?.({ fillOpacity })}
        />
      ) : (
        <FillInput
          color={value.fill}
          opacity={value.fillOpacity}
          disabled={!editable}
          labelPrefix={labelPrefix}
          onColorChange={(fill) => onChange?.({ fill })}
          onOpacityChange={(fillOpacity) => onChange?.({ fillOpacity })}
        />
      )}
    </div>
  )
}
