import { useEffect, useRef, useState } from "react"
import {
  getInventario,
  addProducto,
  registrarEntradaProducto,
  registrarSalidaProducto,
} from "../../firebase/firestore"
import type { Producto } from "../../types"
import Badge from "../../components/ui/Badge"
import KpiCard from "../../components/ui/KpiCard"

function fmt(n: number) {
  return `$${n.toLocaleString("es-CO")}`
}

const UNIDADES = ["und", "kg", "g", "L", "mL", "lb", "oz", "caja", "paquete", "docena"]
const CATEGORIAS = ["Bebida", "Cervezas", "Licor", "Alimentos", "Snacks", "Limpieza", "Papelería", "Otro"]

const PRODUCTO_VACIO: Omit<Producto, "id"> = {
  nombre_producto: "",
  cantidad: 0,
  precio_u: 0,
  stock_min: 0,
  categoria: "",
  empresa_id: "empresa_demo",
  fecha_creacion: "",
  fecha_ultimo_movimiento: "",
  ultimo_movimiento: "",
  unidad_base: "und",
  codigo_barras: "",
}

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [filtrados, setFiltrados] = useState<Producto[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [loading, setLoading] = useState(true)

  // Modal agregar producto
  const [modalProducto, setModalProducto] = useState(false)
  const [formProducto, setFormProducto] = useState<Omit<Producto, "id">>(PRODUCTO_VACIO)
  const [tieneVencimiento, setTieneVencimiento] = useState(false)
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [guardandoProducto, setGuardandoProducto] = useState(false)

  // Escáner código de barras (formulario nuevo producto)
  const [modoEscanerInv, setModoEscanerInv] = useState(false)
  const [codigoEscaneadoInv, setCodigoEscaneadoInv] = useState("")
  const scannerInputRefInv = useRef<HTMLInputElement>(null)

  // Modal entrada
  const [modalEntrada, setModalEntrada] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [cantidadEntrada, setCantidadEntrada] = useState("")
  const [precioEntrada, setPrecioEntrada] = useState("")
  const [guardandoEntrada, setGuardandoEntrada] = useState(false)

  // Modal salida
  const [modalSalida, setModalSalida] = useState(false)
  const [cantidadSalida, setCantidadSalida] = useState("")
  const [guardandoSalida, setGuardandoSalida] = useState(false)

  const cargar = async () => {
    try {
      const data = await getInventario()
      const sorted = data.sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto))
      setProductos(sorted)
      setFiltrados(sorted)
    } catch (error) {
      console.error("Error cargando inventario:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (productos.length === 0) return
    let result = [...productos]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter((p) =>
        p.nombre_producto.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q)
      )
    }
    if (filtroEstado === "Crítico") result = result.filter((p) => p.cantidad <= p.stock_min && p.cantidad > 0)
    if (filtroEstado === "Agotado") result = result.filter((p) => p.cantidad === 0)
    if (filtroEstado === "OK") result = result.filter((p) => p.cantidad > p.stock_min)
    setFiltrados(result)
  }, [busqueda, filtroEstado, productos])

  const criticos = productos.filter((p) => p.cantidad <= p.stock_min && p.cantidad > 0)
  const agotados = productos.filter((p) => p.cantidad === 0)
  const valorTotal = productos.reduce((s, p) => s + p.cantidad * p.precio_u, 0)

  const getEstado = (p: Producto) => {
    if (p.cantidad === 0) return { label: "Agotado", variant: "danger" as const }
    if (p.cantidad <= p.stock_min) return { label: "Crítico", variant: "danger" as const }
    if (p.cantidad <= p.stock_min * 1.5) return { label: "Bajo", variant: "warning" as const }
    return { label: "OK", variant: "success" as const }
  }

  const formatFecha = (fecha: unknown): string => {
    if (!fecha) return "—"
    if (typeof fecha === "string") return fecha
    if (typeof fecha === "object" && fecha !== null && "toDate" in fecha) {
      return (fecha as { toDate: () => Date }).toDate().toLocaleDateString("es-CO")
    }
    return "—"
  }

  // ── Agregar producto ──────────────────────────────────────
  const abrirModalProducto = () => {
    setFormProducto(PRODUCTO_VACIO)
    setTieneVencimiento(false)
    setFechaVencimiento("")
    setModoEscanerInv(false)
    setCodigoEscaneadoInv("")
    setModalProducto(true)
  }

  const guardarProducto = async () => {
    if (!formProducto.nombre_producto) return
    setGuardandoProducto(true)
    const hoy = new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })
    const datos: Omit<Producto, "id"> = {
      ...formProducto,
      fecha_creacion: hoy,
      fecha_ultimo_movimiento: hoy,
      ultimo_movimiento: "entrada",
      ...(tieneVencimiento && fechaVencimiento ? { fecha_vencimiento: fechaVencimiento } : {}),
    }
    try {
      await addProducto(datos)
      await cargar()
      setModalProducto(false)
    } catch (error) {
      console.error("Error guardando producto:", error)
    } finally {
      setGuardandoProducto(false)
    }
  }

  // ── Escáner USB (inventario) ──────────────────────────────
  const activarEscanerInv = () => {
    setModoEscanerInv(true)
    setCodigoEscaneadoInv("")
    setTimeout(() => scannerInputRefInv.current?.focus(), 100)
  }

  const onScannerKeyDownInv = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const codigo = codigoEscaneadoInv.trim()
      if (codigo) setFormProducto((prev) => ({ ...prev, codigo_barras: codigo }))
      setModoEscanerInv(false)
      setCodigoEscaneadoInv("")
    }
  }

  // ── Entrada ───────────────────────────────────────────────
  const abrirEntrada = (p: Producto) => {
    setProductoSeleccionado(p)
    setCantidadEntrada("")
    setPrecioEntrada("")
    setModalEntrada(true)
  }

  const confirmarEntrada = async () => {
    if (!productoSeleccionado) return
    const cant = Number(cantidadEntrada)
    if (!cant || cant <= 0) return
    setGuardandoEntrada(true)
    try {
      const precio = precioEntrada ? Number(precioEntrada) : undefined
      await registrarEntradaProducto(productoSeleccionado.id!, cant, precio)
      await cargar()
      setModalEntrada(false)
    } catch (error) {
      console.error("Error registrando entrada:", error)
    } finally {
      setGuardandoEntrada(false)
    }
  }

  // ── Salida ────────────────────────────────────────────────
  const abrirSalida = (p: Producto) => {
    setProductoSeleccionado(p)
    setCantidadSalida("")
    setModalSalida(true)
  }

  const confirmarSalida = async () => {
    if (!productoSeleccionado) return
    const cant = Number(cantidadSalida)
    if (!cant || cant <= 0) return
    if (cant > productoSeleccionado.cantidad) return
    setGuardandoSalida(true)
    try {
      await registrarSalidaProducto(productoSeleccionado.id!, cant)
      await cargar()
      setModalSalida(false)
    } catch (error) {
      console.error("Error registrando salida:", error)
    } finally {
      setGuardandoSalida(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total productos" value={String(productos.length)} sub="En inventario" icon="ti-box" />
        <KpiCard label="Valor inventario" value={fmt(valorTotal)} sub="A precio de costo" subType="neutral" icon="ti-coin" />
        <KpiCard label="Stock crítico" value={String(criticos.length)} sub="Por debajo del mínimo" subType={criticos.length > 0 ? "danger" : "success"} icon="ti-alert-triangle" accentLeft={criticos.length > 0 ? "warning" : undefined} />
        <KpiCard label="Agotados" value={String(agotados.length)} sub="Sin stock" subType={agotados.length > 0 ? "danger" : "success"} icon="ti-alert-circle" accentLeft={agotados.length > 0 ? "danger" : undefined} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar producto, categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        {["Todos", "Crítico", "Agotado", "OK"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltroEstado(f)}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
              filtroEstado === f
                ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple"
                : "bg-bg-card border-border text-text-secondary hover:border-accent-purple/30"
            }`}
          >
            {f}
          </button>
        ))}
        <button
          onClick={abrirModalProducto}
          className="flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 text-accent-purple px-3 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors ml-auto"
        >
          <i className="ti ti-plus text-[14px]" />
          Nuevo producto
        </button>
        <button className="flex items-center gap-2 bg-success/10 border border-success/30 text-success px-3 py-2 rounded-lg text-sm hover:bg-success/15 transition-colors">
          <i className="ti ti-file-spreadsheet text-[14px]" />
          Exportar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : productos.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <i className="ti ti-box-off text-text-muted text-3xl" />
          <p className="text-text-secondary text-sm">Sin productos en inventario</p>
          <button onClick={abrirModalProducto} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors flex items-center gap-2">
            <i className="ti ti-plus" /> Agregar primer producto
          </button>
        </div>
      ) : (
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead className="bg-bg-base">
                <tr>
                  {["Producto", "Categoría", "Stock actual", "Stock mín.", "Estado", "Precio u.", "Valor total", "Ult. movimiento", ""].map((h) => (
                    <th key={h} className="text-text-muted font-medium text-left px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-text-muted py-12">Sin productos para mostrar</td>
                  </tr>
                ) : (
                  filtrados.map((p) => {
                    const estado = getEstado(p)
                    return (
                      <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-accent-purple/[0.03] transition-colors">
                        <td className="px-3 py-2">
                          <div className="text-text-primary font-medium">{p.nombre_producto}</div>
                          {p.codigo_barras && <div className="text-text-muted text-[10px]">{p.codigo_barras}</div>}
                        </td>
                        <td className="px-3 py-2"><Badge label={p.categoria ?? "—"} variant="info" /></td>
                        <td className={`px-3 py-2 font-medium ${p.cantidad === 0 ? "text-danger" : p.cantidad <= p.stock_min ? "text-warning" : "text-success"}`}>
                          {p.cantidad} {p.unidad_base ?? "u"}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{p.stock_min} {p.unidad_base ?? "u"}</td>
                        <td className="px-3 py-2"><Badge label={estado.label} variant={estado.variant} /></td>
                        <td className="px-3 py-2 text-text-secondary">{fmt(p.precio_u)}</td>
                        <td className="px-3 py-2 text-text-muted">{fmt(p.cantidad * p.precio_u)}</td>
                        <td className="px-3 py-2 text-text-muted text-[10.5px]">{formatFecha(p.fecha_ultimo_movimiento)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => abrirEntrada(p)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-success/10 border border-success/30 text-success text-[10px] hover:bg-success/20 transition-colors"
                              title="Registrar entrada"
                            >
                              <i className="ti ti-arrow-bar-to-down text-xs" /> Entrada
                            </button>
                            <button
                              onClick={() => abrirSalida(p)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-danger/10 border border-danger/30 text-danger text-[10px] hover:bg-danger/20 transition-colors"
                              title="Registrar salida"
                            >
                              <i className="ti ti-arrow-bar-up text-xs" /> Salida
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Nuevo Producto ─────────────────────────────── */}
      {modalProducto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">Nuevo producto</h3>
              <button onClick={() => setModalProducto(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Nombre */}
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  value={formProducto.nombre_producto}
                  onChange={(e) => setFormProducto({ ...formProducto, nombre_producto: e.target.value })}
                  placeholder="Ej: Gaseosa Quatro"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
              </div>

              {/* Código de barras + escáner USB */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-text-secondary text-[11px]">Código de barras</label>
                  <button
                    onClick={activarEscanerInv}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors"
                  >
                    <i className="ti ti-barcode text-xs" /> Escanear código
                  </button>
                </div>

                {modoEscanerInv && (
                  <div className="flex items-center gap-2 bg-accent-purple/8 border border-accent-purple/30 rounded-lg px-3 py-2 mb-2">
                    <i className="ti ti-scan text-accent-purple text-sm animate-pulse" />
                    <input
                      ref={scannerInputRefInv}
                      type="text"
                      value={codigoEscaneadoInv}
                      onChange={(e) => setCodigoEscaneadoInv(e.target.value)}
                      onKeyDown={onScannerKeyDownInv}
                      onBlur={() => setModoEscanerInv(false)}
                      placeholder="Apunta el escáner al código de barras..."
                      className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-accent-purple/50"
                    />
                    <button onClick={() => setModoEscanerInv(false)} className="text-text-muted hover:text-text-primary">
                      <i className="ti ti-x text-xs" />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={formProducto.codigo_barras ?? ""}
                  onChange={(e) => setFormProducto({ ...formProducto, codigo_barras: e.target.value })}
                  placeholder="Escanea o escribe el código"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
              </div>

              {/* Cantidad y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Cantidad inicial *</label>
                  <input
                    type="number"
                    value={formProducto.cantidad || ""}
                    onChange={(e) => setFormProducto({ ...formProducto, cantidad: Number(e.target.value) })}
                    placeholder="Ej: 50"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Unidad de medida</label>
                  <select
                    value={formProducto.unidad_base ?? "und"}
                    onChange={(e) => setFormProducto({ ...formProducto, unidad_base: e.target.value })}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  >
                    {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Categoría y Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Categoría</label>
                  <select
                    value={formProducto.categoria}
                    onChange={(e) => setFormProducto({ ...formProducto, categoria: e.target.value })}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Precio unitario *</label>
                  <input
                    type="number"
                    value={formProducto.precio_u || ""}
                    onChange={(e) => setFormProducto({ ...formProducto, precio_u: Number(e.target.value) })}
                    placeholder="Ej: 3000"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
              </div>

              {/* Stock mínimo */}
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Stock mínimo de alerta</label>
                <input
                  type="number"
                  value={formProducto.stock_min || ""}
                  onChange={(e) => setFormProducto({ ...formProducto, stock_min: Number(e.target.value) })}
                  placeholder="Ej: 5"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
                <p className="text-text-muted text-[10px] mt-1">Recibirás una alerta cuando el stock baje de este límite</p>
              </div>

              {/* Fecha de vencimiento — checkbox */}
              <div className="flex items-center gap-3 py-2 px-3 bg-bg-base border border-border rounded-lg">
                <input
                  type="checkbox"
                  id="chkVencimiento"
                  checked={tieneVencimiento}
                  onChange={(e) => setTieneVencimiento(e.target.checked)}
                  className="w-4 h-4 accent-accent-purple"
                />
                <label htmlFor="chkVencimiento" className="text-text-secondary text-sm cursor-pointer flex-1">
                  ¿Tiene fecha de vencimiento?
                </label>
                <span className="text-text-muted text-[10px]">Alimentos, lácteos, etc.</span>
              </div>

              {tieneVencimiento && (
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Fecha de vencimiento</label>
                  {/* Calendario */}
                  <input
                    type="date"
                    value={
                      fechaVencimiento
                        ? (() => {
                            const p = fechaVencimiento.split("/")
                            return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : fechaVencimiento
                          })()
                        : ""
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        const [y, m, d] = e.target.value.split("-")
                        setFechaVencimiento(`${d}/${m}/${y}`)
                      } else {
                        setFechaVencimiento("")
                      }
                    }}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors mb-2"
                  />
                  {/* También texto manual */}
                  <input
                    type="text"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    placeholder="O escribe manualmente: DD/MM/YYYY"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                  <p className="text-text-muted text-[10px] mt-1">
                    Usa el calendario o escribe la fecha en formato DD/MM/AAAA
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalProducto(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProducto}
                disabled={guardandoProducto || !formProducto.nombre_producto}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardandoProducto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-device-floppy text-base" /> Guardar producto</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Entrada ────────────────────────────────────── */}
      {modalEntrada && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-text-primary font-medium text-base">Registrar entrada</h3>
              <button onClick={() => setModalEntrada(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>
            <p className="text-success text-sm mb-1">{productoSeleccionado.nombre_producto}</p>
            <p className="text-text-muted text-[11px] mb-5">
              Stock actual: <span className="text-text-primary font-medium">{productoSeleccionado.cantidad} {productoSeleccionado.unidad_base ?? "u"}</span>
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Cantidad a ingresar *</label>
                <input
                  type="number"
                  value={cantidadEntrada}
                  onChange={(e) => setCantidadEntrada(e.target.value)}
                  placeholder="Ej. 10"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-success/60 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Nuevo precio unitario <span className="text-text-muted">(opcional)</span></label>
                <input
                  type="number"
                  value={precioEntrada}
                  onChange={(e) => setPrecioEntrada(e.target.value)}
                  placeholder={`Actual: ${fmt(productoSeleccionado.precio_u)}`}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-success/60 transition-colors"
                />
                <p className="text-text-muted text-[10px] mt-1">Deja vacío para mantener el precio actual</p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalEntrada(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntrada}
                disabled={guardandoEntrada || !cantidadEntrada || Number(cantidadEntrada) <= 0}
                className="flex-1 py-2 rounded-lg bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardandoEntrada ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-arrow-bar-to-down text-base" /> Confirmar entrada</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Salida ─────────────────────────────────────── */}
      {modalSalida && productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-text-primary font-medium text-base">Registrar salida</h3>
              <button onClick={() => setModalSalida(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>
            <p className="text-danger text-sm mb-1">{productoSeleccionado.nombre_producto}</p>
            <p className="text-text-muted text-[11px] mb-1">
              Stock actual: <span className="text-text-primary font-medium">{productoSeleccionado.cantidad} {productoSeleccionado.unidad_base ?? "u"}</span>
            </p>
            <p className="text-text-muted text-[11px] mb-5">
              Precio unitario: <span className="text-text-secondary">{fmt(productoSeleccionado.precio_u)}</span>
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Cantidad a retirar *</label>
                <input
                  type="number"
                  value={cantidadSalida}
                  onChange={(e) => setCantidadSalida(e.target.value)}
                  placeholder="Ej. 5"
                  max={productoSeleccionado.cantidad}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-danger/60 transition-colors"
                  autoFocus
                />
                {Number(cantidadSalida) > productoSeleccionado.cantidad && (
                  <p className="text-danger text-[10px] mt-1">No hay suficientes existencias</p>
                )}
              </div>
              <div className="bg-bg-base border border-border rounded-lg px-3 py-2.5">
                <p className="text-text-muted text-[10px] mb-1">Valor de la salida</p>
                <p className="text-text-primary text-sm font-medium">
                  {cantidadSalida && Number(cantidadSalida) > 0
                    ? fmt(Number(cantidadSalida) * productoSeleccionado.precio_u)
                    : "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalSalida(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSalida}
                disabled={
                  guardandoSalida ||
                  !cantidadSalida ||
                  Number(cantidadSalida) <= 0 ||
                  Number(cantidadSalida) > productoSeleccionado.cantidad
                }
                className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardandoSalida ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-arrow-bar-up text-base" /> Confirmar salida</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}