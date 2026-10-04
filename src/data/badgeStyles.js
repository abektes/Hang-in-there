// Each surface carries the accent printed on the badge (week label, rule), the
// lanyard it ships with, and flat colors for previews without WebGL.
export const SURFACES = [
  { id: 'contour', label: 'Contour', accent: '#FF6C00', lanyard: '#FF6C00', flat: ['#0b0a10', 'rgba(255, 108, 0, 0.3)'] },
  { id: 'chromium', label: 'Chromium', accent: '#C5D0DC', lanyard: '#AEB5BE', flat: ['#0c0e12', 'rgba(150, 170, 190, 0.2)'] },
  { id: 'volt', label: 'Volt', accent: '#5CFF9A', lanyard: '#14B88E', flat: ['#07110c', 'rgba(40, 230, 110, 0.28)'] },
  { id: 'halftone', label: 'Halftone', accent: '#FF5A8C', lanyard: '#FF3D7F', flat: ['#0d0b0d', 'rgba(255, 61, 127, 0.3)'] },
  { id: 'chrome', label: 'Liquid chrome', accent: '#C9D1DB', lanyard: '#AEB5BE', flat: ['#0c0d10', 'rgba(200, 210, 225, 0.22)'] },
  { id: 'interference', label: 'Interference', accent: '#7D97FF', lanyard: '#2F5BFF', flat: ['#05070f', 'rgba(47, 91, 255, 0.32)'] },
  { id: 'dusk', label: 'Dusk', accent: '#FF9A4D', lanyard: '#C2357A', flat: ['#0d0718', 'rgba(194, 53, 122, 0.34)'] },
  { id: 'ripple', label: 'Ripple', accent: '#2EE6D6', lanyard: '#14B88E', flat: ['#061416', 'rgba(46, 230, 214, 0.28)'] },
  { id: 'blueprint', label: 'Blueprint', accent: '#4CC3FF', lanyard: '#2F5BFF', flat: ['#071018', 'rgba(76, 195, 255, 0.28)'] },
  { id: 'marble', label: 'Marble', accent: '#D5D2CC', lanyard: '#8A8884', flat: ['#161514', 'rgba(180, 176, 168, 0.18)'] },
  { id: 'prism', label: 'Prism', accent: '#C9A6FF', lanyard: '#7A4DFF', flat: ['#0c0814', 'rgba(201, 166, 255, 0.3)'] },
]

export const LANYARDS = [
  { id: 'match', label: 'Match surface' },
  { id: 'orange', label: 'Orange', color: '#FF6C00' },
  { id: 'black', label: 'Black', color: '#1E1D21' },
  { id: 'white', label: 'White', color: '#ECE8E1' },
  { id: 'mint', label: 'Mint', color: '#14B88E' },
  { id: 'pink', label: 'Pink', color: '#FF3D7F' },
  { id: 'cobalt', label: 'Cobalt', color: '#2F5BFF' },
  { id: 'silver', label: 'Silver', color: '#AEB5BE' },
  { id: 'magenta', label: 'Magenta', color: '#C2357A' },
]

export function getSurface(id) {
  return SURFACES.find((surface) => surface.id === id) ?? SURFACES[0]
}

export function lanyardColor(lanyardId, surfaceId) {
  return LANYARDS.find((lanyard) => lanyard.id === lanyardId)?.color ?? getSurface(surfaceId).lanyard
}
