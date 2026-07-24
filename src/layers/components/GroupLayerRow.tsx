import { ChevronDown, ChevronRight, Group as GroupIcon } from 'lucide-react'
import { useState } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import type { EditorGroup, EditorShape, LayerReference } from '../../editor/model/types'
import { LayerRow } from './LayerRow'
import { LayerRowShell } from './LayerRowShell'

type GroupLayerRowProps = {
  group: EditorGroup
  shapes: EditorShape[]
  selected: boolean
  selectedShapeIds: string[]
}

export function GroupLayerRow({ group, shapes, selected, selectedShapeIds }: GroupLayerRowProps) {
  const [expanded, setExpanded] = useState(true)
  const layer: LayerReference = { kind: 'group', id: group.id, groupId: null }
  const expandButton = (
    <button type="button" className="grid h-[22px] w-[13px] shrink-0 place-items-center rounded-[3px] border-0 bg-transparent p-0 text-black/35 active:bg-black/[0.035]" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.name}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
      {expanded ? <ChevronDown aria-hidden="true" size={11} strokeWidth={1.5} /> : <ChevronRight aria-hidden="true" size={11} strokeWidth={1.5} />}
    </button>
  )

  return (
    <div>
      <LayerRowShell
        layer={layer}
        name={group.name}
        selected={selected}
        locked={group.locked}
        visible={group.visible}
        icon={<GroupIcon aria-hidden="true" size={14} strokeWidth={1.35} />}
        leadingAction={expandButton}
        indentation="pl-1.5"
        onSelect={() => editorStore.document.selectGroup(group.id)}
        onRename={(name) => editorStore.document.renameGroup(group.id, name)}
        onLockedChange={(locked) => editorStore.document.setGroupLocked(group.id, locked)}
        onVisibilityChange={(visible) => editorStore.document.setGroupVisibility(group.id, visible)}
      />
      {expanded && [...shapes].reverse().map((shape) => <LayerRow key={shape.id} shape={shape} selected={selectedShapeIds.includes(shape.id)} nested />)}
    </div>
  )
}
