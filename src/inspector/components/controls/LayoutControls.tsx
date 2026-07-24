import { FlipHorizontal2, FlipVertical2, RotateCw } from 'lucide-react'
import type { EditorGroup, EditorShape, LayoutPatch } from '../../../editor/model/types'
import { cn, raisedControl } from '../../../styles/editor-classes'
import { NumberInput } from '../../../ui/components/PropertyInput'

type LayoutValue = Pick<EditorShape | EditorGroup, 'x' | 'y' | 'width' | 'height' | 'rotation'>

type LayoutControlsProps = {
  value: LayoutValue
  onChange?: (patch: LayoutPatch) => void
  labelPrefix?: string
  dimensionsOnly?: boolean
}

export function LayoutControls({ value, onChange, labelPrefix = 'Layout', dimensionsOnly = false }: LayoutControlsProps) {
  const editable = Boolean(onChange)
  return (
    <div>
      {!dimensionsOnly && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          <NumberInput label="X" value={value.x} disabled={!editable} onChange={(x) => onChange?.({ x })} />
          <NumberInput label="Y" value={value.y} disabled={!editable} onChange={(y) => onChange?.({ y })} />
          <NumberInput label="Rotation" value={value.rotation} suffix="°" disabled={!editable} onChange={(rotation) => onChange?.({ rotation })} />
        </div>
      )}
      <div className={dimensionsOnly ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px] gap-2'}>
        <NumberInput label="W" value={value.width} min={1} disabled={!editable} onChange={(width) => onChange?.({ width })} />
        <NumberInput label="H" value={value.height} min={1} disabled={!editable} onChange={(height) => onChange?.({ height })} />
        {!dimensionsOnly && (
          <div className={cn('grid h-6 grid-cols-3 overflow-hidden', raisedControl)} aria-label={`${labelPrefix} transform actions`}>
            <button type="button" className="grid place-items-center border-0 border-r border-[#e2e2e2] bg-transparent p-0 text-black/60 active:bg-black/[0.035] disabled:cursor-default" aria-label={`${labelPrefix} rotate 90 degrees`} disabled={!editable} onClick={() => onChange?.({ rotation: value.rotation + 90 })}><RotateCw aria-hidden="true" size={14} strokeWidth={1.35} /></button>
            <button type="button" className="grid cursor-default place-items-center border-0 border-r border-[#e2e2e2] bg-transparent p-0 text-black/60 opacity-60" aria-label={`${labelPrefix} flip horizontally`} disabled><FlipHorizontal2 aria-hidden="true" size={14} strokeWidth={1.35} /></button>
            <button type="button" className="grid cursor-default place-items-center border-0 bg-transparent p-0 text-black/60 opacity-60" aria-label={`${labelPrefix} flip vertically`} disabled><FlipVertical2 aria-hidden="true" size={14} strokeWidth={1.35} /></button>
          </div>
        )}
      </div>
    </div>
  )
}
