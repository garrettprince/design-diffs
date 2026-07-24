import type Konva from 'konva'
import type { Box } from 'konva/lib/shapes/Transformer'
import type { RefObject } from 'react'
import { Transformer } from 'react-konva'

type CanvasSelectionTransformerProps = {
  transformerRef: RefObject<Konva.Transformer | null>
  enabled: boolean
}

const preserveMinimumSize = (oldBox: Box, newBox: Box) => (
  Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12 ? oldBox : newBox
)

export function CanvasSelectionTransformer({ transformerRef, enabled }: CanvasSelectionTransformerProps) {
  return (
    <Transformer
      ref={transformerRef}
      resizeEnabled={enabled}
      rotateEnabled={enabled}
      flipEnabled={false}
      listening={enabled}
      padding={0}
      borderStroke="#1677FF"
      borderStrokeWidth={1}
      anchorFill="#FFFFFF"
      anchorStroke="#1677FF"
      anchorStrokeWidth={1}
      anchorSize={7}
      rotateAnchorOffset={24}
      keepRatio={false}
      boundBoxFunc={preserveMinimumSize}
    />
  )
}
