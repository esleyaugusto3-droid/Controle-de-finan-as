import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <Card
      title="Página não encontrada"
      right={
        <button className="btn" onClick={() => navigate('/dashboard')} type="button">
          Voltar
        </button>
      }
    >
      <div style={{ fontSize: 14, color: 'var(--text)', padding: 6 }}>
        Verifique a URL ou volte para o <b>Dashboard</b>.
      </div>
    </Card>
  )
}
