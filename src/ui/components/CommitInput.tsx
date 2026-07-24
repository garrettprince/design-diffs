import { useEffect, useRef, useState, type FocusEventHandler, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type CommitInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onKeyDown'> & {
  value: string | number
  onCommit: (draft: string) => boolean | void
  onAfterCommit?: (input: HTMLInputElement) => void
  onAfterCancel?: (input: HTMLInputElement) => void
  onFocus?: FocusEventHandler<HTMLInputElement>
}

export function CommitInput({ value, onCommit, onAfterCommit, onAfterCancel, onFocus, ...props }: CommitInputProps) {
  const [draft, setDraft] = useState(String(value))
  const editingRef = useRef(false)

  useEffect(() => {
    if (!editingRef.current) setDraft(String(value))
  }, [value])

  return (
    <input
      {...props}
      value={draft}
      onFocus={(event) => {
        editingRef.current = true
        onFocus?.(event)
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        editingRef.current = false
        setDraft(String(value))
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          if (onCommit(draft) === false) return
          editingRef.current = false
          event.currentTarget.blur()
          onAfterCommit?.(event.currentTarget)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          editingRef.current = false
          setDraft(String(value))
          event.currentTarget.blur()
          onAfterCancel?.(event.currentTarget)
        }
      }}
    />
  )
}

type CommitTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onKeyDown'> & {
  value: string
  onCommit: (draft: string) => boolean | void
}

export function CommitTextarea({ value, onCommit, ...props }: CommitTextareaProps) {
  const [draft, setDraft] = useState(value)
  const editingRef = useRef(false)

  useEffect(() => {
    if (!editingRef.current) setDraft(value)
  }, [value])

  return (
    <textarea
      {...props}
      value={draft}
      onFocus={() => {
        editingRef.current = true
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        editingRef.current = false
        setDraft(value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          event.stopPropagation()
          if (onCommit(draft) === false) return
          editingRef.current = false
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          editingRef.current = false
          setDraft(value)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
