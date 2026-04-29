import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceStore } from '../state/financeStore'
import { Card } from '../components/ui/Card'

const pickCategoryUsage = (categoryId: string, transactions: Array<{ categoryId: string }>): number => {
  let count = 0
  for (const t of transactions) if (t.categoryId === categoryId) count += 1
  return count
}

export function CategoriesPage() {
  const { state, addCategory, deleteCategory } = useFinanceStore()

  const categories = state.categories

  const [name, setName] = useState('')
  const [color, setColor] = useState('#aa3bff')

  const isValid = useMemo(() => {
    return name.trim().length >= 2 && color.trim().length >= 4
  }, [name, color])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    addCategory({ name, color })
    setName('')
    setColor('#aa3bff')
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
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grid2">
            <label className="field">
              <span className="label">Nome</span>
              <input className="input" placeholder="Ex: Alimentação, Salário..." value={name} onChange={(e) => setName(e.target.value)} />
              <span className="help">Use nomes curtos e claros.</span>
            </label>

            <label className="field">
              <span className="label">Cor</span>
              <input className="input" type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: 8, height: 46 }} />
              <span className="help">A cor ajuda a identificar nos relatórios.</span>
            </label>
          </div>

          <button type="submit" className="btn" disabled={!isValid} style={{ opacity: isValid ? 1 : 0.5 }}>
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
            {categoriesSorted.map((c) => {
              const usageCount = pickCategoryUsage(c.id, state.transactions)
              const canDelete = usageCount === 0
              const badgeColor = c.color

              return (
                <li
                  key={c.id}
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
                      <div style={{ fontWeight: 900, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2 }}>
                        {usageCount > 0 ? `${usageCount} lançamento( s ) ligado(s)` : 'Sem lançamentos'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`btn ${canDelete ? 'btn--danger' : ''}`}
                    onClick={() => {
                      if (!canDelete) return
                      deleteCategory(c.id)
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
    </div>
  )
}
