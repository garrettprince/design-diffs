import type { ReactNode } from 'react'
import { inspectorField } from '../../styles/editor-classes'
import { CommitInput } from './CommitInput'

type NumberInputProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
}

export function NumberInput({ label, value, onChange, min, max, step = 1, suffix, disabled = false }: NumberInputProps) {
  return (
    <label className={inspectorField}>
      <span className="shrink-0">{label}</span>
      <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/80 outline-0" aria-label={label} type="number" value={Number(value.toFixed(2))} min={min} max={max} step={step} disabled={disabled} onCommit={(draft) => {
        const parsed = Number(draft)
        if (!Number.isFinite(parsed)) return false
        onChange(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, parsed)))
      }} />
      {suffix && <em className="font-normal text-black/60 not-italic">{suffix}</em>}
    </label>
  )
}

type FillInputProps = {
  color: string
  opacity: number
  mixed?: boolean
  disabled?: boolean
  labelPrefix?: string
  onColorChange: (value: string) => void
  onOpacityChange: (value: number) => void
}

export function FillInput({ color, opacity, mixed = false, disabled = false, labelPrefix = 'Fill', onColorChange, onOpacityChange }: FillInputProps) {
  const safeColor = typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color) ? color : '#000000'
  const safeOpacity = Number.isFinite(opacity) ? opacity : 1
  return (
    <div className={inspectorField}>
      <label className="relative grid size-3.5 shrink-0 place-items-center overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_#0002]" aria-label={`${labelPrefix} color`}>
        <input className="absolute size-px opacity-0" type="color" value={safeColor} disabled={disabled} onChange={(event) => onColorChange(event.target.value)} />
        <span className="size-full" style={{ background: mixed ? `linear-gradient(135deg, ${safeColor} 0 50%, #DDDDDD 50% 100%)` : safeColor }} />
      </label>
      <CommitInput
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-black/80 outline-0"
        aria-label={`${labelPrefix} hex value`}
        value={mixed ? 'Mixed' : safeColor.replace('#', '').toUpperCase()}
        disabled={disabled}
        onFocus={(event) => event.currentTarget.select()}
        onCommit={(draft) => {
          const normalized = draft.replace('#', '').toUpperCase()
          if (!/^[0-9A-F]{6}$/.test(normalized)) return false
          onColorChange(`#${normalized}`)
        }}
      />
      <label className="flex w-[45px] shrink-0 items-center text-black/35">
        <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/60 outline-0" aria-label={`${labelPrefix} opacity`} type="number" min="0" max="100" value={Math.round(safeOpacity * 100)} disabled={disabled} onCommit={(draft) => {
          const parsed = Number(draft)
          if (!Number.isFinite(parsed)) return false
          onOpacityChange(Math.min(100, Math.max(0, parsed)) / 100)
        }} />
        <span>%</span>
      </label>
    </div>
  )
}

type GradientFillInputProps = {
  start: string
  end: string
  angle: number
  opacity: number
  disabled?: boolean
  labelPrefix?: string
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onAngleChange: (value: number) => void
  onOpacityChange: (value: number) => void
}

const normalizeHex = (draft: string) => {
  const normalized = draft.replace('#', '').toUpperCase()
  return /^[0-9A-F]{6}$/.test(normalized) ? `#${normalized}` : null
}

export function GradientFillInput({ start, end, angle, opacity, disabled = false, labelPrefix = 'Fill', onStartChange, onEndChange, onAngleChange, onOpacityChange }: GradientFillInputProps) {
  const colorStop = (color: string, label: string, onChange: (value: string) => void) => (
    <div className={inspectorField}>
      <label className="relative grid size-3.5 shrink-0 place-items-center overflow-hidden rounded-[2px] shadow-[inset_0_0_0_1px_#0002]" aria-label={`${labelPrefix} ${label} color`}>
        <input className="absolute size-px opacity-0" type="color" value={color} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
        <span className="size-full" style={{ backgroundColor: color }} />
      </label>
      <CommitInput className="min-w-0 flex-1 border-0 bg-transparent p-0 text-black/80 outline-0" aria-label={`${labelPrefix} ${label} hex value`} value={color.replace('#', '').toUpperCase()} disabled={disabled} onFocus={(event) => event.currentTarget.select()} onCommit={(draft) => {
        const normalized = normalizeHex(draft)
        if (!normalized) return false
        onChange(normalized)
      }} />
    </div>
  )

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {colorStop(start, 'start', onStartChange)}
        {colorStop(end, 'end', onEndChange)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className={inspectorField}><span>Angle</span><CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/60 outline-0" aria-label={`${labelPrefix} gradient angle`} type="number" value={Math.round(angle)} disabled={disabled} onCommit={(draft) => {
          const parsed = Number(draft)
          if (!Number.isFinite(parsed)) return false
          onAngleChange(((parsed % 360) + 360) % 360)
        }} /><span>°</span></label>
        <label className={inspectorField}><span>Opacity</span><CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/60 outline-0" aria-label={`${labelPrefix} gradient opacity`} type="number" min="0" max="100" value={Math.round(opacity * 100)} disabled={disabled} onCommit={(draft) => {
          const parsed = Number(draft)
          if (!Number.isFinite(parsed)) return false
          onOpacityChange(Math.min(100, Math.max(0, parsed)) / 100)
        }} /><span>%</span></label>
      </div>
    </div>
  )
}

type SelectInputProps<T extends string | number> = {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
  renderOption?: (value: T) => ReactNode
}

export function SelectInput<T extends string | number>({ label, value, options, onChange, renderOption }: SelectInputProps<T>) {
  return (
    <label className={inspectorField}>
      <span className="shrink-0">{label}</span>
      <select className="min-w-0 w-full border-0 bg-transparent text-black/80 outline-0" aria-label={label} value={value} onChange={(event) => {
        const option = options.find((item) => String(item) === event.target.value)
        if (option !== undefined) onChange(option)
      }}>
        {options.map((option) => <option value={option} key={option}>{renderOption ? renderOption(option) : option}</option>)}
      </select>
    </label>
  )
}
