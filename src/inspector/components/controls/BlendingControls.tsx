import { Blend, ChevronDown, Eye, EyeOff } from 'lucide-react'
import type { GroupPatch, ShapePatch } from '../../../editor/model/types'
import { iconAction, inspectorField, propertySection } from '../../../styles/editor-classes'
import { CommitInput } from '../../../ui/components/CommitInput'

type BlendingControlsProps = {
  opacity: number
  visible: boolean
  onChange: (patch: ShapePatch & GroupPatch) => void
}

export function BlendingControls({ opacity, visible, onChange }: BlendingControlsProps) {
  return (
    <section className={propertySection}>
      <div className="mb-[9px] flex h-5 items-center justify-between"><h2 className="text-[12px] leading-[18px] font-medium text-black/80">Blending</h2><button type="button" className={iconAction} aria-label={`${visible ? 'Hide' : 'Show'} object`} onClick={() => onChange({ visible: !visible })}>{visible ? <Eye aria-hidden="true" size={15} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={15} strokeWidth={1.35} />}</button></div>
      <div className="grid grid-cols-2 gap-2">
        <label className={inspectorField}><span className="size-[13px] shrink-0 bg-[conic-gradient(#aaa_25%,#e3e3e3_0_50%,#aaa_0_75%,#e3e3e3_0)] bg-[length:6px_6px] opacity-65" aria-hidden="true" /><CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/80 outline-0" aria-label="Opacity" type="number" min="0" max="100" value={Math.round(opacity * 100)} onCommit={(draft) => {
          const parsed = Number(draft)
          if (!Number.isFinite(parsed)) return false
          onChange({ opacity: Math.min(100, Math.max(0, parsed)) / 100 })
        }} /><span>%</span></label>
        <label className={inspectorField}><Blend aria-hidden="true" size={13} strokeWidth={1.35} /><select className="min-w-0 w-full appearance-none border-0 bg-transparent text-black/80 opacity-100 outline-0" aria-label="Blend mode" value="Normal" disabled><option>Normal</option></select><ChevronDown aria-hidden="true" size={13} strokeWidth={1.35} /></label>
      </div>
    </section>
  )
}
