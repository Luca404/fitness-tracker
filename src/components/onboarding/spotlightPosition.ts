export interface SpotlightRect { top: number; left: number; width: number; height: number }

export function spotlightPosition(target: SpotlightRect, viewport: { width: number; height: number }, cardHeight: number) {
  const margin = 16
  const gap = 18
  const width = Math.min(360, viewport.width - margin * 2)
  const height = Math.min(cardHeight, viewport.height - margin * 2)
  const below = target.top + target.height + gap
  const above = target.top - height - gap
  let left = Math.max(margin, Math.min(target.left, viewport.width - width - margin))
  let top: number
  if (viewport.width >= 720 && target.left + target.width + gap + width <= viewport.width - margin) {
    left = target.left + target.width + gap
    top = target.top + target.height / 2 - height / 2
  } else if (viewport.width >= 720 && target.left - gap - width >= margin) {
    left = target.left - gap - width
    top = target.top + target.height / 2 - height / 2
  } else if (below + height <= viewport.height - margin) {
    top = below
  } else if (above >= margin) {
    top = above
  } else {
    top = target.top + target.height / 2 > viewport.height / 2 ? margin : viewport.height - height - margin
  }
  if (viewport.width < 720) left = (viewport.width - width) / 2
  return { left, top: Math.max(margin, Math.min(top, viewport.height - height - margin)), width }
}

export function spotlightCardHeight(target: SpotlightRect, viewport: { width: number; height: number }) {
  const width = Math.min(360, viewport.width - 32)
  const beside = viewport.width >= 720 && (target.left + target.width + width + 34 <= viewport.width
    || target.left - width - 18 >= 16)
  if (beside) return viewport.height - 32
  return Math.min(viewport.height - 32, Math.max(260, target.top - 34,
    viewport.height - target.top - target.height - 34))
}
