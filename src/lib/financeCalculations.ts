import type { FinanceState } from './financeTypes'

export type Totals = {
  incomeCents: number
  expenseCents: number
  piggyBanksCents: number
  balanceCents: number // available = income - expense - cofrinhos
}

export const getTotals = (state: FinanceState): Totals => {
  let incomeCents = 0
  let expenseCents = 0
  let piggyBanksCents = 0

  for (const t of state.transactions) {
    if (t.type === 'income') incomeCents += t.amountCents
    if (t.type === 'expense') expenseCents += t.amountCents
  }

  for (const piggyBank of state.piggyBanks) {
    piggyBanksCents += piggyBank.currentCents
  }

  return {
    incomeCents,
    expenseCents,
    piggyBanksCents,
    balanceCents: incomeCents - expenseCents - piggyBanksCents,
  }
}
