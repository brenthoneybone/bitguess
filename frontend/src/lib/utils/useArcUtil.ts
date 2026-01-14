function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180.0

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  }
}

function f(n: number) {
  // Fix precision to avoid scientific notation like 6.123e-16
  // and limit decimal places for smaller SVG size
  return Number(n.toFixed(4))
}

function generateArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle)
  const end = polarToCartesian(x, y, radius, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  const d = [
    'M',
    f(start.x),
    f(start.y),
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    f(end.x),
    f(end.y),
  ].join(' ')

  return d
}

export const useArcUtil = () => ({
  generateArc,
})
