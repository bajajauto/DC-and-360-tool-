// Keep rendering sequential: each report can contain many large page images.
export async function prepareReportArchive(reports, render, onProgress = () => {}, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  const entries = []
  const failures = []
  for (const report of reports) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      onProgress({ completed: entries.length, total: reports.length, participantName: report.participantName, attempt })
      try {
        const { data, fileName } = await render(report)
        if (!data?.byteLength) throw new Error('The rendered PDF was empty.')
        entries.push({ name: fileName, data })
        lastError = null
        break
      } catch (error) {
        lastError = error
        if (attempt < 3) await pause(attempt * 1000)
      }
    }
    if (lastError) failures.push(`${report.participantName} (${report.reportType.toUpperCase()}): ${lastError.message || 'Browser could not render the report'}`)
    onProgress({ completed: entries.length, total: reports.length, participantName: report.participantName })
  }
  return { entries, failures }
}
