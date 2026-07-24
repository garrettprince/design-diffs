import { Check, Group as GroupIcon, PanelLeft, Redo2, Undo2, Ungroup } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { editorStore } from '../../editor/model/editor-store'
import { cn, iconAction, raisedControl, subtlePress } from '../../styles/editor-classes'
import { ToolRail } from '../../toolbar/components/ToolRail'
import { Disclosure, EditorIcon } from '../../ui/components/EditorIcon'
import { GroupLayerRow } from './GroupLayerRow'
import { LayerRow } from './LayerRow'

export const LeftSidebar = observer(function LeftSidebar() {
  const providerButton = (provider: 'mock' | 'openai') => cn(
    'm-px rounded-[5px] border-0 px-2 text-black/60 disabled:cursor-default',
    editorStore.designDiff.provider === provider && cn('text-black/80', raisedControl, subtlePress),
  )

  return (
    <aside className="absolute inset-y-0 left-0 z-[5] flex w-[284px] max-[680px]:w-[42px]" aria-label="Document navigation">
      <div className="relative flex w-[240px] min-w-0 flex-col bg-[#f2f2f2] max-[680px]:hidden">
        <header className="flex h-[41px] shrink-0 items-center gap-[7px] border-b border-[#e2e2e2] py-2 pr-3 pl-2.5">
          <div className="relative grid size-[22px] shrink-0 place-items-center" aria-hidden="true">
            <span className="absolute size-[9px] -translate-x-0.5 -translate-y-0.5 skew-y-[-14deg] bg-[#7f7f7f] opacity-90" />
            <span className="absolute size-[9px] translate-x-0.5 translate-y-0.5 skew-y-[-14deg] bg-[#7f7f7f] opacity-55" />
            <span className="absolute z-[1] size-[5px] skew-y-[-14deg] bg-[#f2f2f2]" />
          </div>
          <span className="flex-1 overflow-hidden font-[450] text-ellipsis whitespace-nowrap text-black/80">Mindful dragon</span>
          <button type="button" className={iconAction} aria-label="Toggle panels"><PanelLeft aria-hidden="true" size={15} strokeWidth={1.35} /></button>
        </header>

        <section className="h-[68px] shrink-0 pt-[5px]">
          <div className="flex h-7 items-center gap-1 pr-3 pl-1.5 text-black/60"><span className="grid w-2.5 shrink-0 place-items-center text-[#777]"><Disclosure /></span><span>Pages</span><button type="button" className={cn(iconAction, 'ml-auto')} aria-label="Add page"><EditorIcon name="plus" size={14} /></button></div>
          <button type="button" className="flex h-7 w-full items-center gap-2 border-0 bg-transparent pr-[13px] pl-[21px] text-left text-black/80 active:bg-black/[0.025]" aria-pressed="true"><EditorIcon name="pages" size={14} /><span>Page 1</span><Check aria-hidden="true" className="ml-auto" size={13} strokeWidth={1.6} /></button>
        </section>

        <div className="h-2 border-b border-[#e2e2e2]" />

        <section className="flex-1 overflow-y-auto pt-1" aria-label="Layers">
          <div className="flex h-7 items-center gap-[7px] pr-[9px] pl-1.5 text-black/60">
            <span className="grid w-2.5 shrink-0 place-items-center text-[#777]"><Disclosure /></span><EditorIcon name="layers" size={14} /><span>Layers</span>
            {editorStore.document.canGroup && <button type="button" className={cn(iconAction, 'ml-auto')} aria-label="Group selection" onClick={editorStore.document.groupSelection}><GroupIcon aria-hidden="true" size={13} strokeWidth={1.35} /></button>}
            {editorStore.document.selectedGroup && <button type="button" className={cn(iconAction, 'ml-auto')} aria-label="Ungroup selection" onClick={editorStore.document.ungroupSelected}><Ungroup aria-hidden="true" size={13} strokeWidth={1.35} /></button>}
            <small className={cn('text-[10px] text-black/35', !editorStore.document.canGroup && !editorStore.document.selectedGroup && 'ml-auto')}>{editorStore.document.shapes.length}</small>
          </div>
          {[...editorStore.document.canvasItems].reverse().map((item) => item.kind === 'shape'
            ? <LayerRow key={item.shape.id} shape={item.shape} selected={editorStore.document.isShapeSelected(item.shape.id)} />
            : <GroupLayerRow key={item.group.id} group={item.group} shapes={item.shapes} selected={editorStore.document.selectedGroupId === item.group.id} selectedShapeIds={editorStore.document.selectedIds} />)}
        </section>

        <div className="shrink-0 border-t border-[#e2e2e2] px-2 py-2">
          <div className="grid h-6 w-full grid-cols-2 overflow-hidden rounded-md bg-black/[0.05]" aria-label="Design diff provider">
            <button type="button" className={providerButton('mock')} aria-pressed={editorStore.designDiff.provider === 'mock'} disabled={editorStore.designDiff.isWorking} onClick={() => editorStore.designDiff.setProvider('mock')}>Mock Data</button>
            <button type="button" className={providerButton('openai')} aria-pressed={editorStore.designDiff.provider === 'openai'} disabled={editorStore.designDiff.isWorking} onClick={() => editorStore.designDiff.setProvider('openai')}>5.6 Luna</button>
          </div>
        </div>

        <footer className="flex h-8 shrink-0 items-center gap-0 border-t border-[#e2e2e2] px-3 py-1 text-black/60">
          <button type="button" className={iconAction} aria-label="Undo" disabled={!editorStore.document.canUndo} onClick={editorStore.document.undo}><Undo2 aria-hidden="true" size={14} strokeWidth={1.35} /></button>
          <button type="button" className={iconAction} aria-label="Redo" disabled={!editorStore.document.canRedo} onClick={editorStore.document.redo}><Redo2 aria-hidden="true" size={14} strokeWidth={1.35} /></button>
          <span className="ml-auto text-[10px] text-black/35">⌘Z</span>
        </footer>
      </div>
      <ToolRail />
      <div className="mr-[-2px] w-0.5 max-[680px]:hidden" />
    </aside>
  )
})
