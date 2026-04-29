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
