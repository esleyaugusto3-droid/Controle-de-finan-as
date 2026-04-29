import { useMemo } from 'react'
import { useFinanceStore } from '../state/financeStore'
import { Card } from '../components/ui/Card'
import type { Transaction } from '../lib/financeTypes'
import { formatBrl, formatDateHuman } from '../lib/financeFormat'
import { getTotals } from '../lib/financeCalculations'
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'react-chartjs-2'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type Series = { label: string; valueCents: number; color?: string }

const buildTotalsByCategory = (transactions: Transaction[]) => {
  const income = new Map<string, number>()
  const expense = new Map<string, number>()

  for (const t of transactions) {
    if (t.type === 'income') income.set(t.categoryId, (income.get(t.categoryId) ?? 0) + t.amountCents)
    if (t.type === 'expense') expense.set(t.categoryId, (expense.get(t.categoryId) ?? 0) + t.amountCents)
  }

  return { income, expense }
}

export function ReportsPage() {
  const { state } = useFinanceStore()
  const totals = useMemo(() => getTotals(state), [state])

  const { incomeByCat, expenseByCat } = useMemo(() => {
    const { income, expense } = buildTotalsByCategory(state.transactions)
    return { incomeByCat: income, expenseByCat: expense }
  }, [state.transactions])

  const categories = state.categories

  const incomeSeries = useMemo(() => {
    const list: Series[] = []
    for (const c of categories) {
      const valueCents = incomeByCat.get(c.id) ?? 0
      if (valueCents === 0) continue
      list.push({ label: c.name, valueCents, color: c.color })
    }
    // Ordena por valor desc
    list.sort((a, b) => b.valueCents - a.valueCents)
    return list
  }, [categories, incomeByCat])

  const expenseSeries = useMemo(() => {
    const list: Series[] = []
    for (const c of categories) {
      const valueCents = expenseByCat.get(c.id) ?? 0
      if (valueCents === 0) continue
      list.push({ label: c.name, valueCents, color: c.color })
    }
    list.sort((a, b) => b.valueCents - a.valueCents)
    return list
  }, [categories, expenseByCat])

  const topRecent = useMemo(() => state.transactions.slice(0, 10), [state.transactions])

  const pieDataIncome = useMemo(() => {
    const labels = incomeSeries.map((s) => s.label)
    const data = incomeSeries.map((s) => s.valueCents / 100)
    const backgroundColor = incomeSeries.map((s) => s.color ?? 'rgba(170,59,255,0.6)')
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    }
  }, [incomeSeries])

  const pieDataExpense = useMemo(() => {
    const labels = expenseSeries.map((s) => s.label)
    const data = expenseSeries.map((s) => s.valueCents / 100)
    const backgroundColor = expenseSeries.map((s) => s.color ?? 'rgba(239,68,68,0.6)')
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
        },
      ],
    }
  }, [expenseSeries])

  const barData = useMemo(() => {
    const list: Array<{ label: string; incomeCents: number; expenseCents: number; color: string }> = []

    for (const c of categories) {
      const incomeCents = incomeByCat.get(c.id) ?? 0
      const expenseCents = expenseByCat.get(c.id) ?? 0
      if (incomeCents === 0 && expenseCents === 0) continue
      list.push({ label: c.name, incomeCents, expenseCents, color: c.color })
    }

    list.sort((a, b) => Math.max(b.incomeCents, b.expenseCents) - Math.max(a.incomeCents, a.expenseCents))

    const labels = list.map((x) => x.label)
    return {
      labels,
      datasets: [
        {
          label: 'Receitas (R$)',
          data: list.map((x) => x.incomeCents / 100),
          backgroundColor: 'rgba(16,185,129,0.35)',
          borderColor: 'rgba(16,185,129,0.85)',
          borderWidth: 1,
        },
        {
          label: 'Despesas (R$)',
          data: list.map((x) => x.expenseCents / 100),
          backgroundColor: 'rgba(239,68,68,0.35)',
          borderColor: 'rgba(239,68,68,0.85)',
          borderWidth: 1,
        },
      ],
    }
  }, [categories, incomeByCat, expenseByCat])

  const noData = state.transactions.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title="Resumo geral"
        right={
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            {state.transactions.length} lançamento(s)
          </span>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Receitas</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(16,185,129,0.95)' }}>{formatBrl(totals.incomeCents)}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Despesas</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>{formatBrl(totals.expenseCents)}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Saldo</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: totals.balanceCents >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
              {formatBrl(totals.balanceCents)}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Receitas por categoria">
          {noData || incomeSeries.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
              Sem dados de receita. Adicione lançamentos em <b>Lançamentos</b>.
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 360 }}>
                <Pie
                  data={pieDataIncome}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
          )}
        </Card>

        <Card title="Despesas por categoria">
          {noData || expenseSeries.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
              Sem dados de despesa. Adicione lançamentos em <b>Lançamentos</b>.
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 360 }}>
                <Pie
                  data={pieDataExpense}
                  options={{
                    responsive: true,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card title="Comparativo por categoria (receita x despesa)">
        {noData ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Sem lançamentos para comparar.
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
            <Bar
              data={barData}
              options={{
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
        )}
      </Card>

      <Card
        title="Últimos lançamentos"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{topRecent.length} recentes</span>}
      >
        {topRecent.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>Nenhum lançamento.</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topRecent.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId)
              return (
                <li
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'rgba(15,18,24,0.78)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: cat?.color ?? 'rgba(170,59,255,0.6)' }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>
                        {cat?.name ?? 'Categoria'} • {formatDateHuman(t.date)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 900, color: t.type === 'income' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatBrl(t.amountCents)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
