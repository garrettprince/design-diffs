import { Plus } from 'lucide-react'
import { cn } from '../../styles/editor-classes'

export function AddPropertyRow({ label, onAdd, bordered = false, ariaPrefix = 'Add' }: { label: string; onAdd?: () => void; bordered?: boolean; ariaPrefix?: string }) {
  return (
    <button type="button" className={cn('flex h-[42px] w-full items-center justify-between border-0 bg-transparent px-3 pt-2.5 pb-3 text-left text-[12px] font-medium text-black/35 transition-colors duration-100 disabled:cursor-default', bordered && 'border-b border-[#e2e2e2]', onAdd && 'hover:text-black')} aria-label={`${ariaPrefix} ${label.toLowerCase()}`} disabled={!onAdd} onClick={onAdd}>
      <span>{label}</span><Plus aria-hidden="true" size={16} strokeWidth={1.35} />
    </button>
  )
}
