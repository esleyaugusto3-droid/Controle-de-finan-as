import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { Card } from '../components/ui/Card'
import { useFinanceStore } from '../state/financeStore'
import { formatBrl, formatDateHuman } from '../lib/financeFormat'
import type { Account, AccountCycle, AccountStatus, Category } from '../lib/financeTypes'

type StatusFilter = 'all' | AccountStatus
type CycleFilter = 'all' | AccountCycle
type DisplayTone = 'success' | 'warning' | 'danger' | 'neutral'

type DisplayStatus = {
  label: string
  tone: DisplayTone
  hint: string
}

const cycleLabel: Record<AccountCycle, string> = {
  fixed: 'Fixa',
  temporary: 'Temporária',
  'one-time': 'Só uma vez',
}

const statusLabel: Record<AccountStatus, string> = {
  pending: 'A pagar',
  paid: 'Paga',
}

const getTodayKey = (): string => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getTodayDay = (): string => String(new Date().getDate())

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

const getDaysInMonth = (year: number, monthIndex: number): number => new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate()

const normalizeDate = (date: Date): Date => {
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12))
  return normalized
}

const diffInDays = (from: Date, to: Date): number => {
  const start = normalizeDate(from)
  const end = normalizeDate(to)
  const diff = end.getTime() - start.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

const getAccountDueDay = (account: Account): number => {
  if (typeof account.dueDay === 'number') return account.dueDay
  if (typeof account.dueDate === 'string') return parseDateKey(account.dueDate).getUTCDate()
  return 1
}

const getMonthlyDueDate = (account: Account, today: Date): Date => {
  const dueDay = getAccountDueDay(account)
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  const currentMonthDueDay = Math.min(dueDay, getDaysInMonth(currentYear, currentMonth))
  let dueDate = new Date(Date.UTC(currentYear, currentMonth, currentMonthDueDay, 12))

  if (normalizeDate(dueDate).getTime() < normalizeDate(today).getTime()) {
    const nextMonthDate = new Date(Date.UTC(currentYear, currentMonth + 1, 1, 12))
    const nextYear = nextMonthDate.getUTCFullYear()
    const nextMonth = nextMonthDate.getUTCMonth()
    const nextMonthDueDay = Math.min(dueDay, getDaysInMonth(nextYear, nextMonth))
    dueDate = new Date(Date.UTC(nextYear, nextMonth, nextMonthDueDay, 12))
  }

  return dueDate
}

const getDynamicStatus = (account: Account, today: Date): DisplayStatus => {
  if (account.status === 'paid') {
    return {
      label: 'Pago',
      tone: 'success',
      hint: 'Quitado neste ciclo',
    }
  }

  const dueDate = account.cycle === 'fixed' ? getMonthlyDueDate(account, today) : parseDateKey(account.dueDate ?? getTodayKey())
  const daysLeft = diffInDays(today, dueDate)

  if (daysLeft < 0) {
    return {
      label: 'Vencido',
      tone: 'danger',
      hint: `Atrasada há ${Math.abs(daysLeft)} dia(s)`,
    }
  }

  if (daysLeft === 0) {
    return {
      label: 'Vence hoje',
      tone: 'danger',
      hint: 'Vencimento hoje',
    }
  }

  if (daysLeft <= 3) {
    return {
      label: 'A vencer',
      tone: 'warning',
      hint: `Vence em ${daysLeft} dia(s)`,
    }
  }

  return {
    label: 'Em dia',
    tone: 'success',
    hint: account.cycle === 'fixed' ? 'No ciclo atual está ok' : `Vence em ${daysLeft} dia(s)`,
  }
}

const getToneStyles = (tone: DisplayTone): { border: string; color: string; background: string } => {
  if (tone === 'success') {
    return {
      border: '1px solid rgba(16,185,129,0.22)',
      color: 'rgba(16,185,129,0.96)',
      background: 'rgba(16,185,129,0.08)',
    }
  }

  if (tone === 'warning') {
    return {
      border: '1px solid rgba(212,175,55,0.26)',
      color: '#f3e7bb',
      background: 'rgba(212,175,55,0.12)',
    }
  }

  if (tone === 'danger') {
    return {
      border: '1px solid rgba(239,68,68,0.22)',
      color: 'rgba(255,153,153,0.98)',
      background: 'rgba(239,68,68,0.1)',
    }
  }

  return {
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-h)',
    background: 'rgba(255,255,255,0.04)',
  }
}

const getStatusChipStyle = (tone: DisplayTone): CSSProperties => ({
  ...getToneStyles(tone),
  fontSize: 11,
  fontWeight: 800,
  padding: '4px 8px',
  borderRadius: 999,
})

const getDueSortKey = (account: Account): string => {
  if (account.cycle === 'fixed') {
    return `fixed-${String(getAccountDueDay(account)).padStart(2, '0')}`
  }

  return `date-${account.dueDate ?? '9999-12-31'}`
}

const getAccountSortValue = (account: Account): string => {
  const statusPrefix = account.status === 'pending' ? '0' : '1'
  return `${statusPrefix}-${getDueSortKey(account)}-${account.createdAt}`
}

export function AccountsPage() {
  const { state, addAccount, deleteAccount, setAccountStatus } = useFinanceStore()

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const category of state.categories) map.set(category.id, category)
    return map
  }, [state.categories])

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(getTodayKey())
  const [dueDay, setDueDay] = useState(getTodayDay())
  const [cycle, setCycle] = useState<AccountCycle>('temporary')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>('all')

  const today = new Date()
  const isFixedCycle = cycle === 'fixed'

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false

    const cents = Number(amount.replace(',', '.'))
    if (!Number.isFinite(cents) || cents <= 0) return false

    if (isFixedCycle) {
      const dueDayNumber = Number(dueDay)
      if (!Number.isInteger(dueDayNumber) || dueDayNumber < 1 || dueDayNumber > 31) return false
      return true
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return false
    return true
  }, [amount, dueDate, dueDay, isFixedCycle, title])

  const summary = useMemo(() => {
    let pendingCents = 0
    let paidCents = 0
    let overdueCount = 0
    let fixedCount = 0
    let temporaryCount = 0
    let oneTimeCount = 0
    let emDiaCount = 0
    let aVencerCount = 0
    let venceHojeCount = 0
    let vencidoCount = 0

    for (const account of state.accounts) {
      const display = getDynamicStatus(account, today)
      if (account.status === 'pending') pendingCents += account.amountCents
      if (account.status === 'paid') paidCents += account.amountCents
      if (display.label === 'Vencido') overdueCount += 1
      if (display.label === 'Em dia') emDiaCount += 1
      if (display.label === 'A vencer') aVencerCount += 1
      if (display.label === 'Vence hoje') venceHojeCount += 1
      if (display.label === 'Vencido') vencidoCount += 1
      if (account.cycle === 'fixed') fixedCount += 1
      if (account.cycle === 'temporary') temporaryCount += 1
      if (account.cycle === 'one-time') oneTimeCount += 1
    }

    return {
      pendingCents,
      paidCents,
      overdueCount,
      fixedCount,
      temporaryCount,
      oneTimeCount,
      emDiaCount,
      aVencerCount,
      venceHojeCount,
      vencidoCount,
      totalCount: state.accounts.length,
    }
  }, [state.accounts, today])

  const filteredAccounts = useMemo(() => {
    const list = [...state.accounts]
    return list
      .filter((account) => (statusFilter === 'all' ? true : account.status === statusFilter))
      .filter((account) => (cycleFilter === 'all' ? true : account.cycle === cycleFilter))
      .sort((a, b) => getAccountSortValue(a).localeCompare(getAccountSortValue(b)))
  }, [cycleFilter, statusFilter, state.accounts])

  const pendingAccounts = useMemo(
    () => state.accounts.filter((account) => account.status === 'pending').sort((a, b) => getDueSortKey(a).localeCompare(getDueSortKey(b))),
    [state.accounts],
  )

  const paidAccounts = useMemo(
    () => state.accounts.filter((account) => account.status === 'paid').sort((a, b) => getDueSortKey(b).localeCompare(getDueSortKey(a))),
    [state.accounts],
  )

  const fixedAccounts = useMemo(
    () => state.accounts.filter((account) => account.cycle === 'fixed').sort((a, b) => getDueSortKey(a).localeCompare(getDueSortKey(b))),
    [state.accounts],
  )

  const temporaryAccounts = useMemo(
    () => state.accounts.filter((account) => account.cycle !== 'fixed').sort((a, b) => getDueSortKey(a).localeCompare(getDueSortKey(b))),
    [state.accounts],
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    const amountCents = Math.round(Number(amount.replace(',', '.')) * 100)

    addAccount(
      isFixedCycle
        ? {
            title,
            amountCents,
            dueDay: Number(dueDay),
            cycle,
            categoryId: categoryId || undefined,
            notes: notes.trim() || undefined,
          }
        : {
            title,
            amountCents,
            dueDate,
            cycle,
            categoryId: categoryId || undefined,
            notes: notes.trim() || undefined,
          },
    )

    setTitle('')
    setAmount('')
    setDueDate(getTodayKey())
    setDueDay(getTodayDay())
    setCycle('temporary')
    setCategoryId('')
    setNotes('')
  }

  const renderAccount = (account: Account) => {
    const category = account.categoryId ? categoriesById.get(account.categoryId) : undefined
    const display = getDynamicStatus(account, today)
    const dueLabel =
      account.cycle === 'fixed'
        ? `Vence todo dia ${String(getAccountDueDay(account)).padStart(2, '0')} de cada mês`
        : account.dueDate
          ? formatDateHuman(account.dueDate)
          : 'Sem vencimento informado'

    return (
      <div
        key={account.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '14px 16px',
          border: '1px solid var(--border)',
          borderRadius: 16,
          background: 'rgba(15,18,24,0.78)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-h)', fontSize: 17, letterSpacing: '-0.3px' }}>
                {account.title}
              </h3>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(212,175,55,0.28)',
                  color: '#f3e7bb',
                  background: 'rgba(212,175,55,0.08)',
                }}
              >
                {cycleLabel[account.cycle]}
              </span>
              <span style={getStatusChipStyle(display.tone)}>{display.label}</span>
            </div>

            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--text)' }}>
              <span>{dueLabel}</span>
              {category ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: category.color,
                      flex: '0 0 auto',
                    }}
                  />
                  {category.name}
                </span>
              ) : null}
            </div>

            <div style={{ marginTop: 6, color: getToneStyles(display.tone).color, fontSize: 12 }}>
              {display.hint}
            </div>

            {account.notes ? (
              <div style={{ marginTop: 8, color: 'var(--text)', fontSize: 13, lineHeight: 1.5 }}>{account.notes}</div>
            ) : null}
          </div>

          <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-h)' }}>
              {formatBrl(account.amountCents)}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: getToneStyles(display.tone).color }}>
              {display.label}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {account.status === 'pending' ? (
            <button className="btn" type="button" onClick={() => setAccountStatus(account.id, 'paid')}>
              Marcar como paga
            </button>
          ) : (
            <button className="btn" type="button" onClick={() => setAccountStatus(account.id, 'pending')}>
              Desfazer pagamento
            </button>
          )}
          <button className="btn btn--danger" type="button" onClick={() => deleteAccount(account.id)}>
            Excluir
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Card
          title="A pagar"
          right={<span style={{ fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>{formatBrl(summary.pendingCents)}</span>}
        >
          <div style={{ color: 'var(--text)', fontSize: 13, marginTop: 6 }}>{summary.vencidoCount} vencida(s)</div>
        </Card>
        <Card
          title="Pagas"
          right={<span style={{ fontWeight: 900, color: 'rgba(16,185,129,0.95)' }}>{formatBrl(summary.paidCents)}</span>}
        >
          <div style={{ color: 'var(--text)', fontSize: 13, marginTop: 6 }}>{paidAccounts.length} conta(s) quitada(s)</div>
        </Card>
        <Card title="Fixas" right={<span style={{ fontWeight: 900, color: '#f3e7bb' }}>{summary.fixedCount}</span>}>
          <div style={{ color: 'var(--text)', fontSize: 13, marginTop: 6 }}>Contas recorrentes mensais</div>
        </Card>
        <Card
          title="Temporárias / Únicas"
          right={<span style={{ fontWeight: 900, color: '#d7deea' }}>{summary.temporaryCount + summary.oneTimeCount}</span>}
        >
          <div style={{ color: 'var(--text)', fontSize: 13, marginTop: 6 }}>
            {summary.temporaryCount} temporária(s) • {summary.oneTimeCount} única(s)
          </div>
        </Card>
      </div>

      <Card
        title="Nova conta"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{summary.totalCount} cadastrada(s)</span>}
      >
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid2">
            <label className="field">
              <span className="label">Título</span>
              <input
                className="input"
                placeholder="Ex: Aluguel, Internet, Mensalidade..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <span className="help">Nome da conta a pagar.</span>
            </label>

            <label className="field">
              <span className="label">Valor (R$)</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="Ex: 250,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="help">Pode usar vírgula ou ponto.</span>
            </label>
          </div>

          <div className="grid2">
            {isFixedCycle ? (
              <label className="field">
                <span className="label">Dia do vencimento</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  placeholder="Ex: 10"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                />
                <span className="help">Informe apenas o dia do mês em que a conta vence.</span>
              </label>
            ) : (
              <label className="field">
                <span className="label">Vencimento</span>
                <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                <span className="help">Data de referência da conta.</span>
              </label>
            )}

            <label className="field">
              <span className="label">Tipo de conta</span>
              <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value as AccountCycle)}>
                <option value="fixed">Fixa</option>
                <option value="temporary">Temporária</option>
                <option value="one-time">Só uma vez</option>
              </select>
              <span className="help">Define a recorrência.</span>
            </label>
          </div>

          <div className="grid2">
            <label className="field">
              <span className="label">Categoria (opcional)</span>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Nenhuma</option>
                {state.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="help">Relaciona à categoria financeira.</span>
            </label>

            <label className="field">
              <span className="label">Observações (opcional)</span>
              <input
                className="input"
                placeholder="Ex: débito automático, revisar contrato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <span className="help">Detalhes extras da cobrança.</span>
            </label>
          </div>

          <button type="submit" className="btn" disabled={!canSubmit} style={{ opacity: canSubmit ? 1 : 0.5, width: 'fit-content' }}>
            Adicionar conta
          </button>
        </form>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 12 }}>
        <Card
          title="Contas a pagar"
          right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{pendingAccounts.length} item(ns)</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['all', 'pending', 'paid'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  className="btn"
                  onClick={() => setStatusFilter(status)}
                  style={{
                    opacity: statusFilter === status ? 1 : 0.55,
                    borderColor: statusFilter === status ? 'rgba(212,175,55,0.42)' : undefined,
                  }}
                >
                  {status === 'all' ? 'Todas' : statusLabel[status]}
                </button>
              ))}
              {(['all', 'fixed', 'temporary', 'one-time'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className="btn"
                  onClick={() => setCycleFilter(item)}
                  style={{
                    opacity: cycleFilter === item ? 1 : 0.55,
                    borderColor: cycleFilter === item ? 'rgba(212,175,55,0.42)' : undefined,
                  }}
                >
                  {item === 'all' ? 'Todos os tipos' : cycleLabel[item]}
                </button>
              ))}
            </div>

            {filteredAccounts.length === 0 ? (
              <div style={{ color: 'var(--text)', fontSize: 14, padding: 6 }}>Nenhuma conta encontrada com os filtros atuais.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredAccounts.map((account) => renderAccount(account))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Resumo de status" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>em tempo real</span>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 16, background: 'rgba(15,18,24,0.78)' }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>A pagar agora</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'rgba(239,68,68,0.95)' }}>{formatBrl(summary.pendingCents)}</div>
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 16, background: 'rgba(15,18,24,0.78)' }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>Pagas</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: 'rgba(16,185,129,0.95)' }}>{formatBrl(summary.paidCents)}</div>
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 16, background: 'rgba(15,18,24,0.78)' }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>Atrasadas</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#f3e7bb' }}>{summary.vencidoCount}</div>
            </div>
            <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 16, background: 'rgba(15,18,24,0.78)' }}>
              <div style={{ fontSize: 12, color: 'var(--text)' }}>Alertas do mês</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#f3e7bb' }}>
                {summary.aVencerCount + summary.venceHojeCount}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Fixas" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{fixedAccounts.length}</span>}>
          {fixedAccounts.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: 14, padding: 6 }}>Sem contas fixas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fixedAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </Card>

        <Card title="Temporárias / Só uma vez" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{temporaryAccounts.length}</span>}>
          {temporaryAccounts.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: 14, padding: 6 }}>Sem contas temporárias ou únicas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {temporaryAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card title="Pendentes" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{pendingAccounts.length}</span>}>
          {pendingAccounts.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: 14, padding: 6 }}>Sem pendências.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </Card>

        <Card title="Pagas" right={<span style={{ fontSize: 13, color: 'var(--text)' }}>{paidAccounts.length}</span>}>
          {paidAccounts.length === 0 ? (
            <div style={{ color: 'var(--text)', fontSize: 14, padding: 6 }}>Nenhuma conta paga.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {paidAccounts.map((account) => renderAccount(account))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
