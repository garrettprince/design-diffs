import {
  Plus,
  SlidersHorizontal,
} from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { editorStore } from '../../editor/model/editor-store'
import type { GroupPatch, ShapePatch } from '../../editor/model/types'
import { cn, iconAction, iconSlot, propertySection, raisedControl, subtlePress } from '../../styles/editor-classes'
import { BlendingControls } from './controls/BlendingControls'
import { BorderControls } from './controls/BorderControls'
import { FillControls } from './controls/FillControls'
import { InnerShadowControls } from './controls/InnerShadowControls'
import { LayoutControls } from './controls/LayoutControls'
import { OutlineControls } from './controls/OutlineControls'
import { RectangleCornerControls } from './controls/RectangleCornerControls'
import { ShadowControls } from './controls/ShadowControls'
import { TypographyControls } from './controls/TypographyControls'
import { InspectorPropertySection } from './InspectorPropertySection'

export const RightInspector = observer(function RightInspector() {
  const shape = editorStore.document.selectedShape
  const group = editorStore.document.selectedGroup
  const target = group ?? shape

  const updateTarget = (patch: ShapePatch & GroupPatch) => {
    if (group) editorStore.document.updateGroup(group.id, patch)
    else if (shape) editorStore.document.updateShape(shape.id, patch)
  }

  const copyLink = () => {
    void globalThis.navigator.clipboard?.writeText(globalThis.location.href)
  }

  return (
    <aside className="absolute inset-y-0 right-0 z-[5] flex w-[281px] flex-col overflow-hidden border-l border-[#e2e2e2] bg-[#f2f2f2] max-[960px]:hidden" aria-label="Design inspector">
      <div className="h-[81px] shrink-0 border-b border-[#e2e2e2] px-3 py-2">
        <div className="flex h-[26px] items-center justify-between">
          <img src="/profile.jpeg" alt="Garrett Prince" className="size-[22px] rounded-full bg-white p-px object-cover shadow-[0_0_0_1px_#ddd]" />
          <span className="text-black/60">{editorStore.viewport.zoomPercent}%</span>
        </div>
        <div className="flex">
          <button type="button" className={cn('mt-1 flex h-[25px] w-full items-center justify-center gap-2 border-0', raisedControl, subtlePress)} onClick={copyLink}>Copy link</button>
        </div>
      </div>

      {!target ? (
        <div className="flex-1" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f2f2f2]">
          <section className={propertySection}>
            <h2 className="mb-2.5 text-[12px] leading-[18px] font-medium text-black/80">Layout</h2>
            <LayoutControls value={target} onChange={updateTarget} />
            <button type="button" className={cn('mt-2 h-[26px] w-full cursor-default border-0 text-black/80', raisedControl)} disabled>Wrap in flex <span className="ml-1.5 text-black/35">⇧ A</span></button>
          </section>

          {shape?.type === 'rectangle' && (
            <RectangleCornerControls shape={shape} onChange={(patch) => editorStore.document.updateShape(shape.id, patch)} />
          )}

          <BlendingControls opacity={target.opacity} visible={target.visible} onChange={updateTarget} />

          <InspectorPropertySection label="Fill" present={target.fillPresent} onAdd={() => updateTarget({ fillPresent: true, fillVisible: true })} actions={<button type="button" className={iconAction} aria-label="Add fill" onClick={() => updateTarget({ fillVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}>
            <FillControls value={target} onChange={updateTarget} />
          </InspectorPropertySection>

          <InspectorPropertySection label="Shadow" present={target.shadowPresent} onAdd={() => updateTarget({ shadowPresent: true, shadowVisible: true })} actions={<div className="flex items-center gap-0"><span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span><button type="button" className={iconAction} aria-label="Add shadow" onClick={() => updateTarget({ shadowPresent: true, shadowVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div>}>
            <ShadowControls value={target} onChange={updateTarget} />
          </InspectorPropertySection>

          <InspectorPropertySection label="Outline" present={target.outlinePresent} onAdd={() => updateTarget({ outlinePresent: true, outlineVisible: true })} actions={<span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span>}>
            <OutlineControls value={target} onChange={updateTarget} />
          </InspectorPropertySection>

          <InspectorPropertySection label="Border" present={target.borderPresent} onAdd={() => updateTarget({ borderPresent: true, borderVisible: true })} actions={<div className="flex items-center gap-0"><span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span><button type="button" className={iconAction} aria-label="Add border" onClick={() => updateTarget({ borderPresent: true, borderVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div>}>
            <BorderControls value={target} onChange={updateTarget} />
          </InspectorPropertySection>

          <InspectorPropertySection label="Inner shadow" present={target.innerShadowPresent} onAdd={() => updateTarget({ innerShadowPresent: true, innerShadowVisible: true })} actions={<button type="button" className={iconAction} aria-label="Add inner shadow" onClick={() => updateTarget({ innerShadowPresent: true, innerShadowVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button>}>
            <InnerShadowControls value={target} onChange={updateTarget} />
          </InspectorPropertySection>

          {shape?.type === 'text' && <TypographyControls shape={shape} onChange={(patch) => editorStore.document.updateShape(shape.id, patch)} />}

          {group && <button type="button" className={cn('mx-3 my-2.5 flex h-[27px] w-[calc(100%-24px)] items-center justify-center gap-2 border-0', raisedControl, subtlePress)} onClick={editorStore.document.ungroupSelected}>Ungroup <span className="text-black/35">⇧ ⌘ G</span></button>}

        </div>
      )}
    </aside>
  )
})
