import { useMemo, useState, type FormEvent } from 'react'
import { Card } from '../components/ui/Card'
import { useFinanceStore } from '../state/financeStore'
import { formatBrl, formatMonthYear } from '../lib/financeFormat'
import { getCategoryBudgetSummaries, getCurrentMonthKey } from '../lib/financeCalculations'

const pickCategoryUsage = (categoryId: string, transactions: Array<{ categoryId: string }>): number => {
  let count = 0
  for (const transaction of transactions) if (transaction.categoryId === categoryId) count += 1
  return count
}

const parseMoneyInput = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) return null

  return Math.round(amount * 100)
}

const buildMonthOptions = (): string[] => {
  const now = new Date()
  const options: string[] = []

  for (let offset = 0; offset < 12; offset += 1) {
    const dt = new Date(Date.UTC(now.getFullYear(), now.getMonth() - offset, 1))
    const yyyy = dt.getUTCFullYear()
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    options.push(`${yyyy}-${mm}`)
  }

  return options
}

export function CategoriesPage() {
  const { state, addCategory, deleteCategory, addCategoryBudget, deleteCategoryBudget } = useFinanceStore()

  const categories = state.categories

  const [name, setName] = useState('')
  const [color, setColor] = useState('#aa3bff')
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')
  const [budgetNotes, setBudgetNotes] = useState('')
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())

  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const budgetSummaries = useMemo(() => getCategoryBudgetSummaries(state, monthKey), [state, monthKey])

  const budgetStats = useMemo(() => {
    let totalLimitCents = 0
    let totalSpentCents = 0
    let overBudgetCount = 0

    for (const budget of budgetSummaries) {
      totalLimitCents += budget.monthlyLimitCents
      totalSpentCents += budget.spentCents
      if (budget.isOverBudget) overBudgetCount += 1
    }

    return {
      totalLimitCents,
      totalSpentCents,
      remainingCents: totalLimitCents - totalSpentCents,
      overBudgetCount,
      budgetCount: budgetSummaries.length,
    }
  }, [budgetSummaries])

  const isCategoryValid = useMemo(() => {
    return name.trim().length >= 2 && color.trim().length >= 4
  }, [name, color])

  const isBudgetValid = useMemo(() => {
    return budgetCategoryId.trim().length > 0 && parseMoneyInput(budgetLimit) !== null
  }, [budgetCategoryId, budgetLimit])

  const onSubmitCategory = (event: FormEvent) => {
    event.preventDefault()
    if (!isCategoryValid) return

    addCategory({ name, color })
    setName('')
    setColor('#aa3bff')
  }

  const onSubmitBudget = (event: FormEvent) => {
    event.preventDefault()
    if (!isBudgetValid) return

    const limitCents = parseMoneyInput(budgetLimit)
    if (limitCents === null) return

    addCategoryBudget({
      categoryId: budgetCategoryId,
      monthlyLimitCents: limitCents,
      notes: budgetNotes.trim() || undefined,
    })

    setBudgetLimit('')
    setBudgetNotes('')
    setBudgetCategoryId('')
  }

  const categoriesSorted = useMemo(() => {
    const list = [...categories]
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list
  }, [categories])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title="Adicionar categoria"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{categories.length} no total</span>}
      >
        <form onSubmit={onSubmitCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid2">
            <label className="field">
              <span className="label">Nome</span>
              <input
                className="input"
                placeholder="Ex: Alimentação, Salário..."
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <span className="help">Use nomes curtos e claros.</span>
            </label>

            <label className="field">
              <span className="label">Cor</span>
              <input
                className="input"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                style={{ padding: 8, height: 46 }}
              />
              <span className="help">A cor ajuda a identificar nos relatórios.</span>
            </label>
          </div>

          <button type="submit" className="btn" disabled={!isCategoryValid} style={{ opacity: isCategoryValid ? 1 : 0.5 }}>
            Adicionar
          </button>
        </form>
      </Card>

      <Card title="Suas categorias" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>Gerencie suas cores e nomes</span>}>
        {categoriesSorted.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Você ainda não criou categorias. Adicione uma acima para começar a lançar.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categoriesSorted.map((category) => {
              const usageCount = pickCategoryUsage(category.id, state.transactions)
              const canDelete = usageCount === 0
              const badgeColor = category.color

              return (
                <li
                  key={category.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'rgba(15,18,24,0.78)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: badgeColor,
                        flex: '0 0 auto',
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          color: 'var(--text-h)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {category.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>
                        {usageCount > 0 ? `${usageCount} lançamento(s) ligado(s)` : 'Sem lançamentos'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn ${canDelete ? 'btn--danger' : ''}`}
                    onClick={() => {
                      if (!canDelete) return
                      deleteCategory(category.id)
                    }}
                    disabled={!canDelete}
                    style={{ opacity: canDelete ? 1 : 0.45, padding: '8px 10px', cursor: canDelete ? 'pointer' : 'not-allowed' }}
                    title={canDelete ? 'Excluir categoria' : 'Exclusão bloqueada: há lançamentos vinculados'}
                  >
                    Excluir
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card
        title={`Orçamentos mensais · ${formatMonthYear(monthKey)}`}
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{budgetStats.budgetCount} orçamento(s)</span>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Planejado</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(16,185,129,0.95)' }}>
              {formatBrl(budgetStats.totalLimitCents)}
            </div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Gasto no mês</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>
              {formatBrl(budgetStats.totalSpentCents)}
            </div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Restante</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: budgetStats.remainingCents >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
              }}
            >
              {formatBrl(Math.abs(budgetStats.remainingCents))}
            </div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Estourados</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>
              {budgetStats.overBudgetCount}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <label className="field">
            <span className="label">Mês</span>
            <select className="input" value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  {formatMonthYear(option)}
                </option>
              ))}
            </select>
            <span className="help">Veja o orçamento e os alertas de acordo com o mês selecionado.</span>
          </label>

          <label className="field">
            <span className="label">Categoria do orçamento</span>
            <select
              className="input"
              value={budgetCategoryId}
              onChange={(event) => setBudgetCategoryId(event.target.value)}
              disabled={categories.length === 0}
            >
              <option value="">{categories.length === 0 ? 'Cadastre uma categoria primeiro' : 'Selecione...'}</option>
              {categoriesSorted.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <span className="help">Selecionar uma categoria substitui o orçamento mensal dela.</span>
          </label>
        </div>

        <form onSubmit={onSubmitBudget} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          <div className="grid2">
            <label className="field">
              <span className="label">Limite mensal (R$)</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Ex: 1500,00"
                value={budgetLimit}
                onChange={(event) => setBudgetLimit(event.target.value)}
              />
              <span className="help">Defina quanto quer gastar por mês nessa categoria.</span>
            </label>

            <label className="field">
              <span className="label">Observações (opcional)</span>
              <textarea
                className="input"
                placeholder="Ex: compras do supermercado, farmácia..."
                value={budgetNotes}
                onChange={(event) => setBudgetNotes(event.target.value)}
              />
            </label>
          </div>

          <button type="submit" className="btn" disabled={!isBudgetValid} style={{ opacity: isBudgetValid ? 1 : 0.55, width: 'fit-content' }}>
            Salvar orçamento
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          {budgetSummaries.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
              Nenhum orçamento cadastrado para este mês.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {budgetSummaries.map((budget) => (
                <div
                  key={budget.categoryId}
                  style={{
                    padding: 14,
                    border: `1px solid ${budget.isOverBudget ? 'rgba(239,68,68,0.35)' : 'var(--border)'}`,
                    borderRadius: 16,
                    background: 'rgba(15,18,24,0.78)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            background: budget.color,
                            flex: '0 0 auto',
                          }}
                        />
                        <strong style={{ color: 'var(--text-h)' }}>{budget.categoryName}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
                        Limite: {formatBrl(budget.monthlyLimitCents)} • Gasto: {formatBrl(budget.spentCents)} •
                        {budget.isOverBudget ? ` Estouro de ${formatBrl(Math.abs(budget.remainingCents))}` : ` Restante: ${formatBrl(budget.remainingCents)}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => deleteCategoryBudget(budget.categoryId)}
                      style={{ padding: '8px 10px' }}
                    >
                      Remover
                    </button>
                  </div>

                  <div style={{ marginTop: 12, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${budget.usagePercent}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: budget.isOverBudget ? 'rgba(239,68,68,0.95)' : budget.color,
                      }}
                    />
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, color: budget.isOverBudget ? 'rgba(255,153,153,0.98)' : 'var(--text)' }}>
                    {budget.isOverBudget ? 'Orçamento estourado neste mês.' : `${budget.usagePercent}% usado neste mês.`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
