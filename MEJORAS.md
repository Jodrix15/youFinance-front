# Jodrix Finance — Posibles mejoras

Lista de mejoras y actualizaciones pendientes, organizada por área y prioridad.
Refleja el estado actual de la app (dashboard con widgets, Cuentas, Movimientos por
cuenta, Recurrentes, Suscripciones, Deudas e Inversiones ya funcionando y conectados
al backend).

---

## 🔴 Alta prioridad (funcional / bloqueante)

- **Roles del registro**: el `signup` crea usuarios con `ROLE_USER`, pero todo `/api/**`
  exige `ROLE_ADMIN`. Un usuario que se registre **no puede usar la app**. Hay que
  decidir el modelo de roles (dar acceso a `ROLE_USER` o similar).
- **Borrar registros**: falta poder eliminar movimientos, deudas, inversiones y
  suscripciones/recurrentes. El endpoint `DELETE` de recurrente ya existe pero no está
  expuesto en la UI; el resto no tiene endpoint.
- **Sección de Nóminas**: pendiente de construir (ahora está oculta del menú).
- **Enlazar flujos con saldos**: aportar a una inversión o pagar una deuda **no afecta**
  al saldo de ninguna cuenta. Decidir si deben descontar de una cuenta (cambio de modelo
  en backend) o dejarlo desacoplado y documentarlo.
- **Registrar pago** de recurrentes/suscripciones: el endpoint `POST /{id}/pago` existe
  (avanza el próximo pago) pero no hay botón en la UI.

---

## 🟠 Datos e integridad (backend)

- **Histórico de patrimonio**: guardar snapshots mensuales de patrimonio para que el
  widget de evolución sea 100% real. Hoy la curva se **reconstruye** de las fechas de los
  movimientos (caja) tomando inversiones y deudas como constantes.
- **Cuota real de deuda**: añadir un campo de cuota mensual a las deudas. Hoy "Cuotas de
  deuda" en el widget de gastos fijos es una **estimación** (pendiente ÷ meses hasta el
  vencimiento).
- **Tipo de deuda**: añadir un campo `tipo` (hipoteca, préstamo, tarjeta…). Ahora, a falta
  de ese campo, en el widget se muestra el **acreedor**.
- **Endpoint global de transacciones + paginación**: hoy los movimientos se juntan
  pidiendo las transacciones cuenta por cuenta (N+1). Un `GET /api/transacciones`
  paginado escalaría mejor.
- **Endpoint de dashboard agregado**: reduciría llamadas y lógica duplicada en el cliente.
- **Recalcular saldo al editar/borrar** una transacción: revisar `aplicarTransaccion` en
  la actualización para no descuadrar el saldo de la cuenta.
- **Validaciones**: importes ≥ 0 (ya en el front), fechas coherentes (vencimiento
  posterior al alta), y revisar validaciones en todos los DTO del backend.

---

## 🟡 Usabilidad / UX

- **Confirmación al borrar** y **toasts** de éxito/error (hoy los errores son solo inline y
  no hay confirmación de guardado).
- **Cerrar modales con Esc** y gestión del foco al abrir/cerrar.
- **Skeletons de carga** en vez de "Cargando…" y **actualizaciones optimistas**.
- **Empty states con acción** directa ("Añadir tu primera cuenta") en lugar de solo texto.
- **Ordenar tablas** por columna (fecha, importe…) y **paginación** en históricos largos.
- **Campo de importe** con símbolo € y coma/punto consistentes.
- **Blindar importes negativos** colados: que no descuadren los KPIs ni se muestren como
  "+-50" (usar valor absoluto para signo/formato donde aplique).

---

## 🔵 Seguridad (importante si sale de local)

- **Secretos en claro**: `jwt.secret` y la contraseña de MySQL están en
  `application.yaml`. Deberían ir en variables de entorno.
- **Token en `localStorage`**: cómodo pero vulnerable a XSS; valorar cookie `httpOnly`.
- **CORS**: hoy funciona por el proxy de Vite; en producción hay que configurarlo en Spring.
- **Rate limiting** en `/api/auth/login` para frenar fuerza bruta.

---

## ⚡ Rendimiento

- **Code-splitting** con `React.lazy` por página/sección (el bundle ya avisa de >500 kB).
- **Afinar la caché de React Query** (`staleTime` por recurso) para evitar refetches.

---

## 🧱 Calidad de código / mantenibilidad

- **Tests**: no hay ninguno. Unitarios en el backend (servicios, cálculo de intereses y
  plusvalías) y de componente/E2E en el front.
- **Componentes compartidos**: las secciones repiten mucho (KPIs, tabs, tarjetas, modal,
  formularios). Extraer `Kpi`, `Card`, `Modal`, `MoneyInput`, `DonutCard`, `Tabs`.
- **ErrorBoundary** + manejo de errores centralizado (interceptor + toasts).
- **Limpiar código muerto**: `src/pages/Movimientos.tsx` quedó huérfano tras el cambio a
  la sección Cuentas.

---

## ♿ Accesibilidad y responsive

- **Contraste y focus** visibles en inputs/botones; `aria-label` en iconos.
- **Tablas en móvil**: pueden desbordar; una vista de tarjetas apiladas iría mejor.
- **Navegación por teclado** completa en modales y menús.

---

## ✨ Extras que aportarían valor

- **Importar extractos** (PDF/CSV) para no meter movimientos a mano.
- **Presupuestos por categoría** con alertas al superarlos.
- **Exportar** a CSV/Excel y **modo impresión** de informes.
- **Notas/etiquetas** en movimientos.
- **Multi-moneda** y recordar preferencia de tema del sistema.

---

## ⭐ Top recomendado (por dónde empezar)

1. **Arreglar el modelo de roles del registro** — sin esto, solo `admin` puede usar la app.
2. **Borrar / registrar pago** en las secciones (acciones básicas que faltan).
3. **Snapshots de patrimonio + cuota real de deuda** en el backend, para que evolución y
   gastos fijos dejen de estimar.
