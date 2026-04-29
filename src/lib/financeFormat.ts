export const formatBrl = (amountCents: number): string => {
  const amount = amountCents / 100
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export const formatDateHuman = (isoDateYYYYMMDD: string): string => {
  // isoDateYYYYMMDD = YYYY-MM-DD
  const [y, m, d] = isoDateYYYYMMDD.split('-').map((x) => Number(x))
  const dt = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(dt)
}

export const getCurrentMonthKey = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

export const formatMonthYear = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map((value) => Number(value))
  const dt = new Date(Date.UTC(year, month - 1, 1))
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dt)
}
