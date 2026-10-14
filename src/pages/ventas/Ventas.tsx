import { useEffect, useRef, useState } from "react"
import {
  getAllVentas,
  addVenta,
  getInventario,
  getRecetas,
  descontarIngredientesPorReceta,
} from "../../firebase/firestore"
import type { Venta, Producto, Receta } from "../../types"
import Badge from "../../components/ui/Badge"
import KpiCard from "../../components/ui/KpiCard"
import { exportarVentasExcel, exportarVentasPDF } from "../../utils/exportUtils"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString("es-CO")}`
}

const PAGE_SIZE = 10

export default function Ventas() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [filtradas, setFiltradas] = useState<Venta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroOrigen, setFiltroOrigen] = useState("Todos")
  const [loading, setLoading] = useState(true)
  const [pagina, setPagina] = useState(1)

  // Modal nueva venta
  const [modalVenta, setModalVenta] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState("")
  const [cliente, setCliente] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [precioU, setPrecioU] = useState("")
  const [fecha, setFecha] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [errorVenta, setErrorVenta] = useState("")
  const [descuentoReceta, setDescuentoReceta] = useState(false)

  // Escáner código de barras
  const [modoEscaner, setModoEscaner] = useState(false)
  const [codigoEscaneado, setCodigoEscaneado] = useState("")
  const scannerInputRef = useRef<HTMLInputElement>(null)

  const hoy = new Date()
    .toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "/")

  const cargar = async () => {
    const data = await getAllVentas()
    const sorted = data.sort((a, b) => {
      const [da, ma, aa] = a.fecha.split("/").map(Number)
      const [db2, mb, ab] = b.fecha.split("/").map(Number)
      return new Date(ab, mb - 1, db2).getTime() - new Date(aa, ma - 1, da).getTime()
    })
    setVentas(sorted)
    setFiltradas(sorted)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    let result = ventas
    if (busqueda) {
      const q = busqueda.toLowerCase()
      result = result.filter(
        (v) =>
          v.nombre_producto.toLowerCase().includes(q) ||
          v.nombre_cliente.toLowerCase().includes(q)
      )
    }
    if (filtroOrigen !== "Todos") result = result.filter((v) => v.origen === filtroOrigen)
    setFiltradas(result)
    setPagina(1)
  }, [busqueda, filtroOrigen, ventas])

  const totalGeneral = ventas.reduce((s, v) => s + v.precio_total, 0)
  const ventasHoy = ventas.filter((v) => v.fecha === hoy)
  const totalHoy = ventasHoy.reduce((s, v) => s + v.precio_total, 0)
  const ticketPromedio = ventas.length > 0 ? totalGeneral / ventas.length : 0
  const totalPaginas = Math.ceil(filtradas.length / PAGE_SIZE)
  const paginadas = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  const origenVariant: Record<string, "info" | "purple" | "warning"> = {
    App: "info",
    Manual: "purple",
    Domicilio: "warning",
    Web: "info",
  }

  // ── Abrir modal venta ─────────────────────────────────────
  const abrirModalVenta = async () => {
    const [prods, recs] = await Promise.all([getInventario(), getRecetas()])
    setProductos(prods)
    setRecetas(recs)
    setProductoSeleccionado(prods[0]?.id ?? "")
    setCliente("")
    setCantidad("")
    setPrecioU(prods[0]?.precio_u ? String(prods[0].precio_u) : "")
    setFecha(hoy)
    setErrorVenta("")
    setDescuentoReceta(false)
    setModoEscaner(false)
    setCodigoEscaneado("")
    setModalVenta(true)
  }

  // Cuando cambia el producto seleccionado, rellena el precio automáticamente
  const onCambiarProducto = (id: string) => {
    setProductoSeleccionado(id)
    const prod = productos.find((p) => p.id === id)
    if (prod) setPrecioU(String(prod.precio_u))
    // Verificar si tiene receta
    const tieneReceta = recetas.some((r) => r.nombre === prod?.nombre_producto)
    setDescuentoReceta(tieneReceta)
  }

  // ── Escáner USB ───────────────────────────────────────────
  const activarEscaner = () => {
    setModoEscaner(true)
    setCodigoEscaneado("")
    setTimeout(() => scannerInputRef.current?.focus(), 100)
  }

  const onScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Los escáneres USB envían Enter al terminar de leer
    if (e.key === "Enter") {
      const codigo = codigoEscaneado.trim()
      if (codigo) {
        const prod = productos.find((p) => p.codigo_barras === codigo)
        if (prod) {
          setProductoSeleccionado(prod.id!)
          setPrecioU(String(prod.precio_u))
          const tieneReceta = recetas.some((r) => r.nombre === prod.nombre_producto)
          setDescuentoReceta(tieneReceta)
          setErrorVenta("")
        } else {
          setErrorVenta(`No se encontró ningún producto con código "${codigo}"`)
        }
      }
      setModoEscaner(false)
      setCodigoEscaneado("")
    }
  }

  // ── Guardar venta ─────────────────────────────────────────
  const guardarVenta = async () => {
    const prod = productos.find((p) => p.id === productoSeleccionado)
    if (!prod || !cantidad || !precioU || !fecha) return
    const cant = Number(cantidad)
    const precio = Number(precioU)
    if (cant <= 0 || precio <= 0) return
    if (cant > prod.cantidad) {
      setErrorVenta(`Stock insuficiente. Solo hay ${prod.cantidad} ${prod.unidad_base ?? "u"} disponibles.`)
      return
    }

    setGuardando(true)
    setErrorVenta("")
    try {
      const nuevaVenta: Omit<Venta, "id"> = {
        nombre_producto: prod.nombre_producto,
        nombre_cliente: cliente || "Consumidor final",
        cantidad: cant,
        precio_u: precio,
        precio_total: cant * precio,
        fecha,
        empresa_id: "empresa_demo",
        origen: "modulo_ventas",
      }
      await addVenta(nuevaVenta)

      // Descuento automático: si tiene receta descuenta ingredientes, si no descuenta el producto directo
      const tieneReceta = recetas.some((r) => r.nombre === prod.nombre_producto)
      if (tieneReceta) {
        await descontarIngredientesPorReceta(prod.nombre_producto, cant)
      } else {
        // Descuento directo del inventario
        const { registrarSalidaProducto } = await import("../../firebase/firestore")
        await registrarSalidaProducto(prod.id!, cant)
      }

      await cargar()
      setModalVenta(false)
    } catch (error: any) {
      setErrorVenta(error.message ?? "Error al registrar la venta")
    } finally {
      setGuardando(false)
    }
  }

  const productoActual = productos.find((p) => p.id === productoSeleccionado)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total ventas" value={fmt(totalGeneral)} sub={`${ventas.length} transacciones`} icon="ti-receipt" />
        <KpiCard label="Ventas hoy" value={fmt(totalHoy)} sub={`${ventasHoy.length} registros hoy`} subType="success" icon="ti-calendar" />
        <KpiCard label="Ticket promedio" value={fmt(ticketPromedio)} sub="Por transacción" subType="neutral" icon="ti-receipt-2" />
        <KpiCard label="Resultados filtro" value={String(filtradas.length)} sub="registros encontrados" subType="neutral" icon="ti-filter" />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <i className="ti ti-search text-text-muted text-[15px]" />
          <input
            type="text"
            placeholder="Buscar producto, cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
          />
        </div>
        <select
          value={filtroOrigen}
          onChange={(e) => setFiltroOrigen(e.target.value)}
          className="bg-bg-card border border-border text-text-secondary px-3 py-2 rounded-lg text-sm outline-none"
        >
          <option>Todos</option>
          <option>App</option>
          <option>Manual</option>
          <option>Domicilio</option>
          <option>Web</option>
        </select>
        <button
          onClick={() => exportarVentasExcel(filtradas)}
          className="flex items-center gap-2 bg-success/10 border border-success/30 text-success px-3 py-2 rounded-lg text-sm hover:bg-success/15 transition-colors"
        >
          <i className="ti ti-file-spreadsheet text-[14px]" /> Exportar Excel
        </button>
        <button
          onClick={() => exportarVentasPDF(filtradas, [
            { label: "Total ventas", value: fmt(totalGeneral), color: [0, 200, 150] },
            { label: "Ventas hoy", value: fmt(totalHoy), color: [91, 164, 245] },
            { label: "Ticket promedio", value: fmt(ticketPromedio), color: [200, 213, 232] },
            { label: "Registros", value: String(filtradas.length), color: [200, 213, 232] },
          ])}
          className="flex items-center gap-2 bg-accent-purple/12 border border-accent-purple/30 text-accent-purple px-3 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-file-type-pdf text-[14px]" /> Exportar PDF
        </button>
        <button
          onClick={abrirModalVenta}
          className="flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 text-accent-purple px-3 py-2 rounded-lg text-sm hover:bg-accent-purple/20 transition-colors"
        >
          <i className="ti ti-plus text-[14px]" /> Nueva venta
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
                  {["Fecha", "Producto", "Cliente", "Cant.", "Precio u.", "Total", "Origen"].map((h) => (
                    <th key={h} className="text-text-muted font-medium text-left px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-text-muted py-12">
                      <i className="ti ti-receipt-off text-2xl block mb-2" />
                      Sin ventas para mostrar
                    </td>
                  </tr>
                ) : (
                  paginadas.map((v, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-accent-purple/[0.03] transition-colors">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{v.fecha}</td>
                      <td className="px-3 py-2 text-text-primary font-medium">{v.nombre_producto}</td>
                      <td className="px-3 py-2 text-text-secondary">{v.nombre_cliente}</td>
                      <td className="px-3 py-2 text-text-secondary">{v.cantidad}</td>
                      <td className="px-3 py-2 text-text-secondary">{fmt(v.precio_u)}</td>
                      <td className="px-3 py-2 text-success font-medium">{fmt(v.precio_total)}</td>
                      <td className="px-3 py-2">
                        <Badge label={v.origen ?? "Manual"} variant={origenVariant[v.origen] ?? "gray"} />
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

      {/* ── Modal Nueva Venta ────────────────────────────────── */}
      {modalVenta && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium text-base">Nueva venta</h3>
              <button onClick={() => setModalVenta(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            <div className="flex flex-col gap-3">

              {/* Selector de producto + botón escáner */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-text-secondary text-[11px]">Producto *</label>
                  <button
                    onClick={activarEscaner}
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/20 transition-colors"
                  >
                    <i className="ti ti-barcode text-xs" /> Escanear código
                  </button>
                </div>

                {/* Input oculto para escáner USB — mantiene el foco para capturar el código */}
                {modoEscaner && (
                  <div className="flex items-center gap-2 bg-accent-purple/8 border border-accent-purple/30 rounded-lg px-3 py-2 mb-2">
                    <i className="ti ti-scan text-accent-purple text-sm animate-pulse" />
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={codigoEscaneado}
                      onChange={(e) => setCodigoEscaneado(e.target.value)}
                      onKeyDown={onScannerKeyDown}
                      onBlur={() => setModoEscaner(false)}
                      placeholder="Apunta el escáner al código de barras..."
                      className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-accent-purple/50"
                    />
                    <button onClick={() => setModoEscaner(false)} className="text-text-muted hover:text-text-primary">
                      <i className="ti ti-x text-xs" />
                    </button>
                  </div>
                )}

                <select
                  value={productoSeleccionado}
                  onChange={(e) => onCambiarProducto(e.target.value)}
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                >
                  {productos.length === 0
                    ? <option value="">Sin productos en inventario</option>
                    : productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre_producto} — Stock: {p.cantidad} {p.unidad_base ?? "u"}
                        </option>
                      ))
                  }
                </select>

                {/* Info del producto seleccionado */}
                {productoActual && (
                  <div className="flex items-center gap-3 mt-2 px-3 py-2 bg-bg-base border border-border rounded-lg">
                    <div className="flex-1">
                      <span className="text-text-muted text-[10px]">Stock disponible: </span>
                      <span className={`text-[11px] font-medium ${productoActual.cantidad <= productoActual.stock_min ? "text-warning" : "text-success"}`}>
                        {productoActual.cantidad} {productoActual.unidad_base ?? "u"}
                      </span>
                    </div>
                    {descuentoReceta && (
                      <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-accent-purple/10 border border-accent-purple/20 text-accent-purple">
                        <i className="ti ti-chef-hat text-xs" /> Descuenta por receta
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cliente */}
              <div>
                <label className="text-text-secondary text-[11px] block mb-1">Cliente</label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nombre del cliente (opcional)"
                  className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                />
              </div>

              {/* Cantidad y precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder="Ej. 2"
                    min={1}
                    max={productoActual?.cantidad}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Precio unitario *</label>
                  <input
                    type="number"
                    value={precioU}
                    onChange={(e) => setPrecioU(e.target.value)}
                    placeholder="Ej. 5000"
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
              </div>

              {/* Fecha */}
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

              {/* Total calculado */}
              {cantidad && precioU && Number(cantidad) > 0 && Number(precioU) > 0 && (
                <div className="bg-bg-base border border-border rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <p className="text-text-muted text-[11px]">Total de la venta</p>
                  <p className="text-success font-medium text-sm">{fmt(Number(cantidad) * Number(precioU))}</p>
                </div>
              )}

              {/* Error */}
              {errorVenta && (
                <div className="bg-danger/10 border border-danger/30 text-danger text-[11px] px-3 py-2 rounded-lg">
                  <i className="ti ti-alert-circle text-xs mr-1" /> {errorVenta}
                </div>
              )}

              {/* Aviso descuento automático */}
              <div className="bg-bg-base border border-border rounded-lg px-3 py-2 flex items-start gap-2">
                <i className="ti ti-info-circle text-text-muted text-sm mt-0.5" />
                <p className="text-text-muted text-[10px] leading-relaxed">
                  {descuentoReceta
                    ? "Este producto tiene receta. Al registrar la venta se descontarán automáticamente los ingredientes del inventario."
                    : "Al registrar la venta se descontará la cantidad directamente del inventario."}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setModalVenta(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarVenta}
                disabled={guardando || !productoSeleccionado || !cantidad || !precioU || !fecha || Number(cantidad) <= 0}
                className="flex-1 py-2 rounded-lg bg-success text-white text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-receipt text-base" /> Registrar venta</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}