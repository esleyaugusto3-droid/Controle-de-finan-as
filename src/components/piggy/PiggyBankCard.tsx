import { useMemo, useState, type FormEvent } from 'react'
import { formatBrl } from '../../lib/financeFormat'
import type { PiggyBank } from '../../lib/financeTypes'
import './piggy.css'

type PiggyBankCardProps = {
  piggyBank: PiggyBank
  onAddContribution: (piggyBankId: string, amountCents: number) => void
  onWithdraw: (piggyBankId: string, amountCents: number) => void
  onDelete: (piggyBankId: string) => void
}

const parseAmount = (value: string): number => {
  const normalized = value.replace(',', '.').trim()
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

export function PiggyBankCard({ piggyBank, onAddContribution, onWithdraw, onDelete }: PiggyBankCardProps) {
  const [contribution, setContribution] = useState('50')
  const [withdrawal, setWithdrawal] = useState('50')

  const progress = useMemo(() => {
    if (piggyBank.goalCents <= 0) return 0
    return Math.min(100, Math.round((piggyBank.currentCents / piggyBank.goalCents) * 100))
  }, [piggyBank.currentCents, piggyBank.goalCents])

  const remainingCents = Math.max(0, piggyBank.goalCents - piggyBank.currentCents)
  const isCompleted = piggyBank.currentCents >= piggyBank.goalCents

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const amountCents = parseAmount(contribution)
    if (!amountCents) return

    onAddContribution(piggyBank.id, amountCents)
    setContribution('')
  }

  const handleWithdraw = (event: FormEvent) => {
    event.preventDefault()
    const amountCents = parseAmount(withdrawal)
    if (!amountCents) return

    onWithdraw(piggyBank.id, amountCents)
    setWithdrawal('')
  }

  return (
    <article className="piggyCard">
      <div className="piggyCard__header">
        <div className="piggyCard__titleRow">
          <div className="piggyCard__dot" style={{ background: piggyBank.color }} />
          <div style={{ minWidth: 0 }}>
            <h3 className="piggyCard__title">{piggyBank.name}</h3>
            <div className="piggyCard__subtitle">
              {isCompleted ? 'Meta concluída' : `${progress}% concluído`}
            </div>
          </div>
        </div>

        <button type="button" className="piggyCard__delete" onClick={() => onDelete(piggyBank.id)}>
          Remover
        </button>
      </div>

      {piggyBank.notes ? <p className="piggyCard__notes">{piggyBank.notes}</p> : null}

      <div className="piggyCard__ringRow">
        <div
          className="piggyCard__ring"
          style={{
            background: `conic-gradient(${piggyBank.color} ${progress}%, rgba(255,255,255,0.08) ${progress}% 100%)`,
          }}
        >
          <div className="piggyCard__ringInner">
            <strong>{progress}%</strong>
            <span>da meta</span>
          </div>
        </div>

        <div className="piggyCard__values">
          <div>
            <span className="piggyCard__label">Guardado</span>
            <strong>{formatBrl(piggyBank.currentCents)}</strong>
          </div>
          <div>
            <span className="piggyCard__label">Meta</span>
            <strong>{formatBrl(piggyBank.goalCents)}</strong>
          </div>
          <div>
            <span className="piggyCard__label">Falta</span>
            <strong>{formatBrl(remainingCents)}</strong>
          </div>
        </div>
      </div>

      <div className="piggyCard__bar">
        <div className="piggyCard__barFill" style={{ width: `${progress}%`, background: piggyBank.color }} />
      </div>

      <form className="piggyCard__form" onSubmit={handleSubmit}>
        <label className="field" style={{ flex: 1 }}>
          <span className="label">Adicionar valor</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Ex: 50,00"
            value={contribution}
            onChange={(event) => setContribution(event.target.value)}
          />
        </label>

        <button type="submit" className="btn" style={{ whiteSpace: 'nowrap' }}>
          Guardar
        </button>
      </form>

      <form className="piggyCard__form" onSubmit={handleWithdraw}>
        <label className="field" style={{ flex: 1 }}>
          <span className="label">Retirar valor</span>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Ex: 50,00"
            value={withdrawal}
            onChange={(event) => setWithdrawal(event.target.value)}
          />
        </label>

        <button type="submit" className="btn btn--danger" style={{ whiteSpace: 'nowrap' }}>
          Retirar
        </button>
      </form>
    </article>
  )
}
