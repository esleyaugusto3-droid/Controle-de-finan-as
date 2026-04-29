import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { FinanceStateSchema } from '../lib/financeSchema'
import { loadFinanceState, saveFinanceState } from '../lib/financeStorage'
import type {
  Account,
  AccountCycle,
  AccountStatus,
  Category,
  CategoryBudget,
  FinanceState,
  Id,
  PiggyBank,
  Transaction,
  TransactionType,
} from '../lib/financeTypes'

type FinanceStore = {
  state: FinanceState
  isHydrated: boolean
  addCategory: (input: { name: string; color: string }) => void
  deleteCategory: (categoryId: Id) => void
  addTransaction: (input: {
    type: TransactionType
    description: string
    categoryId: Id
    amountCents: number
    date: string // YYYY-MM-DD
  }) => void
  deleteTransaction: (transactionId: Id) => void
  addAccount: (input: {
    title: string
    amountCents: number
    dueDate?: string // YYYY-MM-DD
    dueDay?: number // 1-31
    cycle: AccountCycle
    categoryId?: Id
    notes?: string
  }) => void
  deleteAccount: (accountId: Id) => void
  setAccountStatus: (accountId: Id, status: AccountStatus) => void
  addPiggyBank: (input: {
    name: string
    goalCents: number
    currentCents?: number
    color: string
    notes?: string
  }) => void
  addPiggyBankContribution: (piggyBankId: Id, amountCents: number) => void
  withdrawPiggyBankAmount: (piggyBankId: Id, amountCents: number) => void
  deletePiggyBank: (piggyBankId: Id) => void
  addCategoryBudget: (input: {
    categoryId: Id
    monthlyLimitCents: number
    notes?: string
  }) => void
  deleteCategoryBudget: (categoryId: Id) => void
  importState: (next: unknown) => { ok: true } | { ok: false; reason: string }
  resetAll: () => void
}

const FinanceStoreContext = createContext<FinanceStore | null>(null)

const generateId = (): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const nowIso = (): string => new Date().toISOString()

const isValidDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const FinanceStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FinanceState>(() => loadFinanceState())
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setState(loadFinanceState())
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    saveFinanceState(state)
  }, [isHydrated, state])

  const actions = useMemo<FinanceStore>(() => {
    const addCategory: FinanceStore['addCategory'] = ({ name, color }) => {
      const trimmedName = name.trim()
      const trimmedColor = color.trim()
      if (!trimmedName || !trimmedColor) return

      const newCategory: Category = {
        id: generateId(),
        name: trimmedName,
        color: trimmedColor,
        createdAt: nowIso(),
      }

      setState((prev) => ({
        ...prev,
        categories: [newCategory, ...prev.categories],
      }))
    }

    const deleteCategory: FinanceStore['deleteCategory'] = (categoryId) => {
      setState((prev) => {
        const remainingCategories = prev.categories.filter((c) => c.id !== categoryId)
        const remainingTransactions = prev.transactions.filter((t) => t.categoryId !== categoryId)
        const remainingBudgets = prev.categoryBudgets.filter((budget) => budget.categoryId !== categoryId)
        const updatedAccounts = prev.accounts.map((account) =>
          account.categoryId === categoryId ? { ...account, categoryId: undefined } : account,
        )

        return {
          ...prev,
          categories: remainingCategories,
          transactions: remainingTransactions,
          categoryBudgets: remainingBudgets,
          accounts: updatedAccounts,
        }
      })
    }

    const addTransaction: FinanceStore['addTransaction'] = ({ type, description, categoryId, amountCents, date }) => {
      const trimmedDescription = description.trim()
      if (!trimmedDescription) return
      if (!categoryId) return
      if (!Number.isInteger(amountCents) || amountCents === 0) return
      if (!isValidDate(date)) return

      const newTx: Transaction = {
        id: generateId(),
        type,
        description: trimmedDescription,
        categoryId,
        amountCents,
        date,
        createdAt: nowIso(),
      }

      setState((prev) => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
      }))
    }

    const deleteTransaction: FinanceStore['deleteTransaction'] = (transactionId) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== transactionId),
      }))
    }

    const addAccount: FinanceStore['addAccount'] = ({ title, amountCents, dueDate, dueDay, cycle, categoryId, notes }) => {
      const trimmedTitle = title.trim()
      const trimmedNotes = notes?.trim()
      if (!trimmedTitle) return
      if (!Number.isInteger(amountCents) || amountCents <= 0) return

      if (categoryId === '') categoryId = undefined

      if (cycle === 'fixed') {
        if (typeof dueDay !== 'number' || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return

        const newAccount: Account = {
          id: generateId(),
          title: trimmedTitle,
          amountCents,
          cycle,
          status: 'pending',
          categoryId,
          notes: trimmedNotes || undefined,
          createdAt: nowIso(),
          paidAt: undefined,
          dueDate: undefined,
          dueDay,
        }

        setState((prev) => ({
          ...prev,
          accounts: [newAccount, ...prev.accounts],
        }))
        return
      }

      if (!dueDate || !isValidDate(dueDate)) {
        return
      }

      const newAccount: Account = {
        id: generateId(),
        title: trimmedTitle,
        amountCents,
        cycle,
        status: 'pending',
        categoryId,
        notes: trimmedNotes || undefined,
        createdAt: nowIso(),
        paidAt: undefined,
        dueDate,
        dueDay: undefined,
      }

      setState((prev) => ({
        ...prev,
        accounts: [newAccount, ...prev.accounts],
      }))
    }

    const deleteAccount: FinanceStore['deleteAccount'] = (accountId) => {
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((account) => account.id !== accountId),
      }))
    }

    const setAccountStatus: FinanceStore['setAccountStatus'] = (accountId, status) => {
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((account) => {
          if (account.id !== accountId) return account

          return {
            ...account,
            status,
            paidAt: status === 'paid' ? account.paidAt ?? nowIso() : undefined,
          }
        }),
      }))
    }

    const addPiggyBank: FinanceStore['addPiggyBank'] = ({ name, goalCents, currentCents, color, notes }) => {
      const trimmedName = name.trim()
      const trimmedColor = color.trim()
      const trimmedNotes = notes?.trim()

      if (!trimmedName) return
      if (!Number.isInteger(goalCents) || goalCents <= 0) return
      if (currentCents !== undefined && (!Number.isInteger(currentCents) || currentCents < 0)) return
      if (!trimmedColor) return

      const newPiggyBank: PiggyBank = {
        id: generateId(),
        name: trimmedName,
        goalCents,
        currentCents: currentCents ?? 0,
        color: trimmedColor,
        createdAt: nowIso(),
        notes: trimmedNotes || undefined,
      }

      setState((prev) => ({
        ...prev,
        piggyBanks: [newPiggyBank, ...prev.piggyBanks],
      }))
    }

    const addPiggyBankContribution: FinanceStore['addPiggyBankContribution'] = (piggyBankId, amountCents) => {
      if (!Number.isInteger(amountCents) || amountCents <= 0) return

      setState((prev) => ({
        ...prev,
        piggyBanks: prev.piggyBanks.map((piggyBank) =>
          piggyBank.id === piggyBankId
            ? {
                ...piggyBank,
                currentCents: piggyBank.currentCents + amountCents,
              }
            : piggyBank,
        ),
      }))
    }

    const withdrawPiggyBankAmount: FinanceStore['withdrawPiggyBankAmount'] = (piggyBankId, amountCents) => {
      if (!Number.isInteger(amountCents) || amountCents <= 0) return

      setState((prev) => ({
        ...prev,
        piggyBanks: prev.piggyBanks.map((piggyBank) =>
          piggyBank.id === piggyBankId
            ? {
                ...piggyBank,
                currentCents: Math.max(0, piggyBank.currentCents - amountCents),
              }
            : piggyBank,
        ),
      }))
    }

    const deletePiggyBank: FinanceStore['deletePiggyBank'] = (piggyBankId) => {
      setState((prev) => ({
        ...prev,
        piggyBanks: prev.piggyBanks.filter((piggyBank) => piggyBank.id !== piggyBankId),
      }))
    }

    const addCategoryBudget: FinanceStore['addCategoryBudget'] = ({ categoryId, monthlyLimitCents, notes }) => {
      if (!Number.isInteger(monthlyLimitCents) || monthlyLimitCents <= 0) return

      setState((prev) => {
        const exists = prev.categoryBudgets.find((budget) => budget.categoryId === categoryId)
        const nextBudgets = prev.categoryBudgets.filter((budget) => budget.categoryId !== categoryId)
        const nextBudget: CategoryBudget = {
          id: exists?.id ?? generateId(),
          categoryId,
          monthlyLimitCents,
          createdAt: exists?.createdAt ?? nowIso(),
          notes: notes?.trim() || undefined,
        }

        return {
          ...prev,
          categoryBudgets: [nextBudget, ...nextBudgets],
        }
      })
    }

    const deleteCategoryBudget: FinanceStore['deleteCategoryBudget'] = (categoryId) => {
      setState((prev) => ({
        ...prev,
        categoryBudgets: prev.categoryBudgets.filter((budget) => budget.categoryId !== categoryId),
      }))
    }

    const importState: FinanceStore['importState'] = (next) => {
      const direct = FinanceStateSchema.safeParse(next)
      if (direct.success) {
        setState(direct.data)
        return { ok: true }
      }

      const migrated = isPlainObject(next)
        ? {
            ...next,
            piggyBanks: Array.isArray(next.piggyBanks) ? next.piggyBanks : [],
          }
        : next

      const migratedResult = FinanceStateSchema.safeParse(migrated)
      if (!migratedResult.success) {
        return { ok: false, reason: 'JSON inválido para o formato do backup.' }
      }

      setState(migratedResult.data)
      return { ok: true }
    }

    const resetAll: FinanceStore['resetAll'] = () => {
      setState({
        accounts: [],
        categories: [],
        transactions: [],
        piggyBanks: [],
        categoryBudgets: [],
        currency: 'BRL',
        version: 1,
      })
    }

    return {
      state,
      isHydrated,
      addCategory,
      deleteCategory,
      addTransaction,
      deleteTransaction,
      addAccount,
      deleteAccount,
      setAccountStatus,
      addPiggyBank,
      addPiggyBankContribution,
      withdrawPiggyBankAmount,
      deletePiggyBank,
      addCategoryBudget,
      deleteCategoryBudget,
      importState,
      resetAll,
    }
  }, [isHydrated, state])

  return <FinanceStoreContext.Provider value={actions}>{children}</FinanceStoreContext.Provider>
}

export const useFinanceStore = (): FinanceStore => {
  const ctx = useContext(FinanceStoreContext)
  if (!ctx) throw new Error('useFinanceStore deve ser usado dentro de FinanceStoreProvider')
  return ctx
}
