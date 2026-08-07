export function formatDateOfJoining(value) {
  if (value === null || value === undefined || value === '') return ''
  const text = String(value).trim()
  const dayFirst = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/)
  if (dayFirst) return `${dayFirst[1].padStart(2, '0')}/${dayFirst[2].padStart(2, '0')}/${dayFirst[3]}`
  const yearFirst = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (yearFirst) return `${yearFirst[3].padStart(2, '0')}/${yearFirst[2].padStart(2, '0')}/${yearFirst[1]}`

  const excelSerial = Number(value)
  if (Number.isFinite(excelSerial) && excelSerial > 20_000 && excelSerial < 100_000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(excelSerial) * 86_400_000)
    return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date)
}
