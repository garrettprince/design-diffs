import type Konva from "konva";
import type { CornerRadii } from "./radius";

export const IOS_CORNER_SMOOTHING = 0.6;

export const clampCornerSmoothing = (value: number) =>
  Math.min(1, Math.max(0, value));

export const getCornerShapeCss = (smoothing: number) =>
  `superellipse(${1 + clampCornerSmoothing(smoothing)})`;

const signedPower = (value: number, power: number) =>
  Math.sign(value) * Math.abs(value) ** power;

export function drawSmoothRectanglePath(
  context: Konva.Context,
  width: number,
  height: number,
  radii: CornerRadii,
  smoothing: number,
) {
  const [topLeft, topRight, bottomRight, bottomLeft] = radii;
  const exponent = 2 ** (1 + clampCornerSmoothing(smoothing));
  const curvePower = 2 / exponent;
  const segments = 20;

  const corner = (
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
  ) => {
    if (radius <= 0) {
      context.lineTo(centerX, centerY);
      return;
    }
    for (let index = 1; index <= segments; index += 1) {
      const angle = startAngle + ((Math.PI / 2) * index) / segments;
      context.lineTo(
        centerX + radius * signedPower(Math.cos(angle), curvePower),
        centerY + radius * signedPower(Math.sin(angle), curvePower),
      );
    }
  };

  context.beginPath();
  context.moveTo(topLeft, 0);
  context.lineTo(width - topRight, 0);
  corner(width - topRight, topRight, topRight, -Math.PI / 2);
  context.lineTo(width, height - bottomRight);
  corner(width - bottomRight, height - bottomRight, bottomRight, 0);
  context.lineTo(bottomLeft, height);
  corner(bottomLeft, height - bottomLeft, bottomLeft, Math.PI / 2);
  context.lineTo(0, topLeft);
  corner(topLeft, topLeft, topLeft, Math.PI);
  context.closePath();
}
