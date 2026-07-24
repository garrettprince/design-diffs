import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { editorStore } from '../../editor/model/editor-store'
import type { EditorShape } from '../../editor/model/types'

type TextEditorOverlayProps = {
  shape: EditorShape
  onClose: () => void
}

export function TextEditorOverlay({ shape, onClose }: TextEditorOverlayProps) {
  const [value, setValue] = useState(shape.text)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const commit = () => {
    editorStore.document.updateShape(shape.id, { text: value || 'Text' })
    onClose()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <textarea
      ref={inputRef}
      className="absolute z-[3] resize-none border border-[#1677ff] bg-white/90 p-0 font-sans leading-[1.2] outline-0 [transform-origin:top_left]"
      data-testid="canvas-text-editor"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={onClose}
      onKeyDown={handleKeyDown}
      style={{
        left: editorStore.viewport.panX + shape.x * editorStore.viewport.zoom,
        top: editorStore.viewport.panY + shape.y * editorStore.viewport.zoom,
        width: shape.width * editorStore.viewport.zoom,
        height: shape.height * editorStore.viewport.zoom,
        color: shape.fill,
        opacity: shape.opacity,
        fontSize: shape.fontSize * editorStore.viewport.zoom,
        fontWeight: shape.fontWeight,
        textAlign: shape.textAlign,
        transform: `rotate(${shape.rotation}deg)`,
      }}
    />
  )
}
