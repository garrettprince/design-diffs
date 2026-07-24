import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { useEffect, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import type { LayerPlacement, LayerReference } from '../../editor/model/types'
import { cn, iconAction } from '../../styles/editor-classes'
import { beginLayerDrag, canReorderLayer, endLayerDrag, getDraggedLayer, getLayerPlacement } from '../model/layer-drag'

type LayerRowShellProps = {
  layer: LayerReference
  name: string
  selected: boolean
  locked: boolean
  visible: boolean
  icon: ReactNode
  leadingAction?: ReactNode
  indentation: string
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void
  onRename: (name: string) => void
  onLockedChange: (locked: boolean) => void
  onVisibilityChange: (visible: boolean) => void
}

const layerAction = 'pointer-events-none opacity-0 transition-opacity duration-100 group-hover/layer-row:pointer-events-auto group-hover/layer-row:opacity-100 group-focus-within/layer-row:pointer-events-auto group-focus-within/layer-row:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100'

export function LayerRowShell({
  layer,
  name,
  selected,
  locked,
  visible,
  icon,
  leadingAction,
  indentation,
  onSelect,
  onRename,
  onLockedChange,
  onVisibilityChange,
}: LayerRowShellProps) {
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(name)
  const [dropPlacement, setDropPlacement] = useState<LayerPlacement | null>(null)

  useEffect(() => {
    if (!renaming) setDraftName(name)
  }, [name, renaming])

  const commitName = () => {
    const nextName = draftName.trim()
    if (nextName) onRename(nextName)
    setDraftName(nextName || name)
    setRenaming(false)
  }

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      commitName()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftName(name)
      setRenaming(false)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canReorderLayer(getDraggedLayer(event), layer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropPlacement(getLayerPlacement(event))
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const draggedLayer = getDraggedLayer(event)
    if (!draggedLayer || !canReorderLayer(draggedLayer, layer)) return
    event.preventDefault()
    editorStore.document.reorderLayer(draggedLayer, layer, getLayerPlacement(event))
    setDropPlacement(null)
    endLayerDrag()
  }

  return (
    <div
      className={cn(
        'group/layer-row flex h-7 w-full cursor-grab items-center pr-1.5 text-black/60 active:cursor-grabbing active:bg-black/[0.075]',
        indentation,
        selected && 'bg-black/[0.07] text-black/80',
        dropPlacement === 'above' && 'shadow-[inset_0_1px_0_#1677ff]',
        dropPlacement === 'below' && 'shadow-[inset_0_-1px_0_#1677ff]',
      )}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropPlacement(null)
      }}
      onDrop={handleDrop}
      onDragEnd={() => {
        setDropPlacement(null)
        endLayerDrag()
      }}
    >
      {leadingAction}
      <button type="button" className="flex h-7 min-w-0 flex-1 cursor-grab items-center gap-[7px] border-0 bg-transparent p-0 text-left text-inherit active:cursor-grabbing" draggable={!renaming} aria-label={`Select ${name}`} aria-pressed={selected} onDragStart={(event) => beginLayerDrag(event, layer)} onClick={onSelect} onDoubleClick={() => setRenaming(true)}>
        {icon}
        {renaming ? (
          <input className="h-[22px] w-full rounded-[3px] border border-[#b8b8b8] bg-white px-1 py-px text-black/80 outline-none" autoFocus aria-label="Layer name" value={draftName} onChange={(event) => setDraftName(event.target.value)} onBlur={() => { setDraftName(name); setRenaming(false) }} onKeyDown={handleNameKeyDown} onClick={(event) => event.stopPropagation()} />
        ) : <span className="overflow-hidden text-ellipsis whitespace-nowrap">{name}</span>}
      </button>
      <button type="button" className={cn(iconAction, layerAction, 'text-black/35')} aria-label={`${locked ? 'Unlock' : 'Lock'} ${name}`} aria-pressed={locked} onClick={() => onLockedChange(!locked)}>
        {locked ? <Lock aria-hidden="true" size={13} strokeWidth={1.35} /> : <LockOpen aria-hidden="true" size={13} strokeWidth={1.35} />}
      </button>
      <button type="button" className={cn(iconAction, layerAction, 'text-black/35')} aria-label={`${visible ? 'Hide' : 'Show'} ${name}`} onClick={() => onVisibilityChange(!visible)}>
        {visible ? <Eye aria-hidden="true" size={13} strokeWidth={1.35} /> : <EyeOff aria-hidden="true" size={13} strokeWidth={1.35} />}
      </button>
    </div>
  )
}
