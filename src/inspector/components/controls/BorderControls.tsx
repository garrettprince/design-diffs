import { AlignJustify, ChevronDown, Eye, EyeOff, Minus, Square } from 'lucide-react'
import type { BorderPatch, EditorGroup, EditorShape } from '../../../editor/model/types'
import { cn, iconAction, raisedControl } from '../../../styles/editor-classes'
import { CommitInput } from '../../../ui/components/CommitInput'
import { FillInput } from '../../../ui/components/PropertyInput'

type BorderValue = Pick<EditorShape | EditorGroup, 'borderPresent' | 'borderVisible' | 'borderWidth' | 'borderSides' | 'borderColor' | 'borderOpacity'>

export function BorderControls({ value, onChange, labelPrefix = 'Border', removable = true }: { value: BorderValue; onChange?: (patch: BorderPatch) => void; labelPrefix?: string; removable?: boolean }) {
  const editable = Boolean(onChange)
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <label className={cn('flex h-6 min-w-0 items-center gap-1.5 px-2 text-black/35', raisedControl)}>
            <AlignJustify aria-hidden="true" size={14} strokeWidth={1.3} />
            <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-black/80 outline-0" aria-label={`${labelPrefix} width`} type="number" min="0" value={value.borderWidth} disabled={!editable} onCommit={(draft) => {
              const parsed = Number(draft)
              if (!Number.isFinite(parsed)) return false
              onChange?.({ borderWidth: Math.max(0, parsed) })
            }} />
          </label>
          <label className={cn('flex h-6 min-w-0 items-center gap-1.5 px-2 text-black/35', raisedControl)}>
            <Square aria-hidden="true" size={13} strokeWidth={1.5} />
            <select className="min-w-0 flex-1 appearance-none border-0 bg-transparent text-black/80 outline-0" aria-label={`${labelPrefix} sides`} value={value.borderSides} disabled={!editable} onChange={() => onChange?.({ borderSides: 'all' })}><option value="all">All</option></select>
            <ChevronDown aria-hidden="true" size={13} strokeWidth={1.35} />
          </label>
        </div>
        <div className="flex items-center">
          <button type="button" className={iconAction} aria-label={`${value.borderVisible ? 'Hide' : 'Show'} ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ borderVisible: !value.borderVisible })}>{value.borderVisible ? <Eye aria-hidden="true" size={15} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={15} strokeWidth={1.35} />}</button>
          {removable && <button type="button" className={iconAction} aria-label={`Remove ${labelPrefix.toLowerCase()}`} disabled={!editable} onClick={() => onChange?.({ borderPresent: false })}><Minus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}
        </div>
      </div>
      <FillInput color={value.borderColor} opacity={value.borderOpacity} disabled={!editable} labelPrefix={labelPrefix} onColorChange={(borderColor) => onChange?.({ borderColor })} onOpacityChange={(borderOpacity) => onChange?.({ borderOpacity })} />
    </div>
  )
}
