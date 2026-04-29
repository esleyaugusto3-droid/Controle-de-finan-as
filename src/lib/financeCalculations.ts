import type { FinanceState, Transaction, TransactionType } from './financeTypes'

export type Totals = {
  incomeCents: number
  expenseCents: number
  piggyBanksCents: number
  balanceCents: number // available = income - expense - cofrinhos
}

export type MonthlyTotals = {
  monthKey: string
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export type TransactionFilter = {
  monthKey?: string
  type?: TransactionType
}

export type CategoryBudgetSummary = {
  categoryId: string
  categoryName: string
  color: string
  monthlyLimitCents: number
  spentCents: number
  remainingCents: number
  usagePercent: number
  isOverBudget: boolean
}

const isInMonth = (dateKey: string, monthKey: string): boolean => dateKey.slice(0, 7) === monthKey

export const getCurrentMonthKey = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

export const filterTransactions = (transactions: Transaction[], filters: TransactionFilter): Transaction[] => {
  return transactions.filter((transaction) => {
    if (filters.monthKey && !isInMonth(transaction.date, filters.monthKey)) return false
    if (filters.type && transaction.type !== filters.type) return false
    return true
  })
}

const getMonthlyCategoryExpenses = (transactions: Transaction[], monthKey: string): Map<string, number> => {
  const expenses = new Map<string, number>()

  for (const transaction of transactions) {
    if (!isInMonth(transaction.date, monthKey)) continue
    if (transaction.type !== 'expense') continue

    expenses.set(transaction.categoryId, (expenses.get(transaction.categoryId) ?? 0) + transaction.amountCents)
  }

  return expenses
}

export const getMonthlyTotals = (state: FinanceState, monthKey: string): MonthlyTotals => {
  let incomeCents = 0
  let expenseCents = 0

  for (const transaction of state.transactions) {
    if (!isInMonth(transaction.date, monthKey)) continue
    if (transaction.type === 'income') incomeCents += transaction.amountCents
    if (transaction.type === 'expense') expenseCents += transaction.amountCents
  }

  return {
    monthKey,
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
  }
}

export const getCategoryBudgetSummaries = (state: FinanceState, monthKey: string): CategoryBudgetSummary[] => {
  const monthExpenses = getMonthlyCategoryExpenses(state.transactions, monthKey)
  const categoriesById = new Map(state.categories.map((category) => [category.id, category] as const))

  return state.categoryBudgets
    .map((budget) => {
      const category = categoriesById.get(budget.categoryId)
      const spentCents = monthExpenses.get(budget.categoryId) ?? 0
      const remainingCents = budget.monthlyLimitCents - spentCents
      const usagePercent = Math.min(100, Math.round((spentCents / budget.monthlyLimitCents) * 100))

      return {
        categoryId: budget.categoryId,
        categoryName: category?.name ?? 'Categoria removida',
        color: category?.color ?? 'rgba(170,59,255,0.6)',
        monthlyLimitCents: budget.monthlyLimitCents,
        spentCents,
        remainingCents,
        usagePercent,
        isOverBudget: remainingCents < 0,
      }
    })
    .sort((a, b) => b.usagePercent - a.usagePercent)
}

export const getTotals = (state: FinanceState): Totals => {
  let incomeCents = 0
  let expenseCents = 0
  let piggyBanksCents = 0

  for (const transaction of state.transactions) {
    if (transaction.type === 'income') incomeCents += transaction.amountCents
    if (transaction.type === 'expense') expenseCents += transaction.amountCents
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
