import { useEffect, useState } from "react"
import { getAllCompras, addCompra, getProveedores } from "../../firebase/firestore"
import type { Compra, Proveedor, Producto } from "../../types"
import { getInventario } from "../../firebase/firestore"
import Badge from "../../components/ui/Badge"
import KpiCard from "../../components/ui/KpiCard"
import { exportarComprasExcel, exportarComprasPDF } from "../../utils/exportUtils"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString("es-CO")}`
}

const PAGE_SIZE = 10

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [filtradas, setFiltradas] = useState<Compra[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroProveedor, setFiltroProveedor] = useState("Todos")
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)

  // Modal nueva compra
  const [modalCompra, setModalCompra] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("")
  const [productoSeleccionado, setProductoSeleccionado] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [precioU, setPrecioU] = useState("")
  const [fecha, setFecha] = useState("")
  const [guardando, setGuardando] = useState(false)

  const cargarDatos = async () => {
    const data = await getAllCompras()
    const sorted = data.sort((a, b) => {
      const parseFecha = (f: string) => {
        const [d, m, y] = f.split("/").map(Number)
        return new Date(y, m - 1, d).getTime()
      }
      return parseFecha(b.fecha) - parseFecha(a.fecha)
    })
    setCompras(sorted)
    setFiltradas(sorted)
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const filtrosProveedores = ["Todos", ...Array.from(new Set(compras.map((c) => c.nombre_proveedor)))]

  useEffect(() => {
    let result = compras
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(
        (c) =>
          c.nombre_producto.toLowerCase().includes(q) ||
          c.nombre_proveedor.toLowerCase().includes(q)
      )
    }
    if (filtroProveedor !== "Todos") {
      result = result.filter((c) => c.nombre_proveedor === filtroProveedor)
    }
    setFiltradas(result)
    setPagina(1)
  }, [busqueda, filtroProveedor, compras])

  const totalGeneral = compras.reduce((s, c) => s + c.precio_total, 0)
  const hoy = new Date()
    .toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "/")
  const comprasHoy = compras.filter((c) => c.fecha === hoy)
  const totalHoy = comprasHoy.reduce((s, c) => s + c.precio_total, 0)
  const proveedoresActivos = new Set(compras.map((c) => c.nombre_proveedor)).size

  const totalPaginas = Math.ceil(filtradas.length / PAGE_SIZE)
  const paginadas = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const proveedorColor = (nombre: string) => {
    const opts: Array<"success" | "purple" | "warning" | "info"> = ["success", "purple", "warning", "info"]
    return opts[nombre.charCodeAt(0) % opts.length] ?? "gray"
  }

  const abrirModalCompra = async () => {
    const [provs, prods] = await Promise.all([getProveedores(), getInventario()])
    setProveedores(provs)
    setProductos(prods)
    setProveedorSeleccionado(provs[0]?.id ?? "")
    setProductoSeleccionado(prods[0]?.id ?? "")
    setCantidad("")
    setPrecioU("")
    setFecha(hoy)
    setModalCompra(true)
  }

  const guardarCompra = async () => {
    const prov = proveedores.find((p) => p.id === proveedorSeleccionado)
    const prod = productos.find((p) => p.id === productoSeleccionado)
    if (!prov || !prod || !cantidad || !precioU || !fecha) return
    setGuardando(true)
    try {
      const nuevaCompra: Omit<Compra, "id"> = {
        nombre_producto: prod.nombre_producto,
        nombre_proveedor: prov.nombre,
        cantidad: Number(cantidad),
        precio_u: Number(precioU),
        precio_total: Number(cantidad) * Number(precioU),
        fecha,
        empresa_id: "empresa_demo",
        origen: "modulo_compras",
      }
      await addCompra(nuevaCompra)
      await cargarDatos()
      setModalCompra(false)
    } catch (error) {
      console.error("Error guardando compra:", error)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total compras" value={fmt(totalGeneral)} sub={`${compras.length} registros`} icon="ti-shopping-cart" />
        <KpiCard label="Compras hoy" value={fmt(totalHoy)} sub={`${comprasHoy.length} registros hoy`} subType="neutral" icon="ti-calendar" />
        <KpiCard label="Proveedores activos" value={String(proveedoresActivos)} sub="Distintos este período" subType="neutral" icon="ti-truck" />
        <KpiCard label="Promedio por compra" value={fmt(compras.length > 0 ? totalGeneral / compras.length : 0)} sub="Por transacción" subType="neutral" icon="ti-receipt-2" />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar producto, proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <select
          value={filtroProveedor}
          onChange={(e) => setFiltroProveedor(e.target.value)}
          className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded-lg text-sm outline-none"
        >
          {filtrosProveedores.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button
          onClick={() => exportarComprasExcel(filtradas)}
          className="flex items-center gap-2 bg-success/10 border border-success/30 text-success px-3 py-2 rounded-lg text-sm hover:bg-success/15 transition-colors ml-auto"
        >
          <i className="ti ti-file-spreadsheet text-[14px]" /> Exportar Excel
        </button>
        <button
          onClick={() => exportarComprasPDF(filtradas, [
            { label: "Total compras", value: fmt(totalGeneral), color: [91, 164, 245] },
            { label: "Compras hoy", value: fmt(totalHoy), color: [200, 213, 232] },
            { label: "Proveedores activos", value: String(proveedoresActivos), color: [200, 213, 232] },
            { label: "Promedio", value: fmt(compras.length > 0 ? totalGeneral / compras.length : 0), color: [200, 213, 232] },
          ])}
          className="flex items-center gap-2 bg-accent-purple/12 border border-accent-purple/30 text-accent-purple px-3 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-file-type-pdf text-[14px]" /> Exportar PDF
        </button>
        <button
          onClick={abrirModalCompra}
          className="flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 text-accent-purple px-3 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-plus text-[14px]" /> Nueva compra
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead className="bg-bg-base">
                <tr>
                  {["Fecha", "Producto", "Proveedor", "Cant.", "Precio u.", "Total", "Registrado por"].map((h) => (
                    <th key={h} className="text-text-muted font-medium text-left px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-text-muted py-12">
                      <i className="ti ti-shopping-cart-off text-2xl block mb-2" />
                      Sin compras para mostrar
                    </td>
                  </tr>
                ) : (
                  paginadas.map((c, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-accent-purple/[0.03] transition-colors">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{c.fecha}</td>
                      <td className="px-3 py-2 text-text-primary font-medium">{c.nombre_producto}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                          <span className="text-text-secondary">{c.nombre_proveedor}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{c.cantidad}</td>
                      <td className="px-3 py-2 text-text-secondary">{fmt(c.precio_u)}</td>
                      <td className="px-3 py-2 text-accent-blue font-medium">{fmt(c.precio_total)}</td>
                      <td className="px-3 py-2">
                        <Badge label={c.origen ?? "Manual"} variant={proveedorColor(c.nombre_proveedor)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-text-muted text-[11px]">
                Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtradas.length)} de {filtradas.length} registros
              </span>
              <div className="flex gap-1">
                <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina === 1} className="w-7 h-7 rounded-md bg-border flex items-center justify-center text-text-secondary disabled:opacity-40 hover:bg-accent-purple/20 transition-colors">
                  <i className="ti ti-chevron-left text-xs" />
                </button>
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => i + 1).map((n) => (
                  <button key={n} onClick={() => setPagina(n)} className={`w-7 h-7 rounded-md text-[11px] transition-colors ${pagina === n ? "bg-accent-purple/20 text-accent-purple" : "bg-border text-text-secondary hover:bg-accent-purple/10"}`}>{n}</button>
                ))}
                <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="w-7 h-7 rounded-md bg-border flex items-center justify-center text-text-secondary disabled:opacity-40 hover:bg-accent-purple/20 transition-colors">
                  <i className="ti ti-chevron-right text-xs" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nueva Compra ───────────────────────────────── */}
      {modalCompra && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">Nueva compra</h3>
              <button onClick={() => setModalCompra(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Proveedor *</label>
                <select
                  value={proveedorSeleccionado}
                  onChange={(e) => setProveedorSeleccionado(e.target.value)}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                >
                  {proveedores.length === 0
                    ? <option value="">Sin proveedores registrados</option>
                    : proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre} — NIT: {p.nit}</option>)
                  }
                </select>
              </div>

              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Producto *</label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                >
                  {productos.length === 0
                    ? <option value="">Sin productos en inventario</option>
                    : productos.map((p) => <option key={p.id} value={p.id}>{p.nombre_producto}</option>)
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej. 50"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Precio unitario *</label>
                  <input
                    type="number"
                    value={precioU}
                    onChange={(e) => setPrecioU(e.target.value)}
                    placeholder="Ej. 3000"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Fecha *</label>
                <input
                  type="date"
                  value={fecha.split("/").reverse().join("-")}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-")
                    setFecha(`${d}/${m}/${y}`)
                  }}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
              </div>

              {cantidad && precioU && (
                <div className="bg-bg-base border border-border rounded-lg px-3 py-2.5">
                  <p className="text-text-muted text-[10px] mb-0.5">Total de la compra</p>
                  <p className="text-accent-blue font-medium text-sm">{fmt(Number(cantidad) * Number(precioU))}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalCompra(false)} className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarCompra}
                disabled={guardando || !proveedorSeleccionado || !productoSeleccionado || !cantidad || !precioU || !fecha}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-device-floppy text-base" /> Registrar compra</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}