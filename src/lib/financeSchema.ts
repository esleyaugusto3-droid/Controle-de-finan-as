import { z } from 'zod'
import type {
  AccountCycle,
  AccountStatus,
  Category,
  CategoryBudget,
  FinanceState,
  Id,
  PiggyBank,
  Transaction,
  TransactionType,
} from './financeTypes'

const IdSchema = z.string().min(1) as z.ZodType<Id>

const DateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const DueDaySchema = z.number().int().min(1).max(31)

const AccountCycleSchema = z.enum(['fixed', 'temporary', 'one-time']) as z.ZodType<AccountCycle>
const AccountStatusSchema = z.enum(['pending', 'paid']) as z.ZodType<AccountStatus>

export const CategorySchema: z.ZodType<Category> = z.object({
  id: IdSchema,
  name: z.string().min(1),
  color: z.string().min(1),
  createdAt: z.string().datetime(),
})

export const TransactionSchema: z.ZodType<Transaction> = z.object({
  id: IdSchema,
  type: z.enum(['income', 'expense']) as z.ZodType<TransactionType>,
  description: z.string().min(1),
  categoryId: IdSchema,
  amountCents: z.number().int(),
  date: DateKeySchema,
  createdAt: z.string().datetime(),
})

export const PiggyBankSchema: z.ZodType<PiggyBank> = z.object({
  id: IdSchema,
  name: z.string().min(1),
  goalCents: z.number().int().positive(),
  currentCents: z.number().int().min(0),
  color: z.string().min(1),
  createdAt: z.string().datetime(),
  notes: z.string().optional(),
})

export const CategoryBudgetSchema: z.ZodType<CategoryBudget> = z.object({
  id: IdSchema,
  categoryId: IdSchema,
  monthlyLimitCents: z.number().int().positive(),
  createdAt: z.string().datetime(),
  notes: z.string().optional(),
})

export const AccountSchema = z
  .object({
    id: IdSchema,
    title: z.string().min(1),
    amountCents: z.number().int(),
    cycle: AccountCycleSchema,
    status: AccountStatusSchema,
    categoryId: IdSchema.optional(),
    notes: z.string().optional(),
    createdAt: z.string().datetime(),
    paidAt: z.string().datetime().optional(),
    dueDate: DateKeySchema.optional(),
    dueDay: DueDaySchema.optional(),
  })
  .superRefine((account, ctx) => {
    if (account.cycle === 'fixed') {
      if (account.dueDay === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Contas fixas precisam de dueDay.',
          path: ['dueDay'],
        })
      }
      return
    }

    if (!account.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Contas temporárias/únicas precisam de dueDate.',
        path: ['dueDate'],
      })
    }
  }) as unknown as z.ZodType<FinanceState['accounts'][number]>

export const FinanceStateSchema: z.ZodType<FinanceState> = z.object({
  accounts: z.array(AccountSchema),
  categories: z.array(CategorySchema),
  transactions: z.array(TransactionSchema),
  piggyBanks: z.array(PiggyBankSchema),
  categoryBudgets: z.array(CategoryBudgetSchema),
  currency: z.literal('BRL'),
  version: z.literal(1),
})
