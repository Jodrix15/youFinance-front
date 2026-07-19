import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import s from './AppShell.module.css'

export default function AppShell() {
  return (
    <div className={s.shell}>
      <Topbar />
      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}
