import type Konva from 'konva'
import { Ellipse, Rect, Shape, Text } from 'react-konva'
import { getLinearGradientPoints, withOpacity } from '../../editor/model/color'
import { getCornerRadii, type CornerRadii } from '../../editor/model/radius'
import { drawSmoothRectanglePath } from '../../editor/model/smoothing'
import type { EditorShape } from '../../editor/model/types'

type SmoothedRectProps = Konva.ShapeConfig & {
  width: number
  height: number
  cornerRadii: CornerRadii
  smoothing: number
}

function SmoothedRect({ width, height, cornerRadii, smoothing, ...props }: SmoothedRectProps) {
  if (smoothing <= 0) return <Rect width={width} height={height} cornerRadius={cornerRadii} {...props} />
  return (
    <Shape
      width={width}
      height={height}
      {...props}
      sceneFunc={(context, node) => {
        drawSmoothRectanglePath(context, width, height, cornerRadii, smoothing)
        context.fillStrokeShape(node)
      }}
    />
  )
}

export function ShapeVisual({ shape }: { shape: EditorShape }) {
  const gradient = getLinearGradientPoints(shape.width, shape.height, shape.fillGradientAngle)
  const paint = shape.fillPresent && shape.fillVisible && shape.fillType === 'gradient'
    ? {
        fillLinearGradientStartPoint: gradient.start,
        fillLinearGradientEndPoint: gradient.end,
        fillLinearGradientColorStops: [0, withOpacity(shape.fillGradientStart, shape.fillOpacity), 1, withOpacity(shape.fillGradientEnd, shape.fillOpacity)],
      }
    : { fill: shape.fillPresent && shape.fillVisible ? withOpacity(shape.fill, shape.fillOpacity) : 'rgba(0, 0, 0, 0)' }
  const shadow = {
    shadowEnabled: shape.shadowPresent && shape.shadowVisible,
    shadowColor: shape.shadowColor,
    shadowOpacity: shape.shadowOpacity,
    shadowOffsetX: shape.shadowX,
    shadowOffsetY: shape.shadowY,
    shadowBlur: Math.max(0, shape.shadowBlur + shape.shadowSpread),
  }
  const border = shape.borderPresent && shape.borderVisible ? {
    stroke: withOpacity(shape.borderColor, shape.borderOpacity),
    strokeWidth: shape.borderWidth,
  } : {}
  const outlineExpansion = Math.max(0, shape.outlineOffset) + shape.outlineWidth / 2
  const outline = shape.outlinePresent && shape.outlineVisible && shape.outlineWidth > 0 ? {
    stroke: withOpacity(shape.outlineColor, shape.outlineOpacity),
    strokeWidth: shape.outlineWidth,
  } : null
  const innerStrokeWidth = Math.max(1, shape.innerShadowBlur + Math.max(0, shape.innerShadowSpread) * 2)
  const innerShadow = shape.innerShadowPresent && shape.innerShadowVisible ? {
    stroke: withOpacity(shape.innerShadowColor, shape.innerShadowOpacity),
    strokeWidth: innerStrokeWidth,
    shadowColor: shape.innerShadowColor,
    shadowOpacity: shape.innerShadowOpacity,
    shadowBlur: shape.innerShadowBlur,
    shadowOffsetX: shape.innerShadowX,
    shadowOffsetY: shape.innerShadowY,
    listening: false,
  } : null

  if (shape.type === 'rectangle') {
    const cornerRadii = getCornerRadii(shape)
    const outlineRadii = cornerRadii.map((radius) => radius + outlineExpansion)
    const innerRadii = cornerRadii.map((radius) => Math.max(0, radius - innerStrokeWidth / 2))
    return (
      <>
        {outline && <SmoothedRect x={-outlineExpansion} y={-outlineExpansion} width={shape.width + outlineExpansion * 2} height={shape.height + outlineExpansion * 2} cornerRadii={outlineRadii as CornerRadii} smoothing={shape.smoothing} {...outline} listening={false} />}
        <SmoothedRect width={shape.width} height={shape.height} cornerRadii={cornerRadii} smoothing={shape.smoothing} {...shadow} {...paint} {...border} />
        {innerShadow && <SmoothedRect x={innerStrokeWidth / 2} y={innerStrokeWidth / 2} width={Math.max(1, shape.width - innerStrokeWidth)} height={Math.max(1, shape.height - innerStrokeWidth)} cornerRadii={innerRadii as CornerRadii} smoothing={shape.smoothing} {...innerShadow} />}
      </>
    )
  }
  if (shape.type === 'ellipse') return (
    <>
      {outline && <Ellipse x={shape.width / 2} y={shape.height / 2} radiusX={shape.width / 2 + outlineExpansion} radiusY={shape.height / 2 + outlineExpansion} {...outline} listening={false} />}
      <Ellipse x={shape.width / 2} y={shape.height / 2} radiusX={shape.width / 2} radiusY={shape.height / 2} {...shadow} {...paint} {...border} />
      {innerShadow && <Ellipse x={shape.width / 2} y={shape.height / 2} radiusX={Math.max(1, shape.width / 2 - innerStrokeWidth / 2)} radiusY={Math.max(1, shape.height / 2 - innerStrokeWidth / 2)} {...innerShadow} />}
    </>
  )
  return (
    <>
      {outline && <Rect x={-outlineExpansion} y={-outlineExpansion} width={shape.width + outlineExpansion * 2} height={shape.height + outlineExpansion * 2} {...outline} listening={false} />}
      <Text width={shape.width} height={shape.height} text={shape.text} fontFamily="system-ui, sans-serif" fontSize={shape.fontSize} fontStyle={shape.fontWeight >= 600 ? 'bold' : 'normal'} align={shape.textAlign} verticalAlign="middle" wrap="word" {...shadow} {...paint} />
      {shape.borderPresent && shape.borderVisible && <Rect width={shape.width} height={shape.height} {...border} listening={false} />}
      {innerShadow && <Rect x={innerStrokeWidth / 2} y={innerStrokeWidth / 2} width={Math.max(1, shape.width - innerStrokeWidth)} height={Math.max(1, shape.height - innerStrokeWidth)} {...innerShadow} />}
    </>
  )
}
