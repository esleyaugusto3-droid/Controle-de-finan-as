import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useFinanceStore } from '../state/financeStore'
import { Card } from '../components/ui/Card'
import { FinanceStateSchema } from '../lib/financeSchema'
import type { FinanceState } from '../lib/financeTypes'

const downloadText = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const { state, importState, resetAll } = useFinanceStore()

  const [rawImport, setRawImport] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const exportJson = useMemo(() => JSON.stringify(state, null, 2), [state])

  const onExportDownload = () => {
    const date = new Date()
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    downloadText(`controle-financas-backup-${yyyy}-${mm}-${dd}.json`, exportJson)
  }

  const onExportCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson)
      setSuccess('Backup copiado para a área de transferência.')
      setError(null)
    } catch {
      setError('Não foi possível copiar automaticamente. Use o botão de download ou copie manualmente.')
      setSuccess(null)
    }
  }

  const onImportSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawImport)
    } catch {
      setError('JSON inválido. Verifique o conteúdo do backup.')
      return
    }

    const validation = FinanceStateSchema.safeParse(parsed)
    if (!validation.success) {
      setError('Backup com formato inválido (verifique se é um arquivo exportado pelo app).')
      return
    }

    const result = importState(validation.data as FinanceState)
    if (!result.ok) {
      setError(result.reason)
      return
    }

    setSuccess('Backup importado com sucesso.')
    setRawImport('')
  }

  const onReset = () => {
    const ok = window.confirm('Tem certeza que deseja apagar TODOS os dados? Essa ação não pode ser desfeita.')
    if (!ok) return
    setSuccess('Dados apagados.')
    setError(null)
    resetAll()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title="Backup (exportar)"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>JSON com suas categorias e lançamentos</span>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={onExportCopy}>
              Copiar JSON
            </button>
            <button className="btn" type="button" onClick={onExportDownload}>
              Baixar arquivo
            </button>
          </div>

          <textarea
            className="input"
            value={exportJson}
            readOnly
            rows={12}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }}
          />
          <div className="help">Você pode copiar/baixar este conteúdo para restaurar depois.</div>
        </div>
      </Card>

      <Card
        title="Restaurar (importar)"
        right={<span style={{ fontSize: 13, color: 'var(--text)' }}>Cole o JSON do backup</span>}
      >
        <form onSubmit={onImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="field">
            <span className="label">JSON de backup</span>
            <textarea
              className="input"
              value={rawImport}
              onChange={(e) => setRawImport(e.target.value)}
              rows={12}
              placeholder='Cole aqui o JSON exportado pelo app...'
              style={{ fontFamily: 'var(--mono)', fontSize: 12, resize: 'vertical' }}
            />
            <span className="help">O app valida o formato antes de importar.</span>
          </label>

          {error ? (
            <div style={{ fontSize: 14, color: 'rgba(239,68,68,0.95)', fontWeight: 700 }}>{error}</div>
          ) : null}
          {success ? (
            <div style={{ fontSize: 14, color: 'rgba(16,185,129,0.95)', fontWeight: 700 }}>{success}</div>
          ) : null}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn" type="submit" disabled={!rawImport.trim()}>
              Importar backup
            </button>
            <button className="btn btn--danger" type="button" onClick={onReset} style={{ padding: '10px 14px' }}>
              Apagar tudo
            </button>
          </div>
        </form>
      </Card>
    </div>
  )
}
