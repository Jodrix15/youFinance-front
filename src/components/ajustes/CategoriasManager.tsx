import { useMemo, useState, type FormEvent } from 'react'
import { FAMILIA_OPTIONS, familiaLabel } from '@/lib/familias'
import {
  useActualizarCategoria,
  useCategorias,
  useCrearCategoria,
  useEliminarCategoria,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Modal from '@/components/ui/Modal'
import IconButton from '@/components/ui/IconButton'
import { notifyOk, notifyError } from '@/lib/notify'
import { apiErrorMessage } from '@/lib/api'
import Skeleton from '@/components/ui/Skeleton'
import Select from '@/components/ui/Select'
import type { CategoriaResponse, OrigenIngreso, TipoMovimiento } from '@/types/api'
import s from './CategoriasManager.module.css'

/** Id del formulario del modal: permite que el botón de guardar viva en el footer. */
const FORM_ID = 'form-categoria'

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

const FAMILIA_COLOR: Record<OrigenIngreso, string> = {
  ACTIVO: 'var(--teal)',
  PASIVO: 'var(--blue)',
  INVERSION: 'var(--purple)',
}


function FamiliaBadge({ familia }: { familia: OrigenIngreso }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: FAMILIA_COLOR[familia],
        border: `1px solid ${FAMILIA_COLOR[familia]}`,
        borderRadius: 20,
        padding: '1px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      {familiaLabel(familia)}
    </span>
  )
}

export default function CategoriasManager() {
  const { data: categorias, isLoading, isError, error } = useCategorias()
  const crear = useCrearCategoria()
  const actualizar = useActualizarCategoria()
  const eliminar = useEliminarCategoria()
  const confirm = useConfirm()

  // Alta y edición comparten el mismo modal. editCat null = alta.
  const [formOpen, setFormOpen] = useState(false)
  const [editCat, setEditCat] = useState<CategoriaResponse | null>(null)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO')
  const [origen, setOrigen] = useState<OrigenIngreso>('ACTIVO')

  const porTipo = useMemo(() => {
    const map: Record<TipoMovimiento, CategoriaResponse[]> = {
      GASTO: [],
      INGRESO: [],
      INVERSION: [],
    }
    for (const c of categorias ?? []) map[c.tipo]?.push(c)
    return map
  }, [categorias])

  function abrirNueva() {
    setEditCat(null)
    setNombre('')
    setTipo('GASTO')
    setOrigen('ACTIVO')
    setFormOpen(true)
  }

  function abrirEditar(c: CategoriaResponse) {
    setEditCat(c)
    setNombre(c.nombre)
    // El tipo de una categoría no se cambia desde aquí: se conserva el suyo.
    setTipo(c.tipo)
    setOrigen(c.origenIngreso ?? 'ACTIVO')
    setFormOpen(true)
  }

  function cerrarForm() {
    setFormOpen(false)
    setEditCat(null)
    setNombre('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) return
    const origenIngreso = tipo === 'INGRESO' ? origen : undefined
    try {
      if (editCat) {
        await actualizar.mutateAsync({ id: editCat.id, nombre: n, tipo: editCat.tipo, origenIngreso })
        notifyOk('Categoría actualizada')
      } else {
        await crear.mutateAsync({ nombre: n, tipo, origenIngreso })
        notifyOk('Categoría creada')
      }
      cerrarForm()
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
      if (editCat?.id === c.id) cerrarForm()
    } catch (err) {
      notifyError(err)
    }
  }

  return (
    <section className={s.card}>
      <div className="block-head">
        <h2 className={s.cardTitle} style={{ marginBottom: 0 }}>
          Gestión de categorías
        </h2>
        <button type="button" className={s.btn} onClick={abrirNueva} disabled={crear.isPending}>
          + Añadir categoría
        </button>
      </div>

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
                  {porTipo[g.tipo].map((c) => (
                      <li key={c.id} className={s.row}>
                        <span className={s.rowName}>{c.nombre}</span>
                        {c.tipo === 'INGRESO' &&
                          (c.origenIngreso ? (
                            <FamiliaBadge familia={c.origenIngreso} />
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'var(--tx3)',
                                border: '1px dashed var(--border2)',
                                borderRadius: 20,
                                padding: '1px 8px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Sin clasificar
                            </span>
                          ))}
                        <IconButton
                          icon="edit"
                          label={`Editar ${c.nombre}`}
                          onClick={() => abrirEditar(c)}
                        />
                        <IconButton
                          icon="delete"
                          label={`Eliminar ${c.nombre}`}
                          danger
                          onClick={() => onEliminar(c)}
                        />
                      </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={cerrarForm}
        maxWidth={440}
        title={editCat ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <button
              type="button"
              className="btn-ghost"
              onClick={cerrarForm}
              disabled={crear.isPending || actualizar.isPending}
            >
              Cancelar
            </button>
            <button
              className={s.btn}
              type="submit"
              form={FORM_ID}
              disabled={crear.isPending || actualizar.isPending || !nombre.trim()}
            >
              {crear.isPending || actualizar.isPending
                ? 'Guardando…'
                : editCat
                  ? 'Guardar cambios'
                  : 'Añadir categoría'}
            </button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit}>
          <div className={s.modalField}>
            <label>Nombre</label>
            <input
              className={s.input}
              type="text"
              placeholder="Ej: Alimentación"
              value={nombre}
              maxLength={40}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className={s.modalField}>
            <label>Tipo</label>
            {editCat ? (
              // El tipo no se puede cambiar: condicionaría el signo de los importes.
              <div className={s.readonly}>
                {TIPOS.find((t) => t.value === editCat.tipo)?.label ?? editCat.tipo}
              </div>
            ) : (
              <Select value={tipo} options={TIPOS} onChange={setTipo} ariaLabel="Tipo" />
            )}
          </div>
          {tipo === 'INGRESO' && (
            <div className={s.modalField}>
              <label>Familia del ingreso</label>
              <Select
                value={origen}
                options={FAMILIA_OPTIONS}
                onChange={setOrigen}
                ariaLabel="Familia del ingreso"
              />
            </div>
          )}
        </form>
      </Modal>
    </section>
  )
}
