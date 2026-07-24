import { fontWeights, textAlignments } from '../../../editor/constants/editor-constants'
import type { EditorShape, ShapePatch } from '../../../editor/model/types'
import { cn, propertySection, raisedControl } from '../../../styles/editor-classes'
import { CommitTextarea } from '../../../ui/components/CommitInput'
import { FillInput, NumberInput, SelectInput } from '../../../ui/components/PropertyInput'

export function TypographyControls({ shape, onChange }: { shape: EditorShape; onChange: (patch: ShapePatch) => void }) {
  return (
    <section className={propertySection}>
      <h2 className="text-[12px] leading-[18px] font-medium text-black/80">Typography</h2>
      <label className="my-2 flex flex-col gap-[5px] text-black/60"><span>Content</span><CommitTextarea className={cn('min-h-[58px] w-full resize-y border-0 px-[7px] py-1.5 text-black/80 outline-0', raisedControl)} aria-label="Text content" value={shape.text} onCommit={(text) => onChange({ text })} /></label>
      <div className="mb-2 flex flex-col gap-[5px] text-black/60">
        <span>Color</span>
        <FillInput
          color={shape.fill}
          opacity={shape.fillOpacity}
          labelPrefix="Text"
          onColorChange={(fill) => onChange({ fill, fillType: 'solid', fillGradientStart: fill, fillVisible: true, fillPresent: true })}
          onOpacityChange={(fillOpacity) => onChange({ fillOpacity, fillVisible: true, fillPresent: true })}
        />
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <NumberInput label="Size" value={shape.fontSize} min={1} onChange={(fontSize) => onChange({ fontSize })} />
        <SelectInput label="Weight" value={shape.fontWeight} options={fontWeights} onChange={(fontWeight) => onChange({ fontWeight })} />
      </div>
      <SelectInput label="Align" value={shape.textAlign} options={textAlignments} onChange={(textAlign) => onChange({ textAlign })} />
    </section>
  )
}
