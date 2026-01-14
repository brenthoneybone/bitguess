import { describe, it, expect } from 'vitest'
import { useArcUtil } from './useArcUtil'

describe('useArcUtil', () => {
  const { generateArc } = useArcUtil()

  /*
   * polarToCartesian(x, y, radius, angleDegrees) logic:
   * angleRadians = ((angleDegrees - 90) * Math.PI) / 180.0
   * x = centerX + radius * Math.cos(angleRadians)
   * y = centerY + radius * Math.sin(angleRadians)
   *
   * At 0 degrees (top):
   * angleRadians = -90 * PI / 180 = -PI/2
   * cos(-PI/2) = 0
   * sin(-PI/2) = -1
   * x = centerX
   * y = centerY - radius
   *
   * At 180 degrees (bottom):
   * angleRadians = 90 * PI / 180 = PI/2
   * cos(PI/2) = 0
   * sin(PI/2) = 1
   * x = centerX
   * y = centerY + radius
   */

  it('generates a valid SVG path for a standard arc', () => {
    // A 90 degree arc from 0 to 90 degrees with radius 10 at (0,0)
    const result = generateArc(0, 0, 10, 0, 90)

    // Expected coordinates:
    // Start (at endAngle=90): 90-90=0rad. cos(0)=1, sin(0)=0. x=0+10*1=10, y=0+10*0=0.
    // End (at startAngle=0): 0-90=-90=-PI/2rad. cos(-PI/2)=0, sin(-PI/2)=-1. x=0, y=-10.

    // largeArcFlag = 90 - 0 <= 180 ? '0' : '1' -> '0'

    // d = M 10 0 A 10 10 0 0 0 0 -10
    // Depending on precision, we might see floating point numbers close to integers.
    expect(result).toMatch(/^M 10 0 A 10 10 0 0 0 0 -10$/)
  })

  it('handles large arcs (> 180 degrees)', () => {
    // A 270 degree arc from 0 to 270 degrees
    const result = generateArc(0, 0, 10, 0, 270)

    // Start (at 270): 270-90=180=PI. x=-10, y=0
    // End (at 0): 0-90=-90. x=0, y=-10
    // largeArcFlag = 270 - 0 = 270 > 180 -> '1'

    expect(result).toContain('A 10 10 0 1 0')
  })

  it('handles full circles (or near full)', () => {
    // 0 to 359.9
    const result = generateArc(100, 100, 50, 0, 359.9)
    // Should have largeArcFlag '1'
    expect(result).toContain('A 50 50 0 1 0')
  })
})
