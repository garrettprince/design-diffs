import { observer } from 'mobx-react-lite'
import { Ellipse, Layer, Rect, Text } from 'react-konva'
import type { ShapeDraft } from '../../editor/model/types'
import { editorStore } from '../../editor/model/editor-store'
import { CanvasGroup } from './CanvasGroup'
import { CanvasShape } from './CanvasShape'

type SelectionDraft = {
  x: number
  y: number
  width: number
  height: number
  additive: boolean
}

type CanvasSceneProps = {
  draft: ShapeDraft | null
  editingTextId: string | null
  selectionDraft: SelectionDraft | null
  setEditingTextId: (id: string | null) => void
  zoom: number
}

export const CanvasScene = observer(function CanvasScene({ draft, editingTextId, selectionDraft, setEditingTextId, zoom }: CanvasSceneProps) {
  return (
    <Layer>
      {editorStore.document.canvasItems.map((item) => item.kind === 'shape'
        ? item.shape.visible && <CanvasShape key={item.shape.id} shape={item.shape} selected={editorStore.document.isShapeSelected(item.shape.id) && editingTextId !== item.shape.id} changing={editorStore.designDiff.isTarget('shape', item.shape.id)} aiLoading={editorStore.designDiff.status === 'loading' && editorStore.designDiff.isTarget('shape', item.shape.id)} zoom={zoom} onEditText={setEditingTextId} />
        : item.group.visible && <CanvasGroup key={item.group.id} group={item.group} shapes={item.shapes} selected={editorStore.document.selectedGroupId === item.group.id} selectedShapeId={editorStore.document.selectedIds.find((id) => item.group.shapeIds.includes(id)) ?? null} changing={editorStore.designDiff.isTarget('group', item.group.id)} aiLoading={editorStore.designDiff.status === 'loading' && editorStore.designDiff.isTarget('group', item.group.id)} zoom={zoom} />)}
      {selectionDraft && <Rect x={selectionDraft.x} y={selectionDraft.y} width={selectionDraft.width} height={selectionDraft.height} fill="rgba(22, 119, 255, 0.08)" stroke="#1677FF" strokeWidth={1} strokeScaleEnabled={false} listening={false} />}
      {draft?.type === 'rectangle' && <Rect x={draft.x} y={draft.y} width={draft.width} height={draft.height} fill="#5D8FF244" stroke="#1677FF" dash={[4, 4]} cornerRadius={0} />}
      {draft?.type === 'ellipse' && <Ellipse x={draft.x + draft.width / 2} y={draft.y + draft.height / 2} radiusX={draft.width / 2} radiusY={draft.height / 2} fill="#9B7FE844" stroke="#1677FF" dash={[4, 4]} />}
      {draft?.type === 'text' && <Text x={draft.x} y={draft.y} width={Math.max(180, draft.width)} height={36} text="Type something" fontFamily="system-ui, sans-serif" fontSize={24} fill="#20202066" />}
    </Layer>
  )
})
