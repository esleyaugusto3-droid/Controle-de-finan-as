import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceStore } from '../state/financeStore'
import { Card } from '../components/ui/Card'
import { formatBrl, formatDateHuman } from '../lib/financeFormat'
import type { Category } from '../lib/financeTypes'

const parseBrlToCents = (value: string): number | null => {
  // Aceita "123,45" ou "123.45" e remove espaços
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return null
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  // Evita valores fracionários estranhos
  return Math.round(num * 100)
}

const normalizeDate = (date: string): string => {
  // HTML date input já entrega YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  return date
}

export function TransactionsPage() {
  const { state, addTransaction, deleteTransaction } = useFinanceStore()

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of state.categories) map.set(c.id, c)
    return map
  }, [state.categories])

  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })

  const canSubmit = useMemo(() => {
    if (state.categories.length === 0) return false
    if (!description.trim()) return false
    if (!categoryId) return false
    const cents = parseBrlToCents(amount)
    if (cents === null || !Number.isInteger(cents) || cents === 0) return false
    if (!normalizeDate(date)) return false
    return true
  }, [amount, categoryId, date, description, state.categories.length])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const cents = parseBrlToCents(amount)
    if (cents === null) return

    addTransaction({
      type,
      description,
      categoryId,
      amountCents: cents,
      date: normalizeDate(date),
    })

    setDescription('')
    setAmount('')
  }

  const txs = state.transactions

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title="Adicionar lançamento"
        right={
          <span style={{ fontSize: 13, color: 'var(--text)' }}>
            {state.transactions.length} total
          </span>
        }
      >
        {state.categories.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Para lançar receitas/despesas, você precisa cadastrar ao menos <b>1 categoria</b>.
            Vá em <b>Categorias</b>.
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid2">
              <label className="field">
                <span className="label">Tipo</span>
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
                <span className="help">Defina se é entrada ou saída.</span>
              </label>

              <label className="field">
                <span className="label">Data</span>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <span className="help">Usado em relatórios e histórico.</span>
              </label>
            </div>

            <label className="field">
              <span className="label">Descrição</span>
              <input
                className="input"
                placeholder="Ex: Salário, Mercado, Aluguel..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="grid2">
              <label className="field">
                <span className="label">Categoria</span>
                <select
                  className="input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="help">Organiza seu controle por tipo.</span>
              </label>

              <label className="field">
                <span className="label">Valor (R$)</span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="Ex: 1200,50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="help">Pode usar vírgula ou ponto.</span>
              </label>
            </div>

            <button type="submit" className="btn" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
              Adicionar
            </button>
          </form>
        )}
      </Card>

      <Card
        title="Histórico"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{txs.length ? 'Clique para excluir' : ''}</span>}
      >
        {txs.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
            Nenhum lançamento ainda. Adicione acima para começar.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {txs.map((t) => {
              const cat = categoriesById.get(t.categoryId)
              const isIncome = t.type === 'income'
              return (
                <li
                  key={t.id}
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
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: cat?.color ?? 'rgba(170,59,255,0.6)',
                        flex: '0 0 auto',
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)' }}>
                        {cat?.name ?? 'Categoria'} • {formatDateHuman(t.date)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
                    <div style={{ fontWeight: 900, color: isIncome ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)' }}>
                      {isIncome ? '+' : '-'}
                      {formatBrl(t.amountCents)}
                    </div>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => deleteTransaction(t.id)}
                      style={{ padding: '8px 10px' }}
                    >
                      Excluir
                    </button>
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
