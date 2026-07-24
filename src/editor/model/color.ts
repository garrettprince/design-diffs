export function withOpacity(hex: string, opacity: number) {
  const value = hex.replace('#', '')
  if (!/^[0-9A-Fa-f]{6}$/.test(value)) return hex
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

export type FillPaint = {
  fill: string
  fillType: 'solid' | 'gradient'
  fillGradientStart: string
  fillGradientEnd: string
  fillGradientAngle: number
  fillOpacity: number
  fillVisible: boolean
  fillPresent: boolean
}

export function getFillCss(paint: FillPaint) {
  if (!paint.fillPresent || !paint.fillVisible) return 'transparent'
  
  if (paint.fillType === 'gradient') {
    return `linear-gradient(${paint.fillGradientAngle}deg, ${withOpacity(paint.fillGradientStart, paint.fillOpacity)}, ${withOpacity(paint.fillGradientEnd, paint.fillOpacity)})`
  }
  return withOpacity(paint.fill, paint.fillOpacity)
}

export function getLinearGradientPoints(width: number, height: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  const centerX = width / 2
  const centerY = height / 2
  const halfLength = (Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians))) / 2
  const deltaX = Math.cos(radians) * halfLength
  const deltaY = Math.sin(radians) * halfLength
  return {
    start: { x: centerX - deltaX, y: centerY - deltaY },
    end: { x: centerX + deltaX, y: centerY + deltaY },
  }
}
