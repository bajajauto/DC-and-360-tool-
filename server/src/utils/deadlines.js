const IST_OFFSET_MINUTES = 5 * 60 + 30

export function endOfDeadlineDayIst(value) {
  if (!value) return null
  const deadline = new Date(value)
  if (Number.isNaN(deadline.getTime())) return null

  return new Date(Date.UTC(
    deadline.getUTCFullYear(),
    deadline.getUTCMonth(),
    deadline.getUTCDate(),
    23,
    59 - IST_OFFSET_MINUTES,
    59,
    999,
  ))
}

export function hasDeadlinePassed(value, now = new Date()) {
  const endOfDay = endOfDeadlineDayIst(value)
  return endOfDay ? now > endOfDay : false
}
