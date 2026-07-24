import { cn } from '../../styles/editor-classes'
import { EditorIcon, type EditorIconName } from '../../ui/components/EditorIcon'

type ToolButtonProps = {
  icon: EditorIconName
  active: boolean
  label: string
  shortcut: string
  disabled?: boolean
  ariaLabel?: string
  onClick: () => void
}

export function ToolButton({ icon, active, label, shortcut, disabled = false, ariaLabel, onClick }: ToolButtonProps) {
  const iconSize = icon === 'select' || icon === 'hand' || icon === 'artboard' || icon === 'pen'
    ? 24
    : icon === 'rectangle' || icon === 'shaders'
      ? 16
      : 20

  return (
    <button
      type="button"
      className={cn(
        'group relative grid h-9 w-10 place-items-center border-0 bg-transparent p-0 text-black/65 before:absolute before:inset-[2px_4px] before:rounded-[7.5px] focus-visible:text-black focus-visible:outline-none focus-visible:before:bg-black/[0.055] disabled:cursor-default disabled:opacity-30 disabled:hover:text-black/65 disabled:hover:before:bg-transparent disabled:active:before:bg-transparent [&_svg]:relative [&_svg]:z-[1]',
        !active && 'hover:text-black hover:before:bg-black/[0.055] active:before:bg-black/[0.04]',
        active && 'text-black/80 before:bg-[#f9f9f9] before:shadow-[inset_0_1px_0_#ffffff88,inset_0_0_1px_1px_#ffffff88,0_.5px_1px_#0001,0_0_1px_#0002,0_0_4px_-1px_#0002]',
      )}
      aria-label={ariaLabel ?? `${label} tool`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <EditorIcon name={icon} size={iconSize} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-[calc(100%+8px)] z-20 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-[7px] border border-black/10 bg-[#f9f9f9] px-2.5 py-1.5 text-[12px] leading-4 font-normal text-black/80 opacity-0 shadow-[0_8px_24px_-8px_rgba(0,0,0,.25),0_1px_3px_rgba(0,0,0,.12)] transition-opacity delay-0 duration-100 group-hover:delay-200 group-hover:opacity-100 group-focus:opacity-100 group-focus:delay-0"
      >
        <span>{label}</span>
        <span className="text-black/40">{shortcut}</span>
      </span>
    </button>
  )
}
