import { Scan } from 'lucide-react'
import type { CSSProperties } from 'react'
import { cornerRadiusKeys, getCornerRadiusMaximum, type CornerRadiusKey } from '../../../editor/model/radius'
import { IOS_CORNER_SMOOTHING } from '../../../editor/model/smoothing'
import type { EditorShape, ShapePatch } from '../../../editor/model/types'
import { cn, iconAction, propertySection, raisedControl, subtlePress } from '../../../styles/editor-classes'
import { CommitInput } from '../../../ui/components/CommitInput'
import { NumberInput } from '../../../ui/components/PropertyInput'

const cornerLabels: Record<CornerRadiusKey, string> = {
  radiusTopLeft: 'Top left radius',
  radiusTopRight: 'Top right radius',
  radiusBottomRight: 'Bottom right radius',
  radiusBottomLeft: 'Bottom left radius',
}

const cornerIconClasses: Record<CornerRadiusKey, string> = {
  radiusTopLeft: 'border-t border-l rounded-tl-[3px]',
  radiusTopRight: 'border-t border-r rounded-tr-[3px]',
  radiusBottomRight: 'border-r border-b rounded-br-[3px]',
  radiusBottomLeft: 'border-b border-l rounded-bl-[3px]',
}

export function RectangleCornerControls({ shape, onChange }: { shape: EditorShape; onChange: (patch: ShapePatch) => void }) {
  const radiusMaximum = Math.max(1, getCornerRadiusMaximum(shape))
  const radiusProgress = Math.min(100, Math.max(0, shape.radius / radiusMaximum * 100))
  const smoothingProgress = Math.round(shape.smoothing * 100)

  const toggleIndependentCorners = () => {
    if (shape.independentCorners) {
      onChange({ independentCorners: false, radius: shape.radiusTopLeft })
      return
    }
    onChange({
      independentCorners: true,
      radiusTopLeft: shape.radius,
      radiusTopRight: shape.radius,
      radiusBottomRight: shape.radius,
      radiusBottomLeft: shape.radius,
    })
  }

  const updateCornerRadius = (corner: CornerRadiusKey, draft: string) => {
    const value = Number(draft)
    if (!Number.isFinite(value)) return false
    onChange({ [corner]: Math.min(radiusMaximum, Math.max(0, value)) })
  }

  return (
    <>
      <section className={propertySection}>
        <div className="mb-[9px] flex h-5 items-center justify-between">
          <h2 className="text-[12px] leading-[18px] font-medium text-black/80">Radius</h2>
          <button type="button" className={cn(iconAction, shape.independentCorners && 'bg-black/[0.055] text-black')} aria-label="Edit individual corner radii" aria-pressed={shape.independentCorners} onClick={toggleIndependentCorners}><Scan aria-hidden="true" size={15} strokeWidth={1.35} /></button>
        </div>
        {shape.independentCorners ? (
          <div className={cn('grid h-6 grid-cols-4 overflow-hidden', raisedControl)}>
            {cornerRadiusKeys.map((corner, index) => (
              <label className={cn('flex min-w-0 items-center gap-1 px-1.5 text-black/35', index < cornerRadiusKeys.length - 1 && 'border-r border-[#e2e2e2]')} key={corner}>
                <span className={cn('size-3 shrink-0 border-black/35', cornerIconClasses[corner])} aria-hidden="true" />
                <CommitInput className="min-w-0 w-full border-0 bg-transparent p-0 text-right text-black/80 outline-0" aria-label={cornerLabels[corner]} type="number" min="0" max={radiusMaximum} value={shape[corner]} onCommit={(draft) => updateCornerRadius(corner, draft)} />
              </label>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_80px] items-center gap-2">
            <input className="paper-radius-slider h-[26px] min-w-0 appearance-none bg-transparent" style={{ '--range-progress': `${radiusProgress}%` } as CSSProperties} aria-label="Radius slider" type="range" min="0" max={radiusMaximum} value={shape.radius} onChange={(event) => onChange({ radius: Number(event.target.value) })} />
            <NumberInput label="" value={shape.radius} min={0} max={radiusMaximum} onChange={(radius) => onChange({ radius })} />
          </div>
        )}
      </section>
      <section className={propertySection}>
        <div className="mb-[9px] flex h-5 items-center justify-between">
          <h2 className="text-[12px] leading-[18px] font-medium text-black/80">Smoothing</h2>
          <button type="button" className={cn('h-5 border-0 px-1.5 text-[11px]', raisedControl, subtlePress)} aria-label="Set iOS corner smoothing" onClick={() => onChange({ smoothing: IOS_CORNER_SMOOTHING })}>iOS</button>
        </div>
        <div className="grid grid-cols-[1fr_80px] items-center gap-2">
          <input className="paper-radius-slider h-[26px] min-w-0 appearance-none bg-transparent" style={{ '--range-progress': `${smoothingProgress}%` } as CSSProperties} aria-label="Smoothing slider" type="range" min="0" max="100" value={smoothingProgress} onChange={(event) => onChange({ smoothing: Number(event.target.value) / 100 })} />
          <NumberInput label="" value={smoothingProgress} min={0} max={100} suffix="%" onChange={(smoothing) => onChange({ smoothing: smoothing / 100 })} />
        </div>
        <p className="sr-only">Smoothing changes the corner curve and only has a visible effect when radius is greater than zero.</p>
      </section>
    </>
  )
}
