import { ArrowRight, Blend, ChevronDown, Droplet, Eye, Plus, Scan, SlidersHorizontal, Squircle } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { CSSProperties } from 'react'
import { getFillCss, withOpacity } from '../../editor/model/color'
import { fontWeights, textAlignments } from '../../editor/constants/editor-constants'
import { editorStore } from '../../editor/model/editor-store'
import { getCornerRadii } from '../../editor/model/radius'
import { getCornerShapeCss } from '../../editor/model/smoothing'
import { BorderControls } from '../../inspector/components/controls/BorderControls'
import { FillControls } from '../../inspector/components/controls/FillControls'
import { InnerShadowControls } from '../../inspector/components/controls/InnerShadowControls'
import { LayoutControls } from '../../inspector/components/controls/LayoutControls'
import { OutlineControls } from '../../inspector/components/controls/OutlineControls'
import { ShadowControls } from '../../inspector/components/controls/ShadowControls'
import { cn, iconAction, iconSlot, inspectorField, raisedControl } from '../../styles/editor-classes'
import { AddPropertyRow } from '../../ui/components/AddPropertyRow'
import { CommitInput } from '../../ui/components/CommitInput'
import { designDiffLabels, getDesignDiffPropertyPanelTarget, type DesignDiffGroupPreview, type DesignDiffStep, type DesignDiffTarget, type DesignDiffValue } from '../model/design-diff-model'
import { designDiffPreviewCloseSpring, designDiffPreviewSpring, instantDesignDiffTransition } from '../constants/design-diff-motion'

const formatValue = (value: string | number, property: DesignDiffStep['property']) => {
  if (property === 'opacity' || property === 'fillOpacity' || property === 'smoothing') return `${Math.round(Number(value) * 100)}%`
  if (property === 'rotation') return `${value}°`
  return String(value)
}

const getTargetStyle = (target: DesignDiffTarget, scale: number): CSSProperties => {
  const width = Math.max(12, target.width * scale)
  const height = Math.max(12, target.height * scale)
  const style: CSSProperties & { cornerShape?: string } = {
    width,
    height,
    opacity: target.opacity,
    background: getFillCss(target),
    borderRadius: 'type' in target && target.type === 'ellipse' ? '999px' : 'type' in target ? getCornerRadii(target).map((radius) => `${radius * scale}px`).join(' ') : 0,
    cornerShape: 'type' in target && target.type === 'rectangle' ? getCornerShapeCss(target.smoothing) : undefined,
    transform: `rotate(${target.rotation}deg)`,
    border: target.borderPresent && target.borderVisible ? `${Math.max(0.5, target.borderWidth * scale)}px solid ${withOpacity(target.borderColor, target.borderOpacity)}` : 'none',
    outline: target.outlinePresent && target.outlineVisible ? `${Math.max(0.5, target.outlineWidth * scale)}px solid ${withOpacity(target.outlineColor, target.outlineOpacity)}` : 'none',
    outlineOffset: target.outlinePresent && target.outlineVisible ? target.outlineOffset * scale : 0,
    boxShadow: [
      target.shadowPresent && target.shadowVisible ? `${target.shadowX * scale}px ${target.shadowY * scale}px ${target.shadowBlur * scale}px ${target.shadowSpread * scale}px ${withOpacity(target.shadowColor, target.shadowOpacity)}` : '',
      target.innerShadowPresent && target.innerShadowVisible ? `inset ${target.innerShadowX * scale}px ${target.innerShadowY * scale}px ${target.innerShadowBlur * scale}px ${target.innerShadowSpread * scale}px ${withOpacity(target.innerShadowColor, target.innerShadowOpacity)}` : '',
    ].filter(Boolean).join(', ') || 'none',
  }
  return style
}

const renderShapeMiniature = (target: DesignDiffTarget, scale: number, positioned = false) => {
  const style = getTargetStyle(target, scale)
  const positionStyle: CSSProperties = positioned
    ? { position: 'absolute', left: target.x * scale, top: target.y * scale, transformOrigin: 'top left' }
    : {}

  if ('type' in target && target.type === 'text') {
    const gradientText = target.fillVisible && target.fillType === 'gradient'
    return <div key={target.id} className="relative flex items-center overflow-hidden whitespace-nowrap text-black/80" style={{ ...style, ...positionStyle, background: gradientText ? getFillCss(target) : 'transparent', color: gradientText ? 'transparent' : getFillCss(target), WebkitBackgroundClip: gradientText ? 'text' : undefined, fontSize: Math.max(8, target.fontSize * scale), fontWeight: target.fontWeight, justifyContent: target.textAlign === 'center' ? 'center' : target.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>{target.text}</div>
  }
  return <div key={target.id} className="relative" style={{ ...style, ...positionStyle }} />
}

const TargetMiniature = observer(function TargetMiniature({ target, preview, scale }: { target: DesignDiffTarget; preview?: DesignDiffGroupPreview; scale: number }) {
  if (!preview) return renderShapeMiniature(target, scale)

  return (
    <div
      aria-label="Grouped component preview"
      className="relative"
      role="img"
      style={{
        width: Math.max(12, preview.group.width * scale),
        height: Math.max(12, preview.group.height * scale),
        opacity: preview.group.opacity,
        transform: `rotate(${preview.group.rotation}deg)`,
        transformOrigin: 'center',
      }}
    >
      {preview.shapes.filter((shape) => shape.visible).map((shape) => (
        renderShapeMiniature(shape, scale, true)
      ))}
    </div>
  )
})

const resultField = cn(
  'flex h-6 min-w-0 items-center px-1.5 text-black/80 focus-within:outline focus-within:outline-1 focus-within:outline-[#1677ff]',
  raisedControl,
)

const updateResult = (value: DesignDiffValue) => editorStore.designDiff.updateCurrentStepAfterValue(value)
const focusReviewDialog = (input: HTMLInputElement) => {
  const dialog = input.closest('[role="dialog"]') as HTMLElement | null
  dialog?.focus({ preventScroll: true })
}

const PropertyPanel = observer(function PropertyPanel({ step, side }: { step: DesignDiffStep; side: 'before' | 'after' }) {
  const target = getDesignDiffPropertyPanelTarget(step, side)
  const value = side === 'before' ? step.beforeValue : step.afterValue
  const label = designDiffLabels[step.property]
  const editable = side === 'after'

  if (step.property === 'radius') {
    const maximum = Math.max(1, Math.min(target.width, target.height) / 2)
    const percentage = Math.min(100, Math.max(0, Number(value) / maximum * 100))
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Radius</span><span className={iconSlot}><Scan aria-hidden="true" size={16} strokeWidth={1.35} /></span></div>
        <div className="-mt-2 flex items-center gap-2 px-3 py-3">
          <input
            className={cn('paper-radius-slider h-6 min-w-0 flex-1 appearance-none bg-transparent', !editable && 'pointer-events-none')}
            style={{ '--range-progress': `${percentage}%` } as CSSProperties}
            aria-label={editable ? 'Result radius slider' : 'Previous radius slider'}
            tabIndex={editable ? 0 : -1}
            type="range"
            min="0"
            max={maximum}
            value={Number(value)}
            readOnly={!editable}
            onChange={editable ? (event) => updateResult(Number(event.target.value)) : undefined}
            onKeyDown={editable ? (event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.stopPropagation()
              focusReviewDialog(event.currentTarget)
              if (event.metaKey || event.ctrlKey) editorStore.designDiff.acceptAll()
              else editorStore.designDiff.acceptCurrentStep()
            } : undefined}
          />
          {editable ? (
            <label className={cn(resultField, 'w-20 shrink-0')}>
              <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 outline-none" aria-label="Result radius" type="number" min="0" max={maximum} value={Number(value)} onCommit={(draft) => {
                const parsed = Number(draft)
                if (!Number.isFinite(parsed)) return false
                updateResult(Math.min(maximum, Math.max(0, parsed)))
              }} onAfterCommit={focusReviewDialog} onAfterCancel={focusReviewDialog} />
            </label>
          ) : <div className={cn('flex h-6 w-20 shrink-0 items-center px-1.5', raisedControl)}>{formatValue(value, step.property)}</div>}
        </div>
      </div>
    )
  }

  if (step.property === 'smoothing') {
    const percentage = Math.round(Number(value) * 100)
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Smoothing</span><span className={iconSlot}><Squircle aria-hidden="true" size={16} strokeWidth={1.35} /></span></div>
        <div className="-mt-2 flex items-center gap-2 px-3 py-3">
          <input
            className={cn('paper-radius-slider h-6 min-w-0 flex-1 appearance-none bg-transparent', !editable && 'pointer-events-none')}
            style={{ '--range-progress': `${percentage}%` } as CSSProperties}
            aria-label={editable ? 'Result smoothing slider' : 'Previous smoothing slider'}
            tabIndex={editable ? 0 : -1}
            type="range"
            min="0"
            max="100"
            value={percentage}
            readOnly={!editable}
            onChange={editable ? (event) => updateResult(Number(event.target.value) / 100) : undefined}
          />
          {editable ? (
            <label className={cn(resultField, 'w-20 shrink-0')}>
              <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 outline-none" aria-label="Result smoothing" type="number" min="0" max="100" value={percentage} onCommit={(draft) => {
                const parsed = Number(draft)
                if (!Number.isFinite(parsed)) return false
                updateResult(Math.min(100, Math.max(0, parsed)) / 100)
              }} onAfterCommit={focusReviewDialog} onAfterCancel={focusReviewDialog} />
              <span className="text-black/35">%</span>
            </label>
          ) : <div className={cn('flex h-6 w-20 shrink-0 items-center px-1.5', raisedControl)}>{formatValue(value, step.property)}</div>}
        </div>
      </div>
    )
  }

  if (step.property === 'opacity') {
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Blending</span><span className={iconSlot}><Eye aria-hidden="true" size={16} strokeWidth={1.35} /></span></div>
        <div className="-mt-2 grid grid-cols-2 gap-2 px-3 py-3">
          {editable ? (
            <label className={resultField}>
              <span className="size-3 shrink-0 bg-[conic-gradient(#aaa_25%,#e3e3e3_0_50%,#aaa_0_75%,#e3e3e3_0)] bg-[length:4px_4px] opacity-65" />
              <CommitInput className="min-w-0 flex-1 border-0 bg-transparent p-0 outline-none" aria-label="Result opacity" type="number" min="0" max="100" value={Math.round(Number(value) * 100)} onCommit={(draft) => {
                const parsed = Number(draft)
                if (!Number.isFinite(parsed)) return false
                updateResult(Math.min(100, Math.max(0, parsed)) / 100)
              }} onAfterCommit={focusReviewDialog} onAfterCancel={focusReviewDialog} />
              <span className="text-black/35">%</span>
            </label>
          ) : <div className={inspectorField}><span className="size-3 bg-[conic-gradient(#aaa_25%,#e3e3e3_0_50%,#aaa_0_75%,#e3e3e3_0)] bg-[length:4px_4px] opacity-65" />{formatValue(value, step.property)}</div>}
          <div className={inspectorField}><Droplet aria-hidden="true" size={13} strokeWidth={1.35} /><span className="flex-1 text-black/80">Normal</span><ChevronDown aria-hidden="true" size={13} /></div>
        </div>
      </div>
    )
  }

  if (step.property === 'fill' || step.property === 'fillOpacity') {
    if (!target.fillPresent) return <div className="w-[280px]"><AddPropertyRow label="Fill" ariaPrefix={editable ? 'Add result' : 'Previous'} onAdd={editable ? () => editorStore.designDiff.updateCurrentFill({ fillPresent: true, fillVisible: true }) : undefined} /></div>
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Fill</span><button type="button" className={iconAction} aria-label={`${editable ? 'Add result' : 'Previous'} fill`} disabled={!editable} onClick={() => editorStore.designDiff.updateCurrentFill({ fillPresent: true, fillVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div>
        <div className="-mt-2 px-3 py-3">
          <FillControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentFill : undefined} labelPrefix={editable ? 'Result fill' : 'Previous fill'} removable={false} />
        </div>
      </div>
    )
  }

  if (step.property === 'outline') {
    if (!target.outlinePresent) return <div className="w-[280px]"><AddPropertyRow label="Outline" ariaPrefix={editable ? 'Add result' : 'Previous'} onAdd={editable ? () => editorStore.designDiff.updateCurrentOutline({ outlinePresent: true, outlineVisible: true }) : undefined} /></div>
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Outline</span><span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span></div>
        <div className="-mt-2 px-3 py-3"><OutlineControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentOutline : undefined} labelPrefix={editable ? 'Result outline' : 'Previous outline'} removable={false} /></div>
      </div>
    )
  }

  if (step.property === 'border') {
    if (!target.borderPresent) return <div className="w-[280px]"><AddPropertyRow label="Border" ariaPrefix={editable ? 'Add result' : 'Previous'} onAdd={editable ? () => editorStore.designDiff.updateCurrentBorder({ borderPresent: true, borderVisible: true }) : undefined} /></div>
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Border</span><div className="flex items-center gap-0"><span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span><button type="button" className={iconAction} aria-label={`${editable ? 'Add result' : 'Previous'} border`} disabled={!editable} onClick={() => editorStore.designDiff.updateCurrentBorder({ borderPresent: true, borderVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div></div>
        <div className="-mt-2 px-3 py-3"><BorderControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentBorder : undefined} labelPrefix={editable ? 'Result border' : 'Previous border'} removable={false} /></div>
      </div>
    )
  }

  if (step.property === 'shadow') {
    if (!target.shadowPresent) return <div className="w-[280px]"><AddPropertyRow label="Shadow" ariaPrefix={editable ? 'Add result' : 'Previous'} onAdd={editable ? () => editorStore.designDiff.updateCurrentShadow({ shadowPresent: true, shadowVisible: true }) : undefined} /></div>
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Shadow</span><div className="flex items-center gap-0"><span className={iconSlot}><SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.25} /></span><button type="button" className={iconAction} aria-label={`${editable ? 'Add result' : 'Previous'} shadow`} disabled={!editable} onClick={() => editorStore.designDiff.updateCurrentShadow({ shadowPresent: true, shadowVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div></div>
        <div className="-mt-2 px-3 py-3">
          <ShadowControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentShadow : undefined} labelPrefix={editable ? 'Result shadow' : 'Previous shadow'} removable={false} />
        </div>
      </div>
    )
  }

  if (step.property === 'innerShadow') {
    if (!target.innerShadowPresent) return <div className="w-[280px]"><AddPropertyRow label="Inner shadow" ariaPrefix={editable ? 'Add result' : 'Previous'} onAdd={editable ? () => editorStore.designDiff.updateCurrentInnerShadow({ innerShadowPresent: true, innerShadowVisible: true }) : undefined} /></div>
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">Inner shadow</span><button type="button" className={iconAction} aria-label={`${editable ? 'Add result' : 'Previous'} inner shadow`} disabled={!editable} onClick={() => editorStore.designDiff.updateCurrentInnerShadow({ innerShadowPresent: true, innerShadowVisible: true })}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></button></div>
        <div className="-mt-2 px-3 py-3"><InnerShadowControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentInnerShadow : undefined} labelPrefix={editable ? 'Result inner shadow' : 'Previous inner shadow'} removable={false} /></div>
      </div>
    )
  }

  if (step.property === 'layout') {
    return (
      <div className="w-[280px] pt-px">
        <div className="flex h-8 items-center justify-between px-3"><span className="flex items-center gap-1 font-medium">Layout <ChevronDown aria-hidden="true" size={12} strokeWidth={1.35} /></span><span className={iconSlot}><Plus aria-hidden="true" size={16} strokeWidth={1.35} /></span></div>
        <div className="-mt-2 px-3 py-3">
          <LayoutControls value={target} onChange={editable ? editorStore.designDiff.updateCurrentLayout : undefined} labelPrefix={editable ? 'Result layout' : 'Previous layout'} dimensionsOnly />
        </div>
      </div>
    )
  }

  const textProperty = step.property === 'text'
  const selectProperty = step.property === 'fontWeight' || step.property === 'textAlign'
  const minimum = step.property === 'width' || step.property === 'height' || step.property === 'fontSize' ? 1 : undefined
  return (
    <div className="w-[280px] pt-px">
      <div className="flex h-8 items-center justify-between px-3"><span className="font-medium">{label}</span>{step.property === 'fontSize' || step.property === 'fontWeight' || step.property === 'textAlign' || step.property === 'text' ? <span className="text-black/35">Aa</span> : <Blend aria-hidden="true" size={14} strokeWidth={1.35} />}</div>
      <div className="-mt-2 px-3 py-3">
        {editable ? (
          <label className={resultField}>
            {selectProperty ? (
              <select className="min-w-0 w-full border-0 bg-transparent outline-none" aria-label={`Result ${label.toLowerCase()}`} value={value} onChange={(event) => updateResult(step.property === 'fontWeight' ? Number(event.target.value) : event.target.value)}>
                {(step.property === 'fontWeight' ? fontWeights : textAlignments).map((option) => <option value={option} key={option}>{option}</option>)}
              </select>
            ) : (
              <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 outline-none" aria-label={`Result ${label.toLowerCase()}`} type={textProperty ? 'text' : 'number'} min={minimum} value={value} onCommit={(draft) => {
                if (textProperty) {
                  updateResult(draft)
                  return
                }
                const parsed = Number(draft)
                if (!Number.isFinite(parsed)) return false
                updateResult(Math.max(minimum ?? Number.NEGATIVE_INFINITY, parsed))
              }} onAfterCommit={focusReviewDialog} onAfterCancel={focusReviewDialog} />
            )}
          </label>
        ) : <div className={cn('flex h-6 items-center px-1.5 text-black/80', raisedControl)}><span className="truncate">{formatValue(value, step.property)}</span></div>}
      </div>
    </div>
  )
})

export const DesignDiffComparison = observer(function DesignDiffComparison({ step, previewEnabled }: { step: DesignDiffStep; previewEnabled: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const openTransition = shouldReduceMotion ? instantDesignDiffTransition : designDiffPreviewSpring
  const closeTransition = shouldReduceMotion ? instantDesignDiffTransition : designDiffPreviewCloseSpring
  const beforePreviewTarget = step.beforePreview?.group ?? step.beforeTarget
  const afterPreviewTarget = step.afterPreview?.group ?? step.afterTarget
  const maxWidth = Math.max(beforePreviewTarget.width, afterPreviewTarget.width)
  const maxHeight = Math.max(beforePreviewTarget.height, afterPreviewTarget.height)
  const scale = Math.min(1.5, 220 / Math.max(1, maxWidth), 69 / Math.max(1, maxHeight))

  return (
    <div className="relative w-[577px]">
      <AnimatePresence initial={false}>
        {previewEnabled && (
          <motion.div
            key="preview-row"
            className="relative grid w-[577px] grid-cols-[288px_1px_288px] overflow-hidden"
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0, y: -6 }}
            animate={{ height: 93, opacity: 1, y: 0, transition: openTransition }}
            exit={{ height: 0, opacity: 0, y: -6, transition: closeTransition }}
          >
            <div className="flex h-[93px] w-[280px] justify-self-end items-center justify-center border-b border-[#e2e2e2] px-6 pt-2 pb-4"><TargetMiniature target={step.beforeTarget} preview={step.beforePreview} scale={scale} /></div>
            <div className="h-[93px] bg-[#e2e2e2]" />
            <div className="flex h-[93px] w-[280px] justify-self-start items-center justify-center border-b border-[#e2e2e2] px-6 pt-2 pb-4"><TargetMiniature target={step.afterTarget} preview={step.afterPreview} scale={scale} /></div>
            <div className="absolute top-[46.5px] left-[272.5px] z-[2] grid h-[31px] w-7 -translate-y-1/2 place-items-center bg-[#f2f2f2] text-[#B7B7B7]" aria-hidden="true">
              <ArrowRight size={14} strokeWidth={1.8} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative grid w-[577px] grid-cols-[288px_1px_288px] items-stretch">
        <div className="flex items-start justify-end pr-2"><PropertyPanel step={step} side="before" /></div>
        <div className="self-stretch bg-[#e2e2e2]" />
        <div className="flex items-start pl-2"><PropertyPanel step={step} side="after" /></div>
        <div className="absolute top-1/2 left-[272.5px] z-[2] grid h-[31px] w-7 -translate-y-1/2 place-items-center bg-[#f2f2f2] text-[#B7B7B7]" aria-hidden="true">
          <ArrowRight size={14} strokeWidth={1.8} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-72 bg-[#f2f2f2]/50" aria-hidden="true" />
      </div>
    </div>
  )
})
