import { useEffect, useState } from "react"
import KpiCard from "../../components/ui/KpiCard"
import {
  getVentasHoy, getComprasHoy, getInventario,
  getAllVentas, getMetaMes
} from "../../firebase/firestore"
import type { Venta, Compra, Producto } from "../../types"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES_CORTOS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString("es-CO")}`
}

function fechaHoy() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

export default function Dashboard() {
  const [ventasHoy, setVentasHoy] = useState<Venta[]>([])
  const [comprasHoy, setComprasHoy] = useState<Compra[]>([])
  const [inventario, setInventario] = useState<Producto[]>([])
  const [todasVentas, setTodasVentas] = useState<Venta[]>([])
  const [metaMes, setMetaMes] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const [vh, ch, inv, tv] = await Promise.all([
        getVentasHoy(),
        getComprasHoy(),
        getInventario(),
        getAllVentas(),
      ])
      const now = new Date()
      const mesAno = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`
      const meta = await getMetaMes(mesAno)
      setVentasHoy(vh)
      setComprasHoy(ch)
      setInventario(inv)
      setTodasVentas(tv)
      setMetaMes(meta?.monto_meta ?? 0)
      setLoading(false)
    }
    cargar()
  }, [])

  // ── KPIs ──
  const totalVentasHoy = ventasHoy.reduce((s, v) => s + v.precio_total, 0)
  const totalComprasHoy = comprasHoy.reduce((s, c) => s + c.precio_total, 0)
  const criticos = inventario.filter((p) => p.cantidad <= p.stock_min)

  // Margen bruto hoy
  const margen = totalVentasHoy > 0
    ? (((totalVentasHoy - totalComprasHoy) / totalVentasHoy) * 100).toFixed(1)
    : "0"

  // Ventas del mes actual
  const now = new Date()
  const mesActual = `${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`
  const ventasMes = todasVentas
    .filter((v) => {
      const partes = v.fecha?.split("/")
      return partes && `${partes[1]}/${partes[2]}` === mesActual
    })
    .reduce((s, v) => s + v.precio_total, 0)

  const progMeta = metaMes > 0 ? Math.min((ventasMes / metaMes) * 100, 100) : 0

  // Proyección del mes
  const diasTranscurridos = now.getDate()
  const diasDelMes = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()
  const proyeccion = diasTranscurridos > 0
    ? (ventasMes / diasTranscurridos) * diasDelMes
    : 0

  // Gráfica últimos 7 días
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const fechaStr = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
    const total = todasVentas
      .filter((v) => v.fecha === fechaStr)
      .reduce((s, v) => s + v.precio_total, 0)
    return { dia: DIAS[d.getDay()], total, isHoy: fechaStr === fechaHoy() }
  })

  // Top 5 productos
  const productosMap: Record<string, number> = {}
  todasVentas.forEach((v) => {
    productosMap[v.nombre_producto] = (productosMap[v.nombre_producto] ?? 0) + v.precio_total
  })
  const topProductos = Object.entries(productosMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Últimos movimientos combinados
  const ultimos = [...ventasHoy, ...comprasHoy]
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label="Ventas hoy"
          value={fmt(totalVentasHoy)}
          sub={`${ventasHoy.length} transacciones`}
          subType="success"
          icon="ti-receipt"
        />
        <KpiCard
          label="Compras hoy"
          value={fmt(totalComprasHoy)}
          sub={`${comprasHoy.length} registros`}
          subType="neutral"
          icon="ti-shopping-cart"
        />
        <KpiCard
          label="Margen bruto"
          value={`${margen}%`}
          sub="Ventas − Compras hoy"
          subType={Number(margen) >= 30 ? "success" : "warning"}
          icon="ti-trending-up"
        />
        <KpiCard
          label="Stock crítico"
          value={String(criticos.length)}
          sub={criticos.length > 0 ? "Requieren reposición" : "Todo en orden"}
          subType={criticos.length > 0 ? "danger" : "success"}
          icon="ti-box"
          accentLeft={criticos.length > 0 ? "danger" : undefined}
        />
      </div>

      {/* Gráfica + Meta */}
      <div className="grid grid-cols-5 gap-3">
        {/* Gráfica 7 días */}
        <div className="col-span-3 bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-text-primary text-[12.5px] font-medium flex items-center gap-2">
              <i className="ti ti-chart-bar text-accent-purple text-[15px]" />
              Ventas últimos 7 días
            </div>
            <span className="text-text-muted text-[11px]">
              {MESES_CORTOS[now.getMonth()]} {now.getFullYear()}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={22}>
              <CartesianGrid stroke="#1E2640" vertical={false} />
              <XAxis
                dataKey="dia"
                tick={{ fill: "#4A5568", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "#141824",
                  border: "1px solid #252D40",
                  borderRadius: 8,
                  color: "#E8ECFA",
                  fontSize: 11,
                }}
                formatter={(v: unknown) => [fmt(v as number), "Ventas"]}
                cursor={{ fill: "rgba(108,99,255,0.06)" }}
              />
              <Bar
                dataKey="total"
                fill="#6C63FF"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Meta del mes */}
        <div className="col-span-2 bg-bg-card border border-border rounded-xl p-4 flex flex-col">
          <div className="text-text-primary text-[12.5px] font-medium flex items-center gap-2 mb-4">
            <i className="ti ti-target text-accent-purple text-[15px]" />
            Meta del mes
          </div>

          {metaMes > 0 ? (
            <>
              <div className="flex justify-between text-[11px] mb-1.5">
                <span className="text-text-secondary">Progreso</span>
                <span className="text-accent-purple font-medium">{progMeta.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden mb-3">
                <div
                  className="h-full bg-accent-purple rounded-full transition-all"
                  style={{ width: `${progMeta}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-bg-base border border-border rounded-lg p-2.5">
                  <div className="text-text-muted text-[10px] mb-0.5">Alcanzado</div>
                  <div className="text-success font-medium text-[13px]">{fmt(ventasMes)}</div>
                </div>
                <div className="bg-bg-base border border-border rounded-lg p-2.5">
                  <div className="text-text-muted text-[10px] mb-0.5">Meta</div>
                  <div className="text-text-primary font-medium text-[13px]">{fmt(metaMes)}</div>
                </div>
              </div>
              <div className="mt-auto bg-accent-purple/8 border border-accent-purple/20 rounded-lg p-2.5 flex items-center gap-2">
                <i className="ti ti-trending-up text-accent-purple text-[15px]" />
                <span className="text-text-secondary text-[11px]">
                  Proyección: <span className="text-accent-purple font-medium">{fmt(proyeccion)}</span>
                </span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <i className="ti ti-target text-text-muted text-2xl" />
              <p className="text-text-muted text-[11.5px]">No hay meta configurada para este mes.</p>
              <a href="/metas" className="text-accent-purple text-[11px] hover:underline">
                Configurar meta →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Stock crítico + Top productos */}
      <div className="grid grid-cols-2 gap-3">
        {/* Stock crítico */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-text-primary text-[12.5px] font-medium flex items-center gap-2">
              <i className="ti ti-alert-triangle text-accent-purple text-[15px]" />
              Alertas de stock
            </div>
            <a href="/alertas" className="text-accent-purple text-[10.5px] hover:underline">
              Ver todas →
            </a>
          </div>
          {criticos.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-[11.5px]">
              <i className="ti ti-circle-check text-success text-xl block mb-1" />
              Todo el inventario está en orden
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {criticos.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full min-w-2 ${
                      p.cantidad === 0 ? "bg-danger" : "bg-warning"
                    }`}
                  />
                  <span className="flex-1 text-text-primary text-[11.5px] truncate">
                    {p.nombre_producto}
                  </span>
                  <span className="text-text-muted text-[11px]">
                    {p.cantidad} / {p.stock_min}
                  </span>
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded-md font-medium ${
                      p.cantidad === 0
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {p.cantidad === 0 ? "Agotado" : "Crítico"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-text-primary text-[12.5px] font-medium flex items-center gap-2">
              <i className="ti ti-trophy text-accent-purple text-[15px]" />
              Top productos del mes
            </div>
          </div>
          {topProductos.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-[11.5px]">
              Sin ventas registradas este mes
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topProductos.map(([nombre, total], i) => {
                const maxVal = topProductos[0][1]
                const pct = (total / maxVal) * 100
                const rankColors = ["text-warning", "text-text-secondary", "text-text-muted"]
                return (
                  <div key={nombre}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium w-4 ${rankColors[i] ?? "text-text-muted"}`}>
                          {i + 1}
                        </span>
                        <span className="text-text-primary truncate max-w-[160px]">{nombre}</span>
                      </div>
                      <span className="text-success font-medium">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-purple"
                        style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-text-primary text-[12.5px] font-medium flex items-center gap-2">
            <i className="ti ti-clock-hour-4 text-accent-purple text-[15px]" />
            Movimientos de hoy
          </div>
          <a href="/ventas" className="text-accent-purple text-[10.5px] hover:underline">
            Ver historial →
          </a>
        </div>
        {ultimos.length === 0 ? (
          <div className="text-center py-6 text-text-muted text-[11.5px]">
            Sin movimientos registrados hoy
          </div>
        ) : (
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-text-muted font-medium text-left pb-2 text-[10px] uppercase tracking-wider">Producto</th>
                <th className="text-text-muted font-medium text-left pb-2 text-[10px] uppercase tracking-wider">Tipo</th>
                <th className="text-text-muted font-medium text-left pb-2 text-[10px] uppercase tracking-wider">Cantidad</th>
                <th className="text-text-muted font-medium text-left pb-2 text-[10px] uppercase tracking-wider">Total</th>
                <th className="text-text-muted font-medium text-left pb-2 text-[10px] uppercase tracking-wider">Contraparte</th>
              </tr>
            </thead>
            <tbody>
              {ultimos.map((m, i) => {
                const esVenta = "nombre_cliente" in m
                return (
                  <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-accent-purple/[0.03]">
                    <td className="py-2 text-text-primary font-medium">{m.nombre_producto}</td>
                    <td className="py-2">
                      <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-medium ${
                        esVenta
                          ? "bg-accent-blue/10 text-accent-blue"
                          : "bg-accent-purple/10 text-accent-purple/90"
                      }`}>
                        {esVenta ? "Venta" : "Compra"}
                      </span>
                    </td>
                    <td className="py-2 text-text-secondary">{m.cantidad}</td>
                    <td className="py-2 text-success font-medium">{fmt(m.precio_total)}</td>
                    <td className="py-2 text-text-secondary">
                      {esVenta
                        ? (m as Venta).nombre_cliente
                        : (m as Compra).nombre_proveedor}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}