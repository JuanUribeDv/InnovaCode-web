import { useEffect, useState, useMemo } from "react"
import { getAllVentas, getAllCompras } from "../../firebase/firestore"
import type { Venta, Compra } from "../../types"
import KpiCard from "../../components/ui/KpiCard"
import { exportarReportesExcel, exportarReportesPDF } from "../../utils/exportUtils"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString("es-CO")}`
}

function parseFecha(f: string): Date | null {
  if (!f) return null
  const p = f.split("/")
  if (p.length !== 3) return null
  return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]))
}

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const COLORES_PIE = ["#6C63FF","#29ABE2","#4ADE80","#FBBF24","#F87171","#a78bfa","#34d399"]

type Rango = "7d" | "30d" | "mes" | "3m"

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-[11px]">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

function Seccion({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-4">
        <i className={`ti ${icon} text-accent-purple text-[15px]`} />
        {title}
      </div>
      {children}
    </div>
  )
}

export default function Reportes() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [rango, setRango] = useState<Rango>("mes")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAllVentas(), getAllCompras()]).then(([v, c]) => {
      setVentas(v)
      setCompras(c)
      setLoading(false)
    })
  }, [])

  const ahora = new Date()

  const filtrarPorRango = <T extends { fecha: string }>(arr: T[]): T[] => {
    return arr.filter((item) => {
      const d = parseFecha(item.fecha)
      if (!d) return false
      if (rango === "7d") {
        const limite = new Date(); limite.setDate(limite.getDate() - 7); return d >= limite
      }
      if (rango === "30d") {
        const limite = new Date(); limite.setDate(limite.getDate() - 30); return d >= limite
      }
      if (rango === "mes") {
        return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear()
      }
      if (rango === "3m") {
        const limite = new Date(); limite.setMonth(limite.getMonth() - 3); return d >= limite
      }
      return true
    })
  }

  const ventasFiltradas = useMemo(() => filtrarPorRango(ventas), [ventas, rango])
  const comprasFiltradas = useMemo(() => filtrarPorRango(compras), [compras, rango])

  const totalVentas = ventasFiltradas.reduce((s, v) => s + v.precio_total, 0)
  const totalCompras = comprasFiltradas.reduce((s, c) => s + c.precio_total, 0)
  const utilidadBruta = totalVentas - totalCompras
  const margen = totalVentas > 0 ? ((utilidadBruta / totalVentas) * 100).toFixed(1) : "0"
  const ticketPromedio = ventasFiltradas.length > 0 ? totalVentas / ventasFiltradas.length : 0

  const diasGrafica = useMemo(() => {
    const dias = rango === "7d" ? 7 : rango === "30d" ? 30 : rango === "mes" ? ahora.getDate() : 90
    return Array.from({ length: Math.min(dias, 30) }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (Math.min(dias, 30) - 1 - i))
      const key = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
      const tVentas = ventas.filter((v) => v.fecha === key).reduce((s, v) => s + v.precio_total, 0)
      const tCompras = compras.filter((c) => c.fecha === key).reduce((s, c) => s + c.precio_total, 0)
      return {
        dia: rango === "7d" ? DIAS_SEMANA[d.getDay()] : `${d.getDate()}/${d.getMonth()+1}`,
        Ventas: tVentas,
        Compras: tCompras,
      }
    })
  }, [ventas, compras, rango])

  const ventasPorMes = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const mes = d.getMonth()
      const anio = d.getFullYear()
      const total = ventas
        .filter((v) => { const fd = parseFecha(v.fecha); return fd && fd.getMonth() === mes && fd.getFullYear() === anio })
        .reduce((s, v) => s + v.precio_total, 0)
      return { mes: `${MESES[mes]} ${anio}`, total }
    })
  }, [ventas])

  const topProductos = useMemo(() => {
    const mapa: Record<string, { unidades: number; total: number }> = {}
    ventasFiltradas.forEach((v) => {
      if (!mapa[v.nombre_producto]) mapa[v.nombre_producto] = { unidades: 0, total: 0 }
      mapa[v.nombre_producto].unidades += v.cantidad
      mapa[v.nombre_producto].total += v.precio_total
    })
    return Object.entries(mapa)
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [ventasFiltradas])

  const ventasPorDia = useMemo(() => {
    const acum = Array(7).fill(0)
    ventasFiltradas.forEach((v) => {
      const d = parseFecha(v.fecha)
      if (d) acum[d.getDay()] += v.precio_total
    })
    return DIAS_SEMANA.map((dia, i) => ({ dia, total: acum[i] }))
  }, [ventasFiltradas])

  const ventasPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {}
    ventasFiltradas.forEach((v) => {
      const cat = v.nombre_producto.split(" ")[0]
      mapa[cat] = (mapa[cat] ?? 0) + v.precio_total
    })
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [ventasFiltradas])

  const topProveedores = useMemo(() => {
    const mapa: Record<string, number> = {}
    comprasFiltradas.forEach((c) => {
      mapa[c.nombre_proveedor] = (mapa[c.nombre_proveedor] ?? 0) + c.precio_total
    })
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, total]) => ({ nombre, total }))
  }, [comprasFiltradas])

  const pg = [
    { concepto: "Ingresos por ventas", valor: totalVentas, tipo: "ingreso" },
    { concepto: "Costo de mercancía", valor: -totalCompras, tipo: "costo" },
    { concepto: "Utilidad bruta", valor: utilidadBruta, tipo: utilidadBruta >= 0 ? "utilidad" : "perdida" },
  ]

  const rangoLabels: Record<Rango, string> = {
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "mes": `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`,
    "3m": "Últimos 3 meses",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      <div className="flex items-center gap-2">
        {(["7d","30d","mes","3m"] as Rango[]).map((r) => (
          <button
            key={r}
            onClick={() => setRango(r)}
            className={`px-3 py-1.5 rounded-lg text-[11.5px] border transition-colors ${
              rango === r
                ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple"
                : "bg-bg-card border-border text-text-secondary hover:border-accent-purple/30"
            }`}
          >
            {rangoLabels[r]}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => exportarReportesExcel(ventasFiltradas, comprasFiltradas, topProductos, topProveedores, rangoLabels[rango])}
            className="flex items-center gap-2 bg-success/10 border border-success/30 text-success px-3 py-1.5 rounded-lg text-[11.5px] hover:bg-success/15 transition-colors"
          >
            <i className="ti ti-file-spreadsheet text-sm" />
            Excel
          </button>
          <button
            onClick={() => exportarReportesPDF(ventasFiltradas, comprasFiltradas, topProductos, topProveedores, rangoLabels[rango])}
            className="flex items-center gap-2 bg-accent-purple/12 border border-accent-purple/30 text-accent-purple px-3 py-1.5 rounded-lg text-[11.5px] hover:bg-accent-purple/20 transition-colors"
          >
            <i className="ti ti-file-type-pdf text-sm" />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales" value={fmt(totalVentas)} sub={`${ventasFiltradas.length} transacciones`} icon="ti-receipt" subType="success" />
        <KpiCard label="Costo de ventas" value={fmt(totalCompras)} sub={`${comprasFiltradas.length} compras`} icon="ti-shopping-cart" subType="neutral" />
        <KpiCard label="Utilidad bruta" value={fmt(utilidadBruta)} sub={`Margen ${margen}%`} icon="ti-trending-up" subType={utilidadBruta >= 0 ? "success" : "danger"} accentLeft={utilidadBruta >= 0 ? "success" : "danger"} />
        <KpiCard label="Ticket promedio" value={fmt(ticketPromedio)} sub="Por transacción" icon="ti-receipt-2" subType="neutral" />
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3">
          <Seccion title={`Ventas vs Compras — ${rangoLabels[rango]}`} icon="ti-chart-line">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={diasGrafica}>
                <CartesianGrid stroke="#1E2640" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: "#4A5568", fontSize: 10 }} axisLine={false} tickLine={false} interval={rango === "30d" || rango === "3m" ? 4 : 0} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Ventas" stroke="#6C63FF" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#6C63FF" }} />
                <Line type="monotone" dataKey="Compras" stroke="#29ABE2" strokeWidth={2} dot={false} strokeDasharray="4 2" activeDot={{ r: 4, fill: "#29ABE2" }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <div className="w-4 h-0.5 bg-accent-purple rounded" /> Ventas
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <div className="w-4 h-0.5 bg-accent-blue rounded" /> Compras
              </div>
            </div>
          </Seccion>
        </div>
        <div className="col-span-2">
          <Seccion title="Ventas por categoría" icon="ti-chart-donut">
            {ventasPorCategoria.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-text-muted text-sm">Sin datos para el período</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={ventasPorCategoria} cx="40%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value">
                    {ventasPorCategoria.map((_, i) => (
                      <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" align="right" verticalAlign="middle" formatter={(value) => <span style={{ color: "#8892AA", fontSize: 11 }}>{value}</span>} />
                  <Tooltip contentStyle={{ background: "#141824", border: "1px solid #252D40", borderRadius: 8, fontSize: 11, color: "#E8ECFA" }} formatter={(v: unknown) => [fmt(v as number), "Ventas"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Seccion>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Seccion title="Evolución mensual (últimos 6 meses)" icon="ti-calendar-stats">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ventasPorMes} barSize={26}>
              <CartesianGrid stroke="#1E2640" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: "#4A5568", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Ventas" fill="#6C63FF" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </Seccion>
        <Seccion title="Ventas por día de la semana" icon="ti-clock">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={ventasPorDia} barSize={26}>
              <CartesianGrid stroke="#1E2640" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: "#4A5568", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Ventas" radius={[4, 4, 0, 0]}>
                {ventasPorDia.map((entry, i) => (
                  <Cell key={i} fill={entry.total === Math.max(...ventasPorDia.map((d) => d.total)) ? "#6C63FF" : "#29ABE2"} opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Seccion>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Seccion title="Top 10 productos más vendidos" icon="ti-trophy">
          {topProductos.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">Sin ventas en el período</div>
          ) : (
            <div className="flex flex-col gap-2">
              {topProductos.map((p, i) => {
                const maxVal = topProductos[0].total
                const pct = (p.total / maxVal) * 100
                const rankColor = i === 0 ? "text-warning" : i === 1 ? "text-text-secondary" : i === 2 ? "text-warning/60" : "text-text-muted"
                return (
                  <div key={p.nombre}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-medium w-5 ${rankColor}`}>{i + 1}</span>
                      <span className="flex-1 text-text-primary text-[11.5px] truncate">{p.nombre}</span>
                      <span className="text-text-muted text-[10.5px]">{p.unidades} u</span>
                      <span className="text-success text-[11px] font-medium w-16 text-right">{fmt(p.total)}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent-purple transition-all" style={{ width: `${pct}%`, opacity: 1 - i * 0.07 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Seccion>
        <Seccion title="Top proveedores por gasto" icon="ti-truck">
          {topProveedores.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">Sin compras en el período</div>
          ) : (
            <div className="flex flex-col gap-3">
              {topProveedores.map((p, i) => {
                const maxVal = topProveedores[0].total
                const pct = (p.total / maxVal) * 100
                return (
                  <div key={p.nombre}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-medium min-w-6" style={{ background: COLORES_PIE[i % COLORES_PIE.length] }}>
                        {p.nombre.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="flex-1 text-text-primary text-[11.5px] truncate">{p.nombre}</span>
                      <span className="text-accent-blue text-[11px] font-medium">{fmt(p.total)}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${pct}%`, opacity: 1 - i * 0.12 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Seccion>
      </div>

      <Seccion title={`Estado de resultados — ${rangoLabels[rango]}`} icon="ti-report-money">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-bg-base border-b border-border">
                <th className="text-text-muted font-medium text-left px-4 py-2.5 text-[10px] uppercase tracking-wider">Concepto</th>
                <th className="text-text-muted font-medium text-right px-4 py-2.5 text-[10px] uppercase tracking-wider">Monto</th>
                <th className="text-text-muted font-medium text-right px-4 py-2.5 text-[10px] uppercase tracking-wider">% Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {pg.map((row) => (
                <tr key={row.concepto} className="border-b border-border/40 last:border-0">
                  <td className={`px-4 py-3 font-medium ${row.tipo === "utilidad" ? "text-success" : row.tipo === "perdida" ? "text-danger" : row.tipo === "costo" ? "text-text-secondary" : "text-text-primary"}`}>
                    {row.tipo === "utilidad" || row.tipo === "perdida" ? (
                      <span className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${row.tipo === "utilidad" ? "bg-success" : "bg-danger"}`} />
                        {row.concepto}
                      </span>
                    ) : row.concepto}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium tabular-nums ${row.tipo === "utilidad" ? "text-success" : row.tipo === "perdida" ? "text-danger" : row.tipo === "costo" ? "text-text-secondary" : "text-text-primary"}`}>
                    {row.valor < 0 ? `(${fmt(Math.abs(row.valor))})` : fmt(row.valor)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {totalVentas > 0 ? `${Math.abs((row.valor / totalVentas) * 100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-bg-base border-t border-border">
                <td className="px-4 py-3 text-text-primary font-medium text-[11.5px]">Margen neto estimado</td>
                <td className="px-4 py-3 text-right font-medium">
                  <span className={utilidadBruta >= 0 ? "text-success" : "text-danger"}>{margen}%</span>
                </td>
                <td className="px-4 py-3 text-right text-text-muted text-[10.5px]">Sobre ingresos</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Por cada $100 vendidos", value: `$${(100 * (Number(margen) / 100)).toFixed(0)} utilidad`, color: "text-success" },
            { label: "Punto de equilibrio", value: totalCompras > 0 ? fmt(totalCompras) : "—", color: "text-warning" },
            { label: "Eficiencia operativa", value: totalVentas > 0 ? `${((totalVentas / (totalVentas + totalCompras)) * 100).toFixed(0)}%` : "—", color: "text-accent-blue" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-bg-base border border-border rounded-lg p-3 text-center">
              <div className={`text-base font-medium ${color} mb-0.5`}>{value}</div>
              <div className="text-text-muted text-[10.5px]">{label}</div>
            </div>
          ))}
        </div>
      </Seccion>

    </div>
  )
}