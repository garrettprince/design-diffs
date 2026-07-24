import { useEffect, useRef, useState, type ReactNode } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import { cn, iconAction } from '../../styles/editor-classes'

type PromptActionProps = {
  label: string
  children: ReactNode
  active?: boolean
  onClick: () => void
}

function PromptAction({ label, children, active = false, onClick }: PromptActionProps) {
  return (
    <button
      type="button"
      className={cn(
        iconAction,
        'group relative text-black/70',
        active && 'bg-black/[0.055] text-black',
      )}
      aria-label={label}
      onClick={onClick}
    >
      {children}
      <span className={cn('pointer-events-none absolute top-[calc(100%+7px)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-[7px] border border-black/10 bg-[#f9f9f9] px-2.5 py-1.5 text-[12px] leading-4 font-normal text-black/80 opacity-0 shadow-[0_8px_24px_-8px_rgba(0,0,0,.25),0_1px_3px_rgba(0,0,0,.12)] transition-opacity delay-0 duration-100 group-hover:delay-200 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:delay-0', active && 'hidden')}>
        {label}
      </span>
    </button>
  )
}

function RestartPromptIcon() {
  return (
    <svg aria-hidden="true" width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5.5h-2.03a2 2 0 0 0-1.909 1.403L8.939 7.097A2 2 0 0 1 7.03 8.5H2.5M7.5.5h-5M2.5 8.5l2-2M2.5 8.5l2 2" />
    </svg>
  )
}

function CopyPromptIcon() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M0 7.5C0 8.328.672 9 1.5 9H3V8H1.5a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5V3H4.5C3.672 3 3 3.672 3 4.5v6c0 .828.672 1.5 1.5 1.5h6c.828 0 1.5-.672 1.5-1.5v-6c0-.828-.672-1.5-1.5-1.5H9V1.5C9 .672 8.328 0 7.5 0h-6C.672 0 0 .672 0 1.5v6ZM4 4.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-6a.5.5 0 0 1-.5-.5v-6Z" />
    </svg>
  )
}

function PromptMenuIcon() {
  return (
    <span aria-hidden="true" className="flex flex-col gap-0.5">
      <span className="h-px w-2.5 bg-current" />
      <span className="h-px w-2.5 bg-current" />
      <span className="h-px w-2.5 bg-current" />
    </span>
  )
}

export function DesignDiffPromptHeader({ instruction }: { instruction: string }) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const copiedTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => {
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    globalThis.addEventListener('pointerdown', closeMenu)
    return () => globalThis.removeEventListener('pointerdown', closeMenu)
  }, [menuOpen])

  const copyPrompt = async () => {
    try {
      await globalThis.navigator?.clipboard?.writeText(instruction)
      setCopied(true)
      if (copiedTimeout.current) clearTimeout(copiedTimeout.current)
      copiedTimeout.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <header className="relative flex h-8 w-full shrink-0 items-center gap-2 border-b border-[#dedede] px-2">
      <p className="min-w-0 flex-1 truncate text-[12px] leading-4 font-normal text-black/80" title={instruction}>{instruction}</p>
      <div className="flex shrink-0 items-center gap-0">
        <PromptAction label="Start over from this prompt" onClick={editorStore.designDiff.restartFromPrompt}>
          <RestartPromptIcon />
        </PromptAction>
        <PromptAction label={copied ? 'Copied' : 'Copy prompt'} onClick={() => void copyPrompt()}>
          <CopyPromptIcon />
        </PromptAction>
        <div className="relative" ref={menuRef}>
          <PromptAction label="More options" active={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <PromptMenuIcon />
          </PromptAction>
          {menuOpen && (
            <div className="absolute top-[calc(100%+7px)] right-0 z-40 w-36 overflow-hidden rounded-[7px] border border-black/10 bg-[#f9f9f9] p-1 shadow-[0_10px_30px_-8px_rgba(0,0,0,.28),0_1px_3px_rgba(0,0,0,.12)]" role="menu">
              <button type="button" className="flex h-7 w-full items-center rounded-[5px] border-0 bg-transparent px-2 text-left text-[12px] text-black/75 hover:bg-black/[0.055]" role="menuitem" onClick={() => { setMenuOpen(false); editorStore.designDiff.restartFromPrompt() }}>Start over</button>
              <button type="button" className="flex h-7 w-full items-center rounded-[5px] border-0 bg-transparent px-2 text-left text-[12px] text-black/75 hover:bg-black/[0.055]" role="menuitem" onClick={() => { setMenuOpen(false); void copyPrompt() }}>Copy prompt</button>
              <button type="button" className="flex h-7 w-full items-center rounded-[5px] border-0 bg-transparent px-2 text-left text-[12px] text-black/75 hover:bg-black/[0.055]" role="menuitem" onClick={() => { setMenuOpen(false); editorStore.designDiff.cancelReview() }}>Discard changes</button>
            </div>
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? 'Prompt copied' : ''}</span>
    </header>
  )
}
