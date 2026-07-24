import { memo } from 'react'
import { Layer, Line } from 'react-konva'

type PixelGridBounds = {
  left: number
  right: number
  top: number
  bottom: number
}

export const PixelGridLayer = memo(function PixelGridLayer({ left, right, top, bottom }: PixelGridBounds) {
  return (
    <Layer listening={false}>
      {Array.from({ length: right - left + 1 }, (_, index) => left + index).map((x) => (
        <Line key={`pixel-grid-x-${x}`} points={[x, top, x, bottom]} stroke="#000000" strokeWidth={1} opacity={0.1} strokeScaleEnabled={false} perfectDrawEnabled={false} listening={false} />
      ))}
      {Array.from({ length: bottom - top + 1 }, (_, index) => top + index).map((y) => (
        <Line key={`pixel-grid-y-${y}`} points={[left, y, right, y]} stroke="#000000" strokeWidth={1} opacity={0.1} strokeScaleEnabled={false} perfectDrawEnabled={false} listening={false} />
      ))}
    </Layer>
  )
})
