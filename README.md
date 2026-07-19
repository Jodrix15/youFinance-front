# Jodrix Finance — Frontend

Frontend en **React + TypeScript + Vite** para el backend Spring Boot `finanzas`.
Réplica del dashboard HTML con un **panel de widgets modulares** (mover, redimensionar,
ocultar y añadir a tu gusto). El layout se guarda en tu navegador.

## Requisitos

- **Node.js 18+** (recomendado 20+) y npm. Comprueba con `node -v`.
- El **backend Spring** (`finanzas`) corriendo en `http://localhost:8080`
  (con MySQL activo, según tu `application.yaml`).

## Instalación

```bash
cd finanzas-front
npm install
```

Esto instala todas las dependencias:

| Paquete | Para qué |
|---|---|
| `react`, `react-dom` | Base de la UI |
| `react-router-dom` | Rutas / navegación entre páginas |
| `@tanstack/react-query` | Estado del servidor (fetch, caché, refetch) |
| `axios` | Cliente HTTP con interceptor JWT |
| `react-grid-layout` | Rejilla de widgets arrastrables y redimensionables |
| `chart.js` + `react-chartjs-2` | Gráficas (igual que el HTML) |

## Arrancar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`.

### Login

El backend autentica por **usuario** (no email). Usuarios semilla (`DataInitializer`):

- **admin / admin123** → `ROLE_ADMIN` (necesario: todos los `/api/**` exigen ADMIN)
- usuario / user123 → `ROLE_USER`

El botón **"Entrar con cuenta demo"** usa `admin` directamente.

## CORS (importante)

El backend **no tiene CORS configurado**. Para evitarlo en desarrollo, Vite **proxea**
`/api` → `http://localhost:8080` (ver `vite.config.ts`). Por eso las peticiones salen
desde el mismo origen y no hay problema de CORS.

Si más adelante despliegas el front en otro dominio, tendrás que añadir CORS en Spring:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override public void addCorsMappings(CorsRegistry r) {
        r.addMapping("/api/**")
         .allowedOrigins("http://localhost:5173")
         .allowedMethods("GET","POST","PUT","PATCH","DELETE");
    }
}
```

...y definir `VITE_API_BASE_URL` en un `.env` (ver `.env.example`).

## Scripts

- `npm run dev` — servidor de desarrollo con hot-reload
- `npm run build` — chequeo de tipos (`tsc`) + build de producción en `dist/`
- `npm run preview` — sirve el build de producción

## Estructura

```
src/
  main.tsx                 Punto de entrada (providers: query, tema, auth, router)
  App.tsx                  Rutas y guard de autenticación
  styles/
    tokens.css             Variables de tema (dark/light) portadas del HTML
    global.css             Estilos base + overrides de react-grid-layout
  lib/
    api.ts                 Instancia axios + interceptor JWT + manejo de errores
    finance.ts             Llamadas a los endpoints (/api/auth, /api/cuenta, ...)
    format.ts              Formato € y %
    chartSetup.ts          Registro de Chart.js + paleta de marca
  context/
    AuthContext.tsx        Sesión, login/register/logout, token en localStorage
    ThemeContext.tsx       Tema claro/oscuro (data-theme en <html>)
  hooks/useFinance.ts      Hooks react-query (cuentas, inversiones, deudas, ...)
  components/
    layout/                AppShell + Topbar (navbar, tema, menú de perfil)
    widgets/               Un archivo por widget + WidgetFrame + registry
  pages/
    Login.tsx              Pantalla de acceso (login / registro / demo)
    Dashboard.tsx          Rejilla de widgets (mover/redimensionar/ocultar/añadir)
    Placeholder.tsx        Resto de secciones (pendientes de portar)
  types/api.ts             Tipos espejo de los DTOs del backend
```

## El sistema de widgets

Cada widget vive en `src/components/widgets/` y se declara en `registry.tsx`
(id, título, componente y layout por defecto). Para **añadir uno nuevo**:

1. Crea el componente (p. ej. `MiWidget.tsx`).
2. Regístralo en `WIDGETS` dentro de `registry.tsx` con su tamaño por defecto.

Aparecerá automáticamente en el menú **"+ Añadir widget"** del dashboard.

Widgets incluidos: Resumen (KPIs), Distribución del patrimonio, Inversiones por
categoría, Gastos recurrentes, Deudas activas y Cuentas.

## Estado actual

- ✅ Login/registro + sesión JWT contra `/api/auth`
- ✅ Layout, navbar, tema claro/oscuro, menú de perfil
- ✅ Dashboard de widgets modulares conectado a la API real
- ⏳ Pendiente de portar: Movimientos, Nóminas, Recurrentes, Suscripciones,
  Deudas e Inversiones (páginas completas). El backend **no** expone aún un
  endpoint de dashboard (el controller está vacío) ni importe en gastos
  recurrentes; esas métricas se calculan en el cliente con lo disponible.
