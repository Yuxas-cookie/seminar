/**
 * Calculate the luminance of a color
 * @param hex - Hex color code
 * @returns Luminance value between 0 and 1
 */
export function getLuminance(hex: string): number {
  // Remove # if present
  const color = hex.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(color.substr(0, 2), 16) / 255
  const g = parseInt(color.substr(2, 2), 16) / 255
  const b = parseInt(color.substr(4, 2), 16) / 255
  
  // Calculate relative luminance
  const sRGB = [r, g, b].map(value => {
    if (value <= 0.03928) {
      return value / 12.92
    }
    return Math.pow((value + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]
}

/**
 * Determine if text should be white or black based on background color
 * @param bgColor - Background color in hex format
 * @returns 'white' or 'black'
 */
export function getContrastTextColor(bgColor: string): string {
  const luminance = getLuminance(bgColor)
  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff'
}

/**
 * Get a slightly darker shade of a color for borders
 * @param hex - Hex color code
 * @returns Darker hex color
 */
export function getDarkerShade(hex: string): string {
  const color = hex.replace('#', '')
  const r = Math.max(0, parseInt(color.substr(0, 2), 16) - 30)
  const g = Math.max(0, parseInt(color.substr(2, 2), 16) - 30)
  const b = Math.max(0, parseInt(color.substr(4, 2), 16) - 30)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Adjust color brightness
 * @param hex - Hex color code
 * @param percent - Percentage to adjust (-100 to 100, negative for darker, positive for brighter)
 * @returns Adjusted hex color
 */
export function adjustBrightness(hex: string, percent: number): string {
  const color = hex.replace('#', '')
  const num = parseInt(color, 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  
  return '#' + (0x1000000 + Math.max(0, Math.min(255, R)) * 0x10000 +
    Math.max(0, Math.min(255, G)) * 0x100 +
    Math.max(0, Math.min(255, B))).toString(16).slice(1)
}

/**
 * Apply brightness adjustment based on participant count
 * @param color - Base color
 * @param hasParticipants - Whether there are participants
 * @returns Adjusted color (bright if participants, dark if none)
 */
export function applyParticipantBrightness(color: string, hasParticipants: boolean): string {
  return hasParticipants ? adjustBrightness(color, 20) : adjustBrightness(color, -50)
}