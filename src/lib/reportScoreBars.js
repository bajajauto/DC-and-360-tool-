// Finalize even older stored previews that animate their score bars.
export function finalizeReportScoreBars(previewDocument) {
  for (const bar of previewDocument.querySelectorAll('.barfill[data-score-token]')) {
    const token = bar.getAttribute('data-score-token')
    const source = [...previewDocument.querySelectorAll('.tok[data-token]')]
      .find((element) => element.getAttribute('data-token') === token)
    let score = parseFloat(bar.getAttribute('data-value'))
    if (Number.isNaN(score)) score = parseFloat(source?.textContent?.trim())
    const fraction = Number.isFinite(score) ? Math.max(0, Math.min(1, score / 4)) : 0
    const width = parseFloat(bar.style.maxWidth) || 0
    bar.style.setProperty('transition', 'none', 'important')
    bar.style.setProperty('width', `${(fraction * width).toFixed(1)}px`, 'important')
  }
}
