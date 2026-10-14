import { useEffect, useState } from "react"
import { getUsuarios, updateUsuario } from "../../firebase/firestore"
import type { Usuario } from "../../types"
import Badge from "../../components/ui/Badge"

const rolVariant: Record<string, "purple" | "info" | "success"> = {
  administrador: "purple",
  cajero: "info",
  vendedor: "success",
}

const estadoVariant: Record<string, "success" | "warning" | "gray"> = {
  activo: "success",
  pendiente: "warning",
  inactivo: "gray",
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroRol, setFiltroRol] = useState("Todos")
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [loading, setLoading] = useState(true)

  const cargar = async () => {
    const data = await getUsuarios()
    setUsuarios(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const pendientes = usuarios.filter((u) => u.estado === "pendiente")

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase()
    const matchQ = !busqueda || u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q) || u.numeroDocumento?.includes(busqueda)
    const matchRol = filtroRol === "Todos" || u.rol.toLowerCase() === filtroRol.toLowerCase()
    const matchEstado = filtroEstado === "Todos" || u.estado.toLowerCase() === filtroEstado.toLowerCase()
    return matchQ && matchRol && matchEstado
  })

  const aprobar = async (id: string) => {
    await updateUsuario(id, { estado: "activo" })
    await cargar()
  }

  const rechazar = async (id: string) => {
    await updateUsuario(id, { estado: "inactivo" })
    await cargar()
  }

  const toggleEstado = async (u: Usuario) => {
    const nuevoEstado = u.estado === "activo" ? "inactivo" : "activo"
    await updateUsuario(u.id!, { estado: nuevoEstado })
    await cargar()
  }

  const initiales = (nombre: string) =>
    nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()

  return (
    <div className="flex flex-col gap-4">
      {/* Banner pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-warning/8 border border-warning/25 rounded-xl px-4 py-3 flex items-center gap-3">
          <i className="ti ti-clock text-warning text-xl" />
          <div className="flex-1">
            <span className="text-text-primary text-sm">
              <strong className="text-warning">{pendientes.length} usuario{pendientes.length > 1 ? "s" : ""}</strong> pendiente{pendientes.length > 1 ? "s" : ""} de aprobación
            </span>
          </div>
          <button
            onClick={() => setFiltroEstado("Pendiente")}
            className="text-[11.5px] px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success hover:bg-success/15 transition-colors flex items-center gap-1"
          >
            <i className="ti ti-check text-sm" />
            Revisar solicitudes
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded-lg text-sm outline-none"
        >
          {["Todos","Administrador","Cajero","Vendedor"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded-lg text-sm outline-none"
        >
          {["Todos","Activo","Pendiente","Inactivo"].map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[11.5px]">
            <thead className="bg-bg-base">
              <tr>
                {["Usuario","Correo","Teléfono","Rol","Estado","Acciones"].map((h) => (
                  <th key={h} className="text-text-muted font-medium text-left px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-text-muted py-12">
                    <i className="ti ti-users-off text-2xl block mb-2" />
                    Sin usuarios para mostrar
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent-purple/[0.03] transition-colors ${
                      u.estado === "pendiente" ? "bg-warning/[0.03]" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple text-[10px] font-medium min-w-7">
                          {initiales(u.nombre)}
                        </div>
                        <div>
                          <div className="text-text-primary font-medium">{u.nombre}</div>
                          <div className="text-text-muted text-[10px]">
                            {u.tipoDocumento}: {u.numeroDocumento}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">{u.correo}</td>
                    <td className="px-3 py-2 text-text-secondary">{u.telefono || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge
                        label={u.rol.charAt(0).toUpperCase() + u.rol.slice(1)}
                        variant={rolVariant[u.rol.toLowerCase()] ?? "gray"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        label={u.estado.charAt(0).toUpperCase() + u.estado.slice(1)}
                        variant={estadoVariant[u.estado.toLowerCase()] ?? "gray"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {u.estado === "pendiente" ? (
                          <>
                            <button
                              onClick={() => aprobar(u.id!)}
                              className="w-7 h-7 rounded-md bg-success/10 border border-success/30 flex items-center justify-center hover:bg-success/20 transition-colors"
                              title="Aprobar"
                            >
                              <i className="ti ti-check text-success text-xs" />
                            </button>
                            <button
                              onClick={() => rechazar(u.id!)}
                              className="w-7 h-7 rounded-md bg-danger/10 border border-danger/30 flex items-center justify-center hover:bg-danger/20 transition-colors"
                              title="Rechazar"
                            >
                              <i className="ti ti-x text-danger text-xs" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toggleEstado(u)}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                              u.estado === "activo"
                                ? "bg-danger/10 border border-danger/30 hover:bg-danger/20"
                                : "bg-success/10 border border-success/30 hover:bg-success/20"
                            }`}
                            title={u.estado === "activo" ? "Desactivar" : "Activar"}
                          >
                            <i className={`ti ${u.estado === "activo" ? "ti-ban text-danger" : "ti-check text-success"} text-xs`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}