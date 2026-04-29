import { NavLink, Outlet } from 'react-router-dom'
import { useMemo } from 'react'
import './layout.css'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'navLink navLink--active' : 'navLink'

export function Layout() {
  const links = useMemo(
    () => [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/lancamentos', label: 'Lançamentos' },
      { to: '/categorias', label: 'Categorias' },
      { to: '/relatorios', label: 'Relatórios' },
      { to: '/contas', label: 'Contas' },
      { to: '/configuracoes', label: 'Configurações' },
    ],
    [],
  )

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandTitle">Controle de Finanças</div>
          <div className="brandSubtitle">Gerencie receitas e despesas</div>
        </div>

        <nav className="nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebarFooter">
          <div className="muted">Dados ficam no seu navegador</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <h1 className="topbarTitle">Controle de Finanças</h1>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
