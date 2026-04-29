import { FinanceStateSchema } from './financeSchema'
import type { FinanceState } from './financeTypes'

const STORAGE_KEY = 'controle_financas_state_v1'

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const migrateLegacyAccounts = (state: unknown): unknown => {
  if (!isPlainObject(state)) return state

  const accounts = Array.isArray(state.accounts) ? state.accounts : []
  const piggyBanks = Array.isArray(state.piggyBanks) ? state.piggyBanks : []
  const categoryBudgets = Array.isArray(state.categoryBudgets) ? state.categoryBudgets : []

  return {
    ...state,
    accounts: accounts.map((account) => {
      if (!isPlainObject(account)) return account

      if (account.cycle === 'fixed') {
        if (typeof account.dueDay === 'number') {
          return {
            ...account,
            dueDate: undefined,
          }
        }

        if (typeof account.dueDate === 'string') {
          const dueDate = account.dueDate as string
          const dueDay = Number(dueDate.slice(8, 10))

          if (Number.isInteger(dueDay) && dueDay >= 1 && dueDay <= 31) {
            return {
              ...account,
              dueDay,
              dueDate: undefined,
            }
          }
        }
      }

      return account
    }),
    piggyBanks,
    categoryBudgets,
  }
}

export const defaultFinanceState = (): FinanceState => ({
  accounts: [],
  categories: [],
  transactions: [],
  piggyBanks: [],
  categoryBudgets: [],
  currency: 'BRL',
  version: 1,
})

export const loadFinanceState = (): FinanceState => {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultFinanceState()

  try {
    const parsed = JSON.parse(raw) as unknown
    const direct = FinanceStateSchema.safeParse(parsed)
    if (direct.success) return direct.data

    const migrated = migrateLegacyAccounts(parsed)
    const migratedWithBudgets = isPlainObject(migrated)
      ? {
          ...migrated,
          categoryBudgets: Array.isArray(migrated.categoryBudgets) ? migrated.categoryBudgets : [],
        }
      : migrated

    const migratedResult = FinanceStateSchema.safeParse(migratedWithBudgets)
    if (migratedResult.success) return migratedResult.data

    return defaultFinanceState()
  } catch {
    return defaultFinanceState()
  }
}

export const saveFinanceState = (state: FinanceState): void => {
  const result = FinanceStateSchema.safeParse(state)
  if (!result.success) {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data))
}
