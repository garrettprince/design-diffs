import { AlignJustify, Eye, EyeOff, Minus, Square } from 'lucide-react'
import type { EditorGroup, EditorShape, OutlinePatch } from '../../../editor/model/types'
import { cn, iconAction, raisedControl } from '../../../styles/editor-classes'
import { CommitInput } from '../../../ui/components/CommitInput'
import { FillInput } from '../../../ui/components/PropertyInput'

type OutlineValue = Pick<EditorShape | EditorGroup, 'outlinePresent' | 'outlineVisible' | 'outlineWidth' | 'outlineOffset' | 'outlineColor' | 'outlineOpacity'>

export function OutlineControls({ value, onChange, labelPrefix = 'Outline', removable = true }: { value: OutlineValue; onChange?: (patch: OutlinePatch) => void; labelPrefix?: string; removable?: boolean }) {
  const editable = Boolean(onChange)
  const numberField = (label: string, current: number, field: 'outlineWidth' | 'outlineOffset', icon: 'width' | 'offset') => (
    <label className="flex h-full min-w-0 items-center gap-1.5 px-2 text-black/35">
      {icon === 'width' ? <AlignJustify aria-hidden="true" size={14} strokeWidth={1.3} /> : <Square aria-hidden="true" size={13} strokeWidth={1.3} />}
      <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-black/80 outline-0" aria-label={`${labelPrefix} ${label.toLowerCase()}`} type="number" min={field === 'outlineWidth' ? 0 : undefined} value={current} disabled={!editable} onCommit={(draft) => {
        const parsed = Number(draft)
        if (!Number.isFinite(parsed)) return false
        onChange?.({ [field]: field === 'outlineWidth' ? Math.max(0, parsed) : parsed })
      }} />
    </label>
  )

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <div className={cn('h-6', raisedControl)}>{numberField('Width', value.outlineWidth, 'outlineWidth', 'width')}</div>
          <div className={cn('h-6', raisedControl)}>{numberField('Offset', value.outlineOffset, 'outlineOffset', 'offset')}</div>
        </div>
        <div className="flex items-center">
          <button type="button" className={iconAction} aria-label={`${value.outlineVisible ? 'Hide' : 'Show'} ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ outlineVisible: !value.outlineVisible })}>{value.outlineVisible ? <Eye aria-hidden="true" size={15} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={15} strokeWidth={1.35} />}</button>
          {removable && <button type="button" className={iconAction} aria-label={`Remove ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ outlinePresent: false })}><Minus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}
        </div>
      </div>
      <FillInput color={value.outlineColor} opacity={value.outlineOpacity} disabled={!editable} labelPrefix={labelPrefix} onColorChange={(outlineColor) => onChange?.({ outlineColor })} onOpacityChange={(outlineOpacity) => onChange?.({ outlineOpacity })} />
    </div>
  )
}
