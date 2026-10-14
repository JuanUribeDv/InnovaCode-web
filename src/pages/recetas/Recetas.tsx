import { useEffect, useState } from "react"
import { getRecetas, addReceta, updateReceta, deleteReceta, getInventario } from "../../firebase/firestore"
import type { Receta, IngredienteReceta, Producto } from "../../types"

const CATEGORIAS = ["Comida rápida", "Bebidas", "Postres", "Licores", "Alimentos", "Otro"]
const UNIDADES = ["und", "g", "kg", "mL", "L", "oz", "lb", "cda", "cdta", "taza"]

const RECETA_VACIA: Omit<Receta, "id"> = {
  nombre: "",
  categoria: "Comida rápida",
  descripcion: "",
  empresa_id: "empresa_demo",
  ingredientes: [],
  fechaCreacion: Date.now(),
}

export default function Recetas() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<Producto[]>([])

  // Modal receta
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Receta, "id">>(RECETA_VACIA)
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null)

  // Modal ingrediente
  const [modalIngrediente, setModalIngrediente] = useState(false)
  const [ingProductoId, setIngProductoId] = useState("")
  const [ingCantidad, setIngCantidad] = useState("")
  const [ingUnidad, setIngUnidad] = useState("und")

  const cargar = async () => {
    try {
      const [recs, prods] = await Promise.all([getRecetas(), getInventario()])
      setRecetas(recs)
      setProductos(prods)
    } catch (error) {
      console.error("Error cargando recetas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const filtradas = recetas.filter((r) => {
    const q = busqueda.toLowerCase()
    return !busqueda || r.nombre.toLowerCase().includes(q) || r.categoria.toLowerCase().includes(q)
  })

  const abrirNueva = () => {
    setEditId(null)
    setForm({ ...RECETA_VACIA, fechaCreacion: Date.now() })
    setModal(true)
  }

  const abrirEditar = (r: Receta) => {
    setEditId(r.id ?? null)
    setForm({
      nombre: r.nombre,
      categoria: r.categoria,
      descripcion: r.descripcion,
      empresa_id: r.empresa_id,
      ingredientes: [...r.ingredientes],
      fechaCreacion: r.fechaCreacion,
    })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || form.ingredientes.length === 0) return
    setGuardando(true)
    try {
      if (editId) {
        await updateReceta(editId, form)
      } else {
        await addReceta(form)
      }
      await cargar()
      setModal(false)
    } catch (error) {
      console.error("Error guardando receta:", error)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    try {
      await deleteReceta(id)
      await cargar()
    } catch (error) {
      console.error("Error eliminando receta:", error)
    } finally {
      setConfirmarEliminar(null)
    }
  }

  const abrirModalIngrediente = () => {
    setIngProductoId(productos[0]?.id ?? "")
    setIngCantidad("")
    setIngUnidad("und")
    setModalIngrediente(true)
  }

  const agregarIngrediente = () => {
    const prod = productos.find((p) => p.id === ingProductoId)
    if (!prod || !ingCantidad || Number(ingCantidad) <= 0) return
    const nuevo: IngredienteReceta = {
      productoId: prod.id!,
      nombre_producto: prod.nombre_producto,
      cantidad: Number(ingCantidad),
      unidad: ingUnidad,
    }
    setForm({ ...form, ingredientes: [...form.ingredientes, nuevo] })
    setModalIngrediente(false)
  }

  const quitarIngrediente = (idx: number) => {
    setForm({ ...form, ingredientes: form.ingredientes.filter((_, i) => i !== idx) })
  }

  const fmtCantidad = (cantidad: number, unidad: string) =>
    `${cantidad % 1 === 0 ? cantidad : cantidad.toFixed(2)} ${unidad}`

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar receta, categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 text-accent-purple px-4 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-plus text-[14px]" /> Nueva receta
        </button>
      </div>

      <div className="flex items-center gap-2 text-text-muted text-[12px]">
        <i className="ti ti-chef-hat text-accent-purple" />
        <span><strong className="text-text-primary">{recetas.length}</strong> recetas registradas</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recetas.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <i className="ti ti-chef-hat text-text-muted text-3xl" />
          <p className="text-text-secondary text-sm">Sin recetas registradas</p>
          <button onClick={abrirNueva} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors flex items-center gap-2">
            <i className="ti ti-plus" /> Crear primera receta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtradas.map((r) => (
            <div key={r.id} className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent-purple/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-text-primary font-medium text-[13px]">{r.nombre}</div>
                  <div className="text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/10 text-accent-purple border border-accent-purple/20 inline-block mt-1">
                    {r.categoria}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(r)} className="w-7 h-7 rounded-md bg-border flex items-center justify-center hover:bg-accent-purple/20 transition-colors">
                    <i className="ti ti-edit text-text-secondary text-xs" />
                  </button>
                  <button onClick={() => setConfirmarEliminar(r.id ?? null)} className="w-7 h-7 rounded-md bg-border flex items-center justify-center hover:bg-danger/20 transition-colors">
                    <i className="ti ti-trash text-danger text-xs" />
                  </button>
                </div>
              </div>

              {r.descripcion && (
                <p className="text-text-muted text-[11px] mb-3 line-clamp-2">{r.descripcion}</p>
              )}

              <div className="border-t border-border pt-3">
                <p className="text-text-muted text-[10px] uppercase tracking-wider mb-2">Ingredientes ({r.ingredientes.length})</p>
                {r.ingredientes.length === 0 ? (
                  <p className="text-text-muted text-[11px]">Sin ingredientes</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {r.ingredientes.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <div className="w-1 h-1 rounded-full bg-accent-purple" />
                        <span className="text-text-secondary flex-1 truncate">{ing.nombre_producto}</span>
                        <span className="text-text-muted">{fmtCantidad(ing.cantidad, ing.unidad)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={abrirNueva}
            className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-purple/40 hover:text-accent-purple transition-colors min-h-[180px]"
          >
            <i className="ti ti-plus text-2xl" />
            <span className="text-[12px]">Nueva receta</span>
          </button>
        </div>
      )}

      {/* ── Modal Receta ─────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">
                {editId ? "Editar receta" : "Nueva receta"}
              </h3>
              <button onClick={() => setModal(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Nombre de la receta *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Hamburguesa Clásica"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
              </div>

              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                >
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Descripción de la receta..."
                  rows={3}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors resize-none"
                />
              </div>

              {/* Ingredientes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-text-secondary text-[11px]">Ingredientes *</label>
                  <button
                    onClick={abrirModalIngrediente}
                    disabled={productos.length === 0}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors disabled:opacity-40"
                  >
                    <i className="ti ti-plus text-xs" /> Agregar
                  </button>
                </div>

                {form.ingredientes.length === 0 ? (
                  <div className="bg-bg-base border border-dashed border-border rounded-lg py-6 text-center">
                    <p className="text-text-muted text-[11px]">Aún no has agregado ingredientes</p>
                  </div>
                ) : (
                  <div className="bg-bg-base border border-border rounded-lg overflow-hidden">
                    {form.ingredientes.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0">
                        <div className="w-5 h-5 rounded-full bg-accent-purple/15 flex items-center justify-center text-accent-purple text-[9px] font-medium">
                          {idx + 1}
                        </div>
                        <span className="flex-1 text-text-primary text-[11.5px]">{ing.nombre_producto}</span>
                        <span className="text-text-muted text-[11px]">{fmtCantidad(ing.cantidad, ing.unidad)}</span>
                        <button
                          onClick={() => quitarIngrediente(idx)}
                          className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-danger/20 transition-colors"
                        >
                          <i className="ti ti-x text-danger text-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(false)} className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.nombre || form.ingredientes.length === 0}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-device-floppy text-base" /> {editId ? "Guardar cambios" : "Crear receta"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Agregar Ingrediente ────────────────────────── */}
      {modalIngrediente && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">Agregar ingrediente</h3>
              <button onClick={() => setModalIngrediente(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Producto *</label>
                <select
                  value={ingProductoId}
                  onChange={(e) => setIngProductoId(e.target.value)}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                >
                  {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre_producto}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={ingCantidad}
                    onChange={(e) => setIngCantidad(e.target.value)}
                    placeholder="Ej. 200"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Unidad</label>
                  <select
                    value={ingUnidad}
                    onChange={(e) => setIngUnidad(e.target.value)}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  >
                    {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalIngrediente(false)} className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={agregarIngrediente}
                disabled={!ingProductoId || !ingCantidad || Number(ingCantidad) <= 0}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ─────────────────────────── */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-trash text-danger text-xl" />
            </div>
            <h3 className="text-text-primary font-medium mb-1">¿Eliminar receta?</h3>
            <p className="text-text-secondary text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarEliminar(null)} className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmarEliminar)} className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}