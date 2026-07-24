import { observer } from 'mobx-react-lite'
import { editorStore } from '../../editor/model/editor-store'
import type { EditorTool } from '../../editor/model/types'
import type { EditorIconName } from '../../ui/components/EditorIcon'
import { ToolButton } from './ToolButton'

type RailTool = { tool: EditorTool; icon: EditorIconName; label: string; shortcut: string }

const toolSections: RailTool[][] = [
  [
    { tool: 'select', icon: 'select', label: 'Select', shortcut: 'V' },
    { tool: 'hand', icon: 'hand', label: 'Hand', shortcut: 'H' },
  ],
  [
    { tool: 'frame', icon: 'artboard', label: 'Frame', shortcut: 'F' },
    { tool: 'rectangle', icon: 'rectangle', label: 'Rectangle', shortcut: 'R' },
    { tool: 'pen', icon: 'pen', label: 'Pen', shortcut: 'P' },
    { tool: 'text', icon: 'text', label: 'Text', shortcut: 'T' },
  ],
  [
    { tool: 'image-gen', icon: 'image-gen', label: 'Image Gen', shortcut: 'I' },
    { tool: 'svg-gen', icon: 'svg-gen', label: 'SVG Gen', shortcut: 'G' },
    { tool: 'shaders', icon: 'shaders', label: 'Shaders', shortcut: 'S' },
  ],
]

export const ToolRail = observer(function ToolRail() {
  return (
    <nav className="w-[42px] shrink-0 border-x border-[#e2e2e2] bg-[#f2f2f2] py-0.5" aria-label="Canvas tools">
      <div className="flex flex-col items-center">
        {toolSections.map((section, sectionIndex) => (
          <div className="flex flex-col items-center" key={section[0].tool}>
            {sectionIndex > 0 && <div className="my-2 h-px w-4 bg-black/10" />}
            {section.map(({ tool, icon, label, shortcut }) => (
              <ToolButton key={tool} icon={icon} label={label} shortcut={shortcut} active={editorStore.viewport.tool === tool} onClick={() => editorStore.viewport.setTool(tool)} />
            ))}
          </div>
        ))}
        <div className="my-2 h-px w-4 bg-black/10" />
        <ToolButton
          icon="ai-edit"
          label="Edit with AI"
          shortcut="L"
          ariaLabel="Edit selection with AI"
          active={editorStore.designDiff.isPromptOpen || editorStore.designDiff.isWorking}
          disabled={!editorStore.designDiff.canOpenPrompt && !editorStore.designDiff.isWorking}
          onClick={editorStore.designDiff.togglePrompt}
        />
      </div>
    </nav>
  )
})
