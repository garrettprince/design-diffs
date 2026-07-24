import { observer } from 'mobx-react-lite'
import type { KeyboardEvent } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import { DesignDiffComparison } from './DesignDiffComparison'
import { DesignDiffFooter } from './DesignDiffFooter'
import { DesignDiffPromptHeader } from './DesignDiffPromptHeader'

export const DesignDiffReviewer = observer(function DesignDiffReviewer() {
  const review = editorStore.designDiff.review
  const step = editorStore.designDiff.currentStep
  if (!review || !step || editorStore.designDiff.status !== 'review') return null

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    const modifier = event.metaKey || event.ctrlKey

    if (event.key === 'Tab') return
    if (target.matches('input, textarea, select') || target.isContentEditable) return

    const consumeShortcut = () => {
      event.preventDefault()
      event.stopPropagation()
      event.currentTarget.focus({ preventScroll: true })
    }

    if (event.key === 'Escape') {
      consumeShortcut()
      editorStore.designDiff.cancelReview()
      return
    }

    if (!modifier && event.key.toLowerCase() === 'r') {
      consumeShortcut()
      if (!event.repeat) editorStore.designDiff.rejectCurrentStep()
      return
    }

    if (event.key === 'Enter') {
      consumeShortcut()
      if (!event.repeat) {
        if (modifier) editorStore.designDiff.acceptAll()
        else editorStore.designDiff.acceptCurrentStep()
      }
      return
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    consumeShortcut()
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    editorStore.designDiff.goToStep(review.currentIndex + direction)
  }

  return (
    <section className="fixed bottom-4 left-1/2 z-[7] flex w-[593px] max-w-[calc(100%-24px)] -translate-x-1/2 flex-col items-start overflow-visible rounded-[7.5px] bg-[#f2f2f2] text-[12px] leading-4 text-black/80 shadow-[0_0_0_1px_#0000001a,0_16px_64px_-12px_#00000033] outline-none" aria-label="Review design changes" role="dialog" tabIndex={-1} autoFocus onKeyDown={handleKeyDown}>
      <DesignDiffPromptHeader instruction={review.instruction} />
      <div className="flex w-full flex-col items-start gap-4 p-2">
        <DesignDiffComparison step={step} previewEnabled={review.previewEnabled} />
        <DesignDiffFooter />
      </div>
    </section>
  )
})
