import { observer } from 'mobx-react-lite'
import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import { cn, raisedControl, subtlePress } from '../../styles/editor-classes'
import { EditorIcon } from '../../ui/components/EditorIcon'
import { canvasAiPromptSpring } from '../constants/design-diff-motion'

type CanvasAiPromptProps = {
  containerWidth: number
  containerHeight: number
}

const PROMPT_WIDTH = 288
const PROMPT_HEIGHT = 88
const PROMPT_GAP = 12
const CANVAS_EDGE_GAP = 12
const PROMPT_FOCUSED_ELEMENT_FILL = 0.52
const MAX_PROMPT_FOCUSED_ZOOM = 2.3

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

export const CanvasAiPrompt = observer(function CanvasAiPrompt({ containerWidth, containerHeight }: CanvasAiPromptProps) {
  const [instruction, setInstruction] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bounds = editorStore.document.selectedBounds
  const isOpen = editorStore.designDiff.isPromptOpen
  const isLoading = editorStore.designDiff.status === 'loading'
  const panX = editorStore.viewport.panX
  const panY = editorStore.viewport.panY
  const zoom = editorStore.viewport.zoom
  const shouldReduceMotion = useReducedMotion()
  const focusDataRef = useRef({ bounds, containerHeight, containerWidth, panX, panY, shouldReduceMotion, zoom })
  focusDataRef.current = { bounds, containerHeight, containerWidth, panX, panY, shouldReduceMotion, zoom }

  const position = useMemo(() => {
    if (!bounds) return null
    const targetRight = panX + bounds.right * zoom
    const targetBottom = panY + bounds.bottom * zoom
    const maximumLeft = Math.max(CANVAS_EDGE_GAP, containerWidth - PROMPT_WIDTH - CANVAS_EDGE_GAP)
    const maximumTop = Math.max(CANVAS_EDGE_GAP, containerHeight - PROMPT_HEIGHT - CANVAS_EDGE_GAP)

    return {
      left: clamp(targetRight + PROMPT_GAP, CANVAS_EDGE_GAP, maximumLeft),
      top: clamp(targetBottom - PROMPT_HEIGHT, CANVAS_EDGE_GAP, maximumTop),
    }
  }, [bounds, containerHeight, containerWidth, panX, panY, zoom])

  useEffect(() => {
    if (!isOpen) return
    setInstruction(editorStore.designDiff.promptDraft)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const focusData = focusDataRef.current
    if (!focusData.bounds) return

    const boundsWidth = Math.max(1, focusData.bounds.right - focusData.bounds.left)
    const boundsHeight = Math.max(1, focusData.bounds.bottom - focusData.bounds.top)
    const fitZoom = Math.min(
      (focusData.containerWidth - CANVAS_EDGE_GAP * 2 - PROMPT_GAP - PROMPT_WIDTH) / boundsWidth,
      (focusData.containerHeight - CANVAS_EDGE_GAP * 2) / boundsHeight,
    )
    const focusZoom = Math.min(
      focusData.containerWidth * PROMPT_FOCUSED_ELEMENT_FILL / boundsWidth,
      focusData.containerHeight * PROMPT_FOCUSED_ELEMENT_FILL / boundsHeight,
      MAX_PROMPT_FOCUSED_ZOOM,
    )
    const targetZoom = clamp(Math.min(focusZoom, fitZoom), 0.2, 4)
    const combinedWidth = boundsWidth * targetZoom + PROMPT_GAP + PROMPT_WIDTH
    const focusedElementHeight = boundsHeight * targetZoom
    const combinedHeight = Math.max(focusedElementHeight, PROMPT_HEIGHT)
    const combinedLeft = (focusData.containerWidth - combinedWidth) / 2
    const combinedTop = (focusData.containerHeight - combinedHeight) / 2
    const targetPanX = combinedLeft - focusData.bounds.left * targetZoom
    const targetPanY = combinedTop + combinedHeight - focusedElementHeight - focusData.bounds.top * targetZoom

    if (focusData.shouldReduceMotion) {
      editorStore.viewport.setViewport(targetZoom, targetPanX, targetPanY)
      return
    }

    const focusAnimation = animate(0, 1, {
      ...canvasAiPromptSpring,
      onUpdate: (progress) => editorStore.viewport.setViewport(
        focusData.zoom + (targetZoom - focusData.zoom) * progress,
        focusData.panX + (targetPanX - focusData.panX) * progress,
        focusData.panY + (targetPanY - focusData.panY) * progress,
      ),
    })
    const stopAnimation = () => focusAnimation.stop()
    globalThis.addEventListener('wheel', stopAnimation, { capture: true, passive: true })
    globalThis.addEventListener('pointerdown', stopAnimation, { capture: true })
    globalThis.addEventListener('keydown', stopAnimation, { capture: true })

    return () => {
      focusAnimation.stop()
      globalThis.removeEventListener('wheel', stopAnimation, { capture: true })
      globalThis.removeEventListener('pointerdown', stopAnimation, { capture: true })
      globalThis.removeEventListener('keydown', stopAnimation, { capture: true })
    }
  }, [isOpen])

  if (!isOpen || isLoading || !position) return null

  const applyInstruction = () => {
    if (!instruction.trim() || isLoading) return
    void editorStore.designDiff.create(instruction)
  }

  return (
    <div
      className="absolute z-[6] h-[88px] w-72 overflow-hidden rounded-[7.5px] bg-[#f2f2f2] shadow-[0_0_0_1px_#0000001a,0_16px_64px_-12px_#00000033]"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label="Change selected object"
    >
      <textarea
        ref={inputRef}
        className="block h-14 w-full resize-none border-0 bg-transparent py-2 pr-8 pl-2 text-[12px] leading-4 text-black/80 outline-none placeholder:text-black/50"
        value={instruction}
        placeholder="What would you like to change?"
        aria-describedby={editorStore.designDiff.error ? 'canvas-ai-prompt-status' : undefined}
        aria-invalid={Boolean(editorStore.designDiff.error)}
        disabled={isLoading}
        onChange={(event) => {
          setInstruction(event.target.value)
          editorStore.designDiff.clearError()
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape' && !isLoading) {
            event.preventDefault()
          editorStore.designDiff.closePrompt()
          }
          if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
            event.preventDefault()
            applyInstruction()
          }
        }}
      />
      <div className="flex h-8 items-start justify-end px-2 pb-2">
        {editorStore.designDiff.error && <span id="canvas-ai-prompt-status" className="mr-auto max-w-[185px] truncate pt-1 text-[11px] leading-4 text-black/50" aria-live="polite" title={editorStore.designDiff.error}>{editorStore.designDiff.error}</span>}
        <button
          type="button"
          className={cn('flex h-6 min-w-[71px] items-center justify-center gap-1.5 border-0 px-2 text-[12px] text-black/80 disabled:cursor-default disabled:opacity-40', raisedControl, subtlePress)}
          disabled={!instruction.trim() || isLoading}
          onClick={applyInstruction}
        >
          <EditorIcon name="ai-edit" size={12} />
          {isLoading ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
})
