import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useRango } from '@/hooks/useFinance'
import { LogoIcon } from '@/components/ui/LogoIcon'
import FeedbackModal from '@/components/ui/FeedbackModal'
import s from './Topbar.module.css'

const ICONS = {
  dashboard: (
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5z" />
  ),
  cuentas: (
    <path d="M12.136.326A1.5 1.5 0 0 1 14 1.78V3h.5A1.5 1.5 0 0 1 16 4.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 13.5v-9a1.5 1.5 0 0 1 1.432-1.499zM5.562 3H13V1.78a.5.5 0 0 0-.621-.484zM1.5 4a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5z" />
  ),
  ingresos: (
    <>
      <path d="M8 0a.5.5 0 0 1 .5.5v9.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 10.293V.5A.5.5 0 0 1 8 0" transform="rotate(180 8 8)" />
      <path d="M1 13.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5" />
    </>
  ),
  recurrentes: (
    <>
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9" />
      <path d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z" />
    </>
  ),
  suscripciones: (
    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z" />
  ),
  deudas: (
    <>
      <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2z" />
      <path d="M8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4" />
    </>
  ),
  inversiones: (
    <path d="M0 0h1v15h15v1H0zm10 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V4.9l-3.613 4.417a.5.5 0 0 1-.74.037L7.06 6.767l-3.656 5.027a.5.5 0 0 1-.808-.588l4-5.5a.5.5 0 0 1 .758-.06l2.609 2.61L13.445 4H10.5a.5.5 0 0 1-.5-.5" />
  ),
  presupuestos: (
    <>
      <path d="M0 3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1zM1 5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5z" />
      <path d="M3 8.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5" />
    </>
  ),
  logros: (
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
      d="M2.5.5A.5.5 0 0 1 3 0h10a.5.5 0 0 1 .5.5c0 .538-.012 1.05-.034 1.536a3 3 0 1 1-1.133 5.89c-.79 1.865-1.878 2.777-2.833 3.011v2.173l1.425.356c.194.048.377.135.537.255L13.3 15.1a.5.5 0 0 1-.3.9H3a.5.5 0 0 1-.3-.9l1.838-1.379c.16-.12.343-.207.537-.255L6.5 13.11v-2.173c-.955-.234-2.043-1.146-2.833-3.012a3 3 0 1 1-1.133-5.89A33 33 0 0 1 2.5 2.037zm.099 2.54a2 2 0 0 0 .72 3.935c-.312-.902-.523-1.98-.6-3.236zm10.802 0c-.077 1.256-.29 2.334-.6 3.236a2 2 0 0 0 .72-3.935z"
    />
  ),
}

const CONFIG_ICONS = {
  ajustes: (
    <>
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
    </>
  ),
  feedback: (
    <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105" />
  ),
  incidencias: (
    <>
      <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z" />
      <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
    </>
  ),
  sun: (
    <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6m0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707" />
  ),
  moon: (
    <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
  ),
  logout: (
    <>
      <path d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z" />
      <path d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z" />
    </>
  ),
}

const NAV = [
  { to: '/', key: 'dashboard', end: true, icon: ICONS.dashboard },
  { to: '/cuentas', key: 'cuentas', icon: ICONS.cuentas },
  { to: '/ingresos', key: 'ingresos', icon: ICONS.ingresos },
  { to: '/recurrentes', key: 'recurrentes', icon: ICONS.recurrentes },
  { to: '/suscripciones', key: 'suscripciones', icon: ICONS.suscripciones },
  { to: '/deudas', key: 'deudas', icon: ICONS.deudas },
  { to: '/inversiones', key: 'inversiones', icon: ICONS.inversiones },
  { to: '/presupuestos', key: 'presupuestos', icon: ICONS.presupuestos },
  { to: '/logros', key: 'logros', icon: ICONS.logros },
]

export default function Topbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const { data: rango, isError: rangoError } = useRango()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('yf-sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('yf-sidebar-collapsed', next ? '1' : '0')
      } catch {
        // localStorage puede fallar en modo privado; el estado sigue en memoria.
      }
      return next
    })
  }

  const initials = (user?.username ?? 'JF').slice(0, 2).toUpperCase()
  const isAdmin = user?.role === 'ROLE_ADMIN'

  const brand = (
    <div className={s.brand}>
      <div className={s.brandIcon}>
        <LogoIcon />
      </div>
      <span className={s.brandText}>
        You<span>Finance</span>
      </span>
    </div>
  )

  function navLinks(onClick?: () => void, itemClass = s.navBtn) {
    return NAV.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onClick}
        title={collapsed ? t(`nav.${item.key}`) : undefined}
        className={({ isActive }) => `${itemClass} ${isActive ? s.navActive : ''}`}
      >
        <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
          {item.icon}
        </svg>
        <span className={s.navLabel}>{t(`nav.${item.key}`)}</span>
      </NavLink>
    ))
  }

  const themeLabel = t('menu.changeTheme', {
    mode: theme === 'dark' ? t('menu.light') : t('menu.dark'),
  })

  return (
    <>
      <aside className={`${s.sidebar} ${collapsed ? s.collapsed : ''}`}>
        <div className={s.head}>{brand}</div>

        <button
          className={s.collapseFloat}
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Plegar menú'}
          title={collapsed ? 'Expandir menú' : 'Plegar menú'}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {collapsed ? (
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M10 3.5 5.5 8 10 12.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>

        <div className={s.scrollArea}>
          <nav className={s.nav}>{navLinks()}</nav>
          <div className={s.footerNav}>
            <NavLink
              to="/ajustes"
              title={collapsed ? t('menu.settings') : undefined}
              className={({ isActive }) => `${s.navBtn} ${isActive ? s.navActive : ''}`}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.ajustes}
              </svg>
              <span className={s.navLabel}>{t('menu.settings')}</span>
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/incidencias"
                title={collapsed ? t('menu.incidencias') : undefined}
                className={({ isActive }) => `${s.navBtn} ${isActive ? s.navActive : ''}`}
              >
                <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                  {CONFIG_ICONS.incidencias}
                </svg>
                <span className={s.navLabel}>{t('menu.incidencias')}</span>
              </NavLink>
            )}

            <button
              className={s.navBtn}
              onClick={() => setFeedbackOpen(true)}
              title={collapsed ? t('menu.feedback') : undefined}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.feedback}
              </svg>
              <span className={s.navLabel}>{t('menu.feedback')}</span>
            </button>

            <button
              className={s.navBtn}
              onClick={toggleTheme}
              title={collapsed ? themeLabel : undefined}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {theme === 'dark' ? CONFIG_ICONS.sun : CONFIG_ICONS.moon}
              </svg>
              <span className={s.navLabel}>{themeLabel}</span>
            </button>
          </div>
        </div>

        <div className={s.userRow} title={collapsed ? user?.username ?? '' : undefined}>
            <span className={s.avatar}>
              {user?.fotoPerfil ? (
                <img className={s.avatarImg} src={user.fotoPerfil} alt="" />
              ) : (
                initials
              )}
            </span>
            <span className={s.avatarInfo}>
              <span className={s.avatarName}>{user?.username}</span>
              {rango ? (
                <>
                  <span className={s.avatarRole}>
                    <span className={s.rangoNivel}>Nv {rango.nivel}</span>
                    {rango.nombre}
                  </span>
                  <span
                    className={s.xpBar}
                    title={
                      rango.xpSiguiente != null
                        ? `${rango.experienciaTotal} XP · faltan ${
                            rango.xpSiguiente - rango.experienciaTotal
                          } XP para el siguiente rango`
                        : `${rango.experienciaTotal} XP · rango máximo`
                    }
                  >
                    <span className={s.xpFill} style={{ width: `${rango.progreso}%` }} />
                  </span>
                </>
              ) : rangoError ? (
                <span className={s.avatarRole}>{user?.role}</span>
              ) : (
                <>
                  <span className={s.avatarRole}>&nbsp;</span>
                  <span className={s.xpBar} />
                </>
              )}
            </span>
            <button className={s.logoutBtn} onClick={logout} aria-label={t('menu.logout')} title={t('menu.logout')}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.logout}
              </svg>
            </button>
          </div>
      </aside>

      <div className={s.mobileTopbar}>
        <button
          className={s.hamburger}
          onClick={() => setNavOpen(true)}
          aria-label="Abrir menú"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        {brand}
      </div>

      {navOpen && (
        <div className={s.drawerOverlay} onClick={() => setNavOpen(false)}>
          <nav className={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={s.drawerHead}>
              <span className={s.brandText} style={{ fontWeight: 700 }}>
                You<span style={{ color: 'var(--accent)' }}>Finance</span>
              </span>
              <button className={s.iconBtn} onClick={() => setNavOpen(false)} aria-label="Cerrar menú">
                <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" /></svg>
              </button>
            </div>
            {navLinks(() => setNavOpen(false), s.drawerItem)}
            <NavLink
              to="/ajustes"
              onClick={() => setNavOpen(false)}
              className={({ isActive }) => `${s.drawerItem} ${isActive ? s.navActive : ''}`}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.ajustes}
              </svg>
              {t('menu.settings')}
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/incidencias"
                onClick={() => setNavOpen(false)}
                className={({ isActive }) => `${s.drawerItem} ${isActive ? s.navActive : ''}`}
              >
                <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                  {CONFIG_ICONS.incidencias}
                </svg>
                {t('menu.incidencias')}
              </NavLink>
            )}
            <button
              className={s.drawerItem}
              onClick={() => {
                setNavOpen(false)
                setFeedbackOpen(true)
              }}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.feedback}
              </svg>
              {t('menu.feedback')}
            </button>
            <button className={s.drawerItem} onClick={toggleTheme}>
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {theme === 'dark' ? CONFIG_ICONS.sun : CONFIG_ICONS.moon}
              </svg>
              {themeLabel}
            </button>
            <button className={`${s.drawerItem} ${s.danger}`} onClick={logout}>
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {CONFIG_ICONS.logout}
              </svg>
              {t('menu.logout')}
            </button>
          </nav>
        </div>
      )}

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </>
  )
}
