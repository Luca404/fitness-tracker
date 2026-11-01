// Scroll only an application's own panels. Native scrollIntoView also scrolls
// the document and can leave the app header above the viewport after the tour.
export function revealTutorialTarget(element: HTMLElement) {
  for (let panel = element.parentElement; panel && panel !== document.body && panel !== document.documentElement; panel = panel.parentElement) {
    const overflow = getComputedStyle(panel).overflowY
    if (!['auto', 'scroll'].includes(overflow) || panel.scrollHeight <= panel.clientHeight) continue
    const target = element.getBoundingClientRect()
    const bounds = panel.getBoundingClientRect()
    const top = panel.scrollTop + target.top - bounds.top - 12
    panel.scrollTop = Math.max(0, Math.min(top, panel.scrollHeight - panel.clientHeight))
  }
}

export function resetDocumentScroll() {
  const windowScrolled = window.scrollX !== 0 || window.scrollY !== 0
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  if (windowScrolled) window.scrollTo(0, 0)
}
