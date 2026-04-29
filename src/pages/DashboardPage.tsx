import { useMemo, useState, type FormEvent } from 'react'
import { Card } from '../components/ui/Card'
import { PiggyBankCard } from '../components/piggy/PiggyBankCard'
import { formatBrl, formatMonthYear, getCurrentMonthKey } from '../lib/financeFormat'
import { filterTransactions, getMonthlyTotals, getTotals } from '../lib/financeCalculations'
import { useFinanceStore } from '../state/financeStore'

const piggyPalette = ['#d4af37', '#8d62ff', '#10b981', '#ef4444', '#38bdf8', '#f59e0b']
const transactionTypeOptions = ['all', 'income', 'expense'] as const
type TransactionTypeFilter = (typeof transactionTypeOptions)[number]

const parseMoneyInput = (value: string): number | null => {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null

  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) return null

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

export function DashboardPage() {
  const { state, addPiggyBank, addPiggyBankContribution, withdrawPiggyBankAmount, deletePiggyBank } = useFinanceStore()

  const [piggyName, setPiggyName] = useState('')
  const [piggyGoal, setPiggyGoal] = useState('')
  const [piggyInitial, setPiggyInitial] = useState('')
  const [piggyColor, setPiggyColor] = useState(piggyPalette[0])
  const [piggyNotes, setPiggyNotes] = useState('')
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey())
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionTypeFilter>('all')

  const totals = useMemo(() => getTotals(state), [state])
  const monthTotals = useMemo(() => getMonthlyTotals(state, monthKey), [state, monthKey])
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const filteredTransactions = useMemo(
    () =>
      filterTransactions(state.transactions, {
        monthKey,
        type: transactionTypeFilter === 'all' ? undefined : transactionTypeFilter,
      }),
    [monthKey, state.transactions, transactionTypeFilter],
  )

  const categoriesById = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>()
    for (const category of state.categories) map.set(category.id, { name: category.name, color: category.color })
    return map
  }, [state.categories])

  const recent = useMemo(() => filteredTransactions.slice(0, 10), [filteredTransactions])

  const piggySummary = useMemo(() => {
    let savedCents = 0
    let goalCents = 0
    let completedCount = 0
    let totalProgress = 0

    for (const piggyBank of state.piggyBanks) {
      savedCents += piggyBank.currentCents
      goalCents += piggyBank.goalCents

      const progress =
        piggyBank.goalCents > 0 ? Math.min(100, Math.round((piggyBank.currentCents / piggyBank.goalCents) * 100)) : 0
      totalProgress += progress

      if (piggyBank.currentCents >= piggyBank.goalCents) {
        completedCount += 1
      }
    }

    return {
      savedCents,
      goalCents,
      remainingCents: Math.max(0, goalCents - savedCents),
      completedCount,
      averageProgress: state.piggyBanks.length > 0 ? Math.round(totalProgress / state.piggyBanks.length) : 0,
      count: state.piggyBanks.length,
    }
  }, [state.piggyBanks])

  const canCreatePiggyBank = useMemo(() => {
    const goalCents = parseMoneyInput(piggyGoal)
    if (!piggyName.trim()) return false
    if (!goalCents || goalCents <= 0) return false

    if (piggyInitial.trim() === '') return true

    const initialCents = parseMoneyInput(piggyInitial)
    if (initialCents === null) return false

    return initialCents <= goalCents
  }, [piggyGoal, piggyInitial, piggyName])

  const handleCreatePiggyBank = (event: FormEvent) => {
    event.preventDefault()
    const goalCents = parseMoneyInput(piggyGoal)
    if (!goalCents || goalCents <= 0) return

    const initialCents = piggyInitial.trim() === '' ? 0 : parseMoneyInput(piggyInitial)
    if (initialCents === null) return
    if (initialCents > goalCents) return

    addPiggyBank({
      name: piggyName,
      goalCents,
      currentCents: initialCents,
      color: piggyColor,
      notes: piggyNotes.trim() || undefined,
    })

    setPiggyName('')
    setPiggyGoal('')
    setPiggyInitial('')
    setPiggyColor(piggyPalette[0])
    setPiggyNotes('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Card
          title="Receitas"
          right={<span style={{ fontWeight: 800, color: 'rgba(16,185,129,0.95)' }}>{formatBrl(totals.incomeCents)}</span>}
        >
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>
            Total acumulado de lançamentos do tipo receita.
          </div>
        </Card>

        <Card
          title="Despesas"
          right={<span style={{ fontWeight: 800, color: 'rgba(239,68,68,0.95)' }}>{formatBrl(totals.expenseCents)}</span>}
        >
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>
            Total acumulado de lançamentos do tipo despesa.
          </div>
        </Card>

        <Card
          title="Saldo disponível"
          right={
            <span
              style={{
                fontWeight: 800,
                color: totals.balanceCents >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
              }}
            >
              {formatBrl(totals.balanceCents)}
            </span>
          }
        >
          <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>Receitas - Despesas - cofrinhos.</div>
          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
            {formatBrl(totals.piggyBanksCents)} reservado nos cofrinhos.
          </div>
        </Card>
      </div>

      <Card
        title={`Resumo do mês · ${formatMonthYear(monthKey)}`}
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{filteredTransactions.length} movimento(s)</span>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Receitas do mês</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(16,185,129,0.95)' }}>
              {formatBrl(monthTotals.incomeCents)}
            </div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Despesas do mês</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>
              {formatBrl(monthTotals.expenseCents)}
            </div>
          </div>
          <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(15,18,24,0.78)' }}>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>Saldo do mês</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: monthTotals.balanceCents >= 0 ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
              }}
            >
              {formatBrl(monthTotals.balanceCents)}
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
            <span className="help">Os resumos e filtros mudam conforme o mês selecionado.</span>
          </label>

          <div className="field">
            <span className="label">Filtro de lançamentos</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {transactionTypeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="btn"
                  onClick={() => setTransactionTypeFilter(option)}
                  style={{
                    opacity: transactionTypeFilter === option ? 1 : 0.55,
                    borderColor: transactionTypeFilter === option ? 'rgba(212,175,55,0.42)' : undefined,
                  }}
                >
                  {option === 'all' ? 'Todos' : option === 'income' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>
            <span className="help">
              Mostrando {transactionTypeFilter === 'all' ? 'todos os lançamentos' : transactionTypeFilter === 'income' ? 'somente receitas' : 'somente despesas'}.
            </span>
          </div>
        </div>
      </Card>

      <Card
        title="Cofrinhos digitais"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{piggySummary.count} cofrinho(s)</span>}
      >
        <div className="piggySection">
          <div className="piggySection__hero">
            <div className="piggySection__panel">
              <h3 className="piggySection__panelTitle">Organize metas como um banco digital</h3>
              <p className="piggySection__panelText">
                Separe objetivos, acompanhe o progresso e veja quanto falta para cada meta sair do papel.
              </p>

              <div className="piggySection__stats">
                <div className="piggySection__stat">
                  <span className="piggySection__statLabel">Guardado</span>
                  <div className="piggySection__statValue">{formatBrl(piggySummary.savedCents)}</div>
                </div>
                <div className="piggySection__stat">
                  <span className="piggySection__statLabel">Meta total</span>
                  <div className="piggySection__statValue">{formatBrl(piggySummary.goalCents)}</div>
                </div>
                <div className="piggySection__stat">
                  <span className="piggySection__statLabel">Faltam</span>
                  <div className="piggySection__statValue">{formatBrl(piggySummary.remainingCents)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                <div className="piggySection__stat" style={{ minWidth: 140 }}>
                  <span className="piggySection__statLabel">Concluídos</span>
                  <div className="piggySection__statValue">{piggySummary.completedCount}</div>
                </div>
                <div className="piggySection__stat" style={{ minWidth: 140 }}>
                  <span className="piggySection__statLabel">Média de progresso</span>
                  <div className="piggySection__statValue">{piggySummary.averageProgress}%</div>
                </div>
              </div>
            </div>

            <div className="piggySection__panel">
              <h3 className="piggySection__panelTitle">Criar novo cofrinho</h3>
              <p className="piggySection__panelText">Defina uma meta, um valor inicial opcional e uma cor para identificar.</p>

              <form className="piggySection__form" onSubmit={handleCreatePiggyBank}>
                <div className="grid2">
                  <label className="field">
                    <span className="label">Nome da meta</span>
                    <input
                      className="input"
                      placeholder="Ex: Viagem, Reserva, Notebook..."
                      value={piggyName}
                      onChange={(event) => setPiggyName(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Meta total (R$)</span>
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="Ex: 5000,00"
                      value={piggyGoal}
                      onChange={(event) => setPiggyGoal(event.target.value)}
                    />
                  </label>
                </div>

                <div className="grid2">
                  <label className="field">
                    <span className="label">Saldo inicial (opcional)</span>
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="Ex: 250,00"
                      value={piggyInitial}
                      onChange={(event) => setPiggyInitial(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="label">Cor de destaque</span>
                    <input
                      className="input"
                      type="color"
                      value={piggyColor}
                      onChange={(event) => setPiggyColor(event.target.value)}
                      style={{ height: 48, padding: 6 }}
                    />
                  </label>
                </div>

                <div className="piggySection__formActions">
                  {piggyPalette.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="btn"
                      onClick={() => setPiggyColor(item)}
                      style={{
                        minWidth: 44,
                        height: 44,
                        padding: 0,
                        borderColor: piggyColor === item ? 'rgba(212,175,55,0.68)' : undefined,
                        boxShadow: piggyColor === item ? '0 0 0 3px rgba(212,175,55,0.12)' : undefined,
                        background: `linear-gradient(180deg, ${item}26, ${item}12)`,
                      }}
                      aria-label={`Escolher cor ${item}`}
                    />
                  ))}
                </div>

                <label className="field">
                  <span className="label">Observações (opcional)</span>
                  <textarea
                    className="input"
                    placeholder="Ex: separar uma parte do salário todo mês..."
                    value={piggyNotes}
                    onChange={(event) => setPiggyNotes(event.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  className="btn"
                  disabled={!canCreatePiggyBank}
                  style={{ opacity: canCreatePiggyBank ? 1 : 0.55, width: 'fit-content' }}
                >
                  Criar cofrinho
                </button>
              </form>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Meus cofrinhos"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{piggySummary.completedCount} concluído(s)</span>}
      >
        {state.piggyBanks.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Você ainda não criou cofrinhos. Use a área acima para começar a guardar por objetivo.
          </div>
        ) : (
          <div className="piggySection__list">
            {state.piggyBanks.map((piggyBank) => (
              <PiggyBankCard
                key={piggyBank.id}
                piggyBank={piggyBank}
                onAddContribution={addPiggyBankContribution}
                onWithdraw={withdrawPiggyBankAmount}
                onDelete={deletePiggyBank}
              />
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Lançamentos filtrados"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{filteredTransactions.length} no filtro</span>}
      >
        {recent.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Nenhum lançamento encontrado para o mês e filtro selecionados.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((transaction) => {
              const category = categoriesById.get(transaction.categoryId)
              const isIncome = transaction.type === 'income'

              return (
                <li
                  key={transaction.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    background: 'rgba(15,18,24,0.78)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: category?.color ?? 'rgba(170,59,255,0.6)',
                        flex: '0 0 auto',
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: 'var(--text-h)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {transaction.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>
                        {category?.name ?? 'Categoria'} • {formatMonthYear(transaction.date.slice(0, 7))}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 900, color: isIncome ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)', flex: '0 0 auto' }}>
                    {isIncome ? '+' : '-'}
                    {formatBrl(transaction.amountCents)}
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
