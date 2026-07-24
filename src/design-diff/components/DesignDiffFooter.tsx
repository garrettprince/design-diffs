import { ChevronLeft, ChevronRight } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { editorStore } from '../../editor/model/editor-store'
import { cn, iconAction, raisedControl, subtlePress } from '../../styles/editor-classes'

const actionClass = cn('flex h-6 items-center justify-center gap-1.5 border-0 px-2 text-[12px] font-medium text-black/80', raisedControl, subtlePress)

export const DesignDiffFooter = observer(function DesignDiffFooter() {
  const review = editorStore.designDiff.review
  if (!review) return null
  const isFirst = review.currentIndex === 0
  const isLast = review.currentIndex === review.steps.length - 1

  return (
    <div className="flex h-6 w-[577px] items-start gap-2">
      <div className="flex flex-1 items-center">
        <button type="button" className={cn(iconAction, 'text-black/80')} aria-label="Previous change" disabled={isFirst} onClick={() => editorStore.designDiff.goToStep(review.currentIndex - 1)}><ChevronLeft aria-hidden="true" size={14} strokeWidth={1.35} /></button>
        <span className="min-w-[42px] text-center text-black/50">{review.currentIndex + 1} of {review.steps.length}</span>
        <button type="button" className={cn(iconAction, 'text-black/80')} aria-label="Next change" disabled={isLast} onClick={() => editorStore.designDiff.goToStep(review.currentIndex + 1)}><ChevronRight aria-hidden="true" size={14} strokeWidth={1.35} /></button>
      </div>
      <div className="flex items-center justify-center gap-2">
        <button type="button" className={cn(actionClass, 'w-[74px]')} onClick={editorStore.designDiff.rejectCurrentStep}>Reject <span className="text-black/35">R</span></button>
        <button type="button" className={cn(actionClass, 'w-[74px]')} onClick={editorStore.designDiff.acceptCurrentStep}>Accept <span className="text-black/35">↵</span></button>
      </div>
      <div className="flex flex-1 justify-end"><button type="button" className={actionClass} onClick={editorStore.designDiff.acceptAll}>Accept all <span className="text-black/35">⌘↵</span></button></div>
    </div>
  )
})
