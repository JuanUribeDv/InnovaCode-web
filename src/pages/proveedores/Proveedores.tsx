import { useEffect, useState } from "react"
import {
  getProveedores,
  addProveedor,
  updateProveedor,
  deleteProveedor,
} from "../../firebase/firestore"
import type { Proveedor } from "../../types"

const AVATAR_COLORS = [
  "bg-accent-purple text-white",
  "bg-accent-blue text-white",
  "bg-success/80 text-white",
  "bg-warning/80 text-black",
  "bg-danger/80 text-white",
]

function initiales(nombre: string) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

const EMPTY: Omit<Proveedor, "id"> = {
  nombre: "",
  nit: "",
  contacto: "",
  email: "",
  empresa_id: "empresa_demo",
  fecha_creacion: "",
}

const formatFecha = (fecha: unknown): string => {
  if (!fecha) return "—"
  if (typeof fecha === "string") return fecha
  if (typeof fecha === "object" && fecha !== null && "toDate" in fecha) {
    return (fecha as { toDate: () => Date }).toDate().toLocaleDateString("es-CO")
  }
  return "—"
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<Omit<Proveedor, "id">>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null)

  const cargar = async () => {
    try {
      const data = await getProveedores()
      setProveedores(data)
    } catch (error) {
      console.error("Error cargando proveedores:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = proveedores.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.nit.includes(busqueda) ||
      p.contacto.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirNuevo = () => {
    setEditId(null)
    setForm(EMPTY)
    setModal(true)
  }

  const abrirEditar = (p: Proveedor) => {
    setEditId(p.id ?? null)
    setForm({
      nombre: p.nombre,
      nit: p.nit,
      contacto: p.contacto,
      email: p.email,
      empresa_id: p.empresa_id,
      fecha_creacion: p.fecha_creacion,
    })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || !form.nit) return
    setGuardando(true)
    const data = {
      ...form,
      fecha_creacion:
        form.fecha_creacion ||
        new Date().toLocaleDateString("es-CO"),
    }
    try {
      if (editId) {
        await updateProveedor(editId, data)
      } else {
        await addProveedor(data)
      }
      await cargar()
      setModal(false)
    } catch (error) {
      console.error("Error guardando proveedor:", error)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    try {
      await deleteProveedor(id)
      await cargar()
    } catch (error) {
      console.error("Error eliminando proveedor:", error)
    } finally {
      setConfirmarEliminar(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar por nombre, NIT, contacto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 text-accent-purple px-4 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-plus text-[14px]" />
          Nuevo proveedor
        </button>
      </div>

      {/* Stat rápida */}
      <div className="flex items-center gap-2 text-text-muted text-[12px]">
        <i className="ti ti-truck text-accent-purple" />
        <span>
          <strong className="text-text-primary">{proveedores.length}</strong>{" "}
          proveedores registrados
        </span>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proveedores.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <i className="ti ti-truck-off text-text-muted text-3xl" />
          <p className="text-text-secondary text-sm">Sin proveedores registrados</p>
          <button
            onClick={abrirNuevo}
            className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors flex items-center gap-2"
          >
            <i className="ti ti-plus" />
            Agregar primer proveedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtrados.map((p, idx) => (
            <div
              key={p.id}
              className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent-purple/30 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-medium text-[13px] min-w-10 ${
                    AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  }`}
                >
                  {initiales(p.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary font-medium text-[12.5px] truncate">
                    {p.nombre}
                  </div>
                  <div className="text-text-muted text-[10.5px]">
                    NIT: {p.nit}
                  </div>
                </div>
                <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-success/10 text-success font-medium">
                  Activo
                </span>
              </div>

              <div className="flex flex-col gap-1.5 mb-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <i className="ti ti-user text-text-muted text-[13px]" />
                  <span className="text-text-secondary">{p.contacto || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <i className="ti ti-mail text-text-muted text-[13px]" />
                  <span className="text-text-secondary truncate">{p.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <i className="ti ti-calendar text-text-muted text-[13px]" />
                  <span className="text-text-muted">
                    Desde {formatFecha(p.fecha_creacion)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 pt-3 border-t border-border">
                <button
                  onClick={() => abrirEditar(p)}
                  className="w-7 h-7 rounded-md bg-border flex items-center justify-center hover:bg-accent-purple/20 transition-colors"
                >
                  <i className="ti ti-edit text-text-secondary text-xs" />
                </button>
                <button
                  onClick={() => setConfirmarEliminar(p.id ?? null)}
                  className="w-7 h-7 rounded-md bg-border flex items-center justify-center hover:bg-danger/20 transition-colors"
                >
                  <i className="ti ti-trash text-danger text-xs" />
                </button>
              </div>
            </div>
          ))}

          {/* Tarjeta agregar */}
          <button
            onClick={abrirNuevo}
            className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-text-muted hover:border-accent-purple/40 hover:text-accent-purple transition-colors min-h-[180px]"
          >
            <i className="ti ti-plus text-2xl" />
            <span className="text-[12px]">Agregar proveedor</span>
          </button>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">
                {editId ? "Editar proveedor" : "Nuevo proveedor"}
              </h3>
              <button
                onClick={() => setModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { label: "Nombre del negocio *", key: "nombre", placeholder: "Ej: Distribuidora La 14" },
                { label: "NIT *", key: "nit", placeholder: "Ej: 900.123.456-7" },
                { label: "Persona de contacto", key: "contacto", placeholder: "Ej: Carlos Pérez" },
                { label: "Correo electrónico", key: "email", placeholder: "ventas@proveedor.co" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-text-secondary text-[11px] block mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !form.nombre || !form.nit}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <i className="ti ti-device-floppy text-base" />
                    {editId ? "Guardar cambios" : "Crear proveedor"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmarEliminar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <i className="ti ti-trash text-danger text-xl" />
            </div>
            <h3 className="text-text-primary font-medium mb-1">¿Eliminar proveedor?</h3>
            <p className="text-text-secondary text-sm mb-5">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmarEliminar(null)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmarEliminar)}
                className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}