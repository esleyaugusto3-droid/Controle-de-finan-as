export type Id = string

export type Category = {
  id: Id
  name: string
  color: string
  createdAt: string // ISO
}

export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: Id
  type: TransactionType
  description: string
  categoryId: Id
  amountCents: number
  date: string // YYYY-MM-DD
  createdAt: string // ISO
}

export type AccountCycle = 'fixed' | 'temporary' | 'one-time'
export type AccountStatus = 'pending' | 'paid'

export type Account = {
  id: Id
  title: string
  amountCents: number
  cycle: AccountCycle
  status: AccountStatus
  categoryId?: Id
  notes?: string
  createdAt: string // ISO
  paidAt?: string // ISO
  dueDate?: string // YYYY-MM-DD | contas temporárias/únicas
  dueDay?: number // 1-31 | contas fixas
}

export type PiggyBank = {
  id: Id
  name: string
  goalCents: number
  currentCents: number
  color: string
  createdAt: string // ISO
  notes?: string
}

export type CategoryBudget = {
  id: Id
  categoryId: Id
  monthlyLimitCents: number
  createdAt: string // ISO
  notes?: string
}

export type FinanceState = {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  piggyBanks: PiggyBank[]
  categoryBudgets: CategoryBudget[]
  currency: 'BRL'
  version: 1
}
