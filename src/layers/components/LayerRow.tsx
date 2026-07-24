import { editorStore } from '../../editor/model/editor-store'
import type { EditorShape, LayerReference } from '../../editor/model/types'
import { EditorIcon } from '../../ui/components/EditorIcon'
import { LayerRowShell } from './LayerRowShell'

type LayerRowProps = {
  shape: EditorShape
  selected: boolean
  nested?: boolean
}

export function LayerRow({ shape, selected, nested = false }: LayerRowProps) {
  const layer: LayerReference = { kind: 'shape', id: shape.id, groupId: shape.groupId }
  return (
    <LayerRowShell
      layer={layer}
      name={shape.name}
      selected={selected}
      locked={shape.locked}
      visible={shape.visible}
      icon={<EditorIcon name={shape.type} size={14} />}
      indentation={nested ? 'pl-[38px]' : 'pl-[19px]'}
      onSelect={(event) => nested ? editorStore.document.selectNestedShape(shape.id, event.shiftKey) : editorStore.document.select(shape.id, event.shiftKey)}
      onRename={(name) => editorStore.document.renameShape(shape.id, name)}
      onLockedChange={(locked) => editorStore.document.setShapeLocked(shape.id, locked)}
      onVisibilityChange={(visible) => editorStore.document.setShapeVisibility(shape.id, visible)}
    />
  )
}
