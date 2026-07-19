import { useMemo, useState, type FormEvent } from 'react'
import {
  useActualizarCategoria,
  useCategorias,
  useCrearCategoria,
  useEliminarCategoria,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { notifyOk, notifyError } from '@/lib/notify'
import { apiErrorMessage } from '@/lib/api'
import Skeleton from '@/components/ui/Skeleton'
import Select from '@/components/ui/Select'
import type { CategoriaResponse, TipoMovimiento } from '@/types/api'
import s from './CategoriasManager.module.css'

const TIPOS: { value: TipoMovimiento; label: string }[] = [
  { value: 'GASTO', label: 'Gasto' },
  { value: 'INGRESO', label: 'Ingreso' },
  { value: 'INVERSION', label: 'Inversión' },
]

const GRUPOS: { tipo: TipoMovimiento; label: string }[] = [
  { tipo: 'GASTO', label: 'Gastos' },
  { tipo: 'INGRESO', label: 'Ingresos' },
  { tipo: 'INVERSION', label: 'Inversiones' },
]

export default function CategoriasManager() {
  const { data: categorias, isLoading, isError, error } = useCategorias()
  const crear = useCrearCategoria()
  const actualizar = useActualizarCategoria()
  const eliminar = useEliminarCategoria()
  const confirm = useConfirm()

  // Alta
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO')

  // Edición inline (solo el nombre; el tipo se conserva)
  const [editId, setEditId] = useState<number | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const porTipo = useMemo(() => {
    const map: Record<TipoMovimiento, CategoriaResponse[]> = {
      GASTO: [],
      INGRESO: [],
      INVERSION: [],
    }
    for (const c of categorias ?? []) map[c.tipo]?.push(c)
    return map
  }, [categorias])

  async function onCrear(e: FormEvent) {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    try {
      await crear.mutateAsync({ nombre: n, tipo })
      setNombre('')
      notifyOk('Categoría creada')
    } catch (err) {
      notifyError(err)
    }
  }

  function startEdit(c: CategoriaResponse) {
    setEditId(c.id)
    setEditNombre(c.nombre)
  }

  async function saveEdit(c: CategoriaResponse) {
    const n = editNombre.trim()
    if (!n) return
    try {
      await actualizar.mutateAsync({ id: c.id, nombre: n, tipo: c.tipo })
      setEditId(null)
      notifyOk('Categoría actualizada')
    } catch (err) {
      notifyError(err)
    }
  }

  async function onEliminar(c: CategoriaResponse) {
    const ok = await confirm({
      title: 'Eliminar categoría',
      message: `¿Seguro que quieres eliminar "${c.nombre}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmText: 'Eliminar',
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync(c.id)
      notifyOk('Categoría eliminada')
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>Gestión de categorías</h2>

      {/* Alta */}
      <form className={s.crear} onSubmit={onCrear}>
        <input
          className={s.input}
          type="text"
          placeholder="Nueva categoría…"
          value={nombre}
          maxLength={40}
          onChange={(e) => setNombre(e.target.value)}
        />
        <div className={s.selectWrap}>
          <Select value={tipo} options={TIPOS} onChange={setTipo} ariaLabel="Tipo" />
        </div>
        <button
          className={s.btn}
          type="submit"
          disabled={crear.isPending || !nombre.trim()}
        >
          Añadir
        </button>
      </form>

      {isLoading ? (
        <Skeleton width="100%" height={160} style={{ borderRadius: 12 }} />
      ) : isError ? (
        <div className={s.error}>{apiErrorMessage(error)}</div>
      ) : (
        <div className={s.grupos}>
          {GRUPOS.map((g) => (
            <div key={g.tipo} className={s.grupo}>
              <div className={s.grupoHead}>
                <span className={`${s.dot} ${s[`dot_${g.tipo}`]}`} />
                {g.label}
                <span className={s.count}>{porTipo[g.tipo].length}</span>
              </div>

              {porTipo[g.tipo].length === 0 ? (
                <div className={s.vacio}>Sin categorías</div>
              ) : (
                <ul className={s.lista}>
                  {porTipo[g.tipo].map((c) =>
                    editId === c.id ? (
                      <li key={c.id} className={s.row}>
                        <input
                          className={s.rowInput}
                          value={editNombre}
                          maxLength={40}
                          autoFocus
                          onChange={(e) => setEditNombre(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(c)
                            if (e.key === 'Escape') setEditId(null)
                          }}
                        />
                        <button
                          className={`${s.iconBtn} ${s.iconOk}`}
                          title="Guardar"
                          aria-label="Guardar"
                          onClick={() => saveEdit(c)}
                          disabled={actualizar.isPending || !editNombre.trim()}
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                          </svg>
                        </button>
                        <button
                          className={s.iconBtn}
                          title="Cancelar"
                          aria-label="Cancelar"
                          onClick={() => setEditId(null)}
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" />
                          </svg>
                        </button>
                      </li>
                    ) : (
                      <li key={c.id} className={s.row}>
                        <span className={s.rowName}>{c.nombre}</span>
                        <button
                          className={s.iconBtn}
                          title="Editar"
                          aria-label="Editar"
                          onClick={() => startEdit(c)}
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z" />
                          </svg>
                        </button>
                        <button
                          className={`${s.iconBtn} ${s.iconDanger}`}
                          title="Eliminar"
                          aria-label="Eliminar"
                          onClick={() => onEliminar(c)}
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
                          </svg>
                        </button>
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
