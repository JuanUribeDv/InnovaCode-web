import { useEffect, useState } from "react"
import { getInventario } from "../../firebase/firestore"
import type { Producto } from "../../types"
import KpiCard from "../../components/ui/KpiCard"

interface Alerta {
  id: string
  titulo: string
  descripcion: string
  tipo: "critico" | "bajo" | "info"
  resuelta: boolean
  producto?: Producto
}

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [filtro, setFiltro] = useState("Todas")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const inventario = await getInventario()
      const generadas: Alerta[] = inventario
        .filter((p) => p.cantidad <= p.stock_min)
        .map((p) => ({
          id: p.id!,
          titulo: `${p.cantidad === 0 ? "Agotado" : "Stock crítico"} — ${p.nombre_producto}`,
          descripcion: p.cantidad === 0
            ? `El producto está completamente agotado. Stock mínimo configurado: ${p.stock_min} ${p.unidad_base ?? "u"}.`
            : `Quedan ${p.cantidad} ${p.unidad_base ?? "u"}. El stock mínimo configurado es ${p.stock_min} ${p.unidad_base ?? "u"}.`,
          tipo: p.cantidad === 0 ? "critico" : "bajo",
          resuelta: false,
          producto: p,
        }))
      setAlertas(generadas)
      setLoading(false)
    }
    cargar()
  }, [])

  const resolver = (id: string) => {
    setAlertas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resuelta: true } : a))
    )
  }

  const criticas = alertas.filter((a) => a.tipo === "critico" && !a.resuelta)
  const bajas = alertas.filter((a) => a.tipo === "bajo" && !a.resuelta)
  const resueltas = alertas.filter((a) => a.resuelta)

  const filtradas = alertas.filter((a) => {
    if (filtro === "Críticas") return a.tipo === "critico" && !a.resuelta
    if (filtro === "Stock bajo") return a.tipo === "bajo" && !a.resuelta
    if (filtro === "Resueltas") return a.resuelta
    return !a.resuelta
  })

  const tipoEstilos = {
    critico: {
      border: "border-l-danger",
      iconBg: "bg-danger/10",
      icon: "ti-alert-triangle",
      iconColor: "text-danger",
    },
    bajo: {
      border: "border-l-warning",
      iconBg: "bg-warning/10",
      icon: "ti-package",
      iconColor: "text-warning",
    },
    info: {
      border: "border-l-accent-blue",
      iconBg: "bg-accent-blue/10",
      icon: "ti-info-circle",
      iconColor: "text-accent-blue",
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Críticas" value={String(criticas.length)} sub="Acción inmediata" subType={criticas.length > 0 ? "danger" : "success"} icon="ti-alert-triangle" accentLeft={criticas.length > 0 ? "danger" : undefined} />
        <KpiCard label="Stock bajo" value={String(bajas.length)} sub="Por debajo del mínimo" subType={bajas.length > 0 ? "warning" : "success"} icon="ti-package" accentLeft={bajas.length > 0 ? "warning" : undefined} />
        <KpiCard label="Total activas" value={String(criticas.length + bajas.length)} sub="Sin resolver" subType="neutral" icon="ti-bell" />
        <KpiCard label="Resueltas hoy" value={String(resueltas.length)} sub="Atendidas" subType="success" icon="ti-circle-check" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2">
        {[
          { label: "Todas", count: alertas.filter((a) => !a.resuelta).length },
          { label: "Críticas", count: criticas.length },
          { label: "Stock bajo", count: bajas.length },
          { label: "Resueltas", count: resueltas.length },
        ].map(({ label, count }) => (
          <button
            key={label}
            onClick={() => setFiltro(label)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] border transition-colors ${
              filtro === label
                ? "bg-accent-purple/15 border-accent-purple/40 text-accent-purple"
                : "bg-bg-card border-border text-text-secondary hover:border-accent-purple/30"
            }`}
          >
            {label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              filtro === label ? "bg-accent-purple/20 text-accent-purple" : "bg-border text-text-muted"
            }`}>
              {count}
            </span>
          </button>
        ))}
        <button
          onClick={() => setAlertas((prev) => prev.map((a) => ({ ...a, resuelta: true })))}
          className="ml-auto flex items-center gap-2 bg-bg-card border border-border text-text-secondary px-3 py-1.5 rounded-lg text-[11.5px] hover:border-accent-purple/30 transition-colors"
        >
          <i className="ti ti-checks text-[13px]" />
          Marcar todas leídas
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16 gap-3">
          <i className="ti ti-bell-off text-text-muted text-3xl" />
          <p className="text-text-muted text-sm">
            {filtro === "Resueltas" ? "Sin alertas resueltas" : "Sin alertas activas — todo en orden"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtradas.map((a) => {
            const estilos = tipoEstilos[a.tipo]
            return (
              <div
                key={a.id}
                className={`bg-bg-card border border-border border-l-2 ${estilos.border} rounded-xl px-4 py-3 flex items-center gap-3 ${
                  a.resuelta ? "opacity-50" : ""
                }`}
              >
                <div className={`w-9 h-9 rounded-lg ${estilos.iconBg} flex items-center justify-center min-w-9`}>
                  <i className={`ti ${estilos.icon} ${estilos.iconColor} text-[17px]`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-text-primary text-[12.5px] font-medium mb-0.5">{a.titulo}</div>
                  <div className="text-text-secondary text-[11px]">{a.descripcion}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-medium ${
                      a.tipo === "critico" ? "bg-danger/10 text-danger" :
                      a.tipo === "bajo" ? "bg-warning/10 text-warning" :
                      "bg-accent-blue/10 text-accent-blue"
                    }`}>
                      {a.tipo === "critico" ? "Crítico" : a.tipo === "bajo" ? "Stock bajo" : "Info"}
                    </span>
                    {a.resuelta && (
                      <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-success/10 text-success font-medium">
                        Resuelta
                      </span>
                    )}
                  </div>
                </div>
                {!a.resuelta && (
                  <button
                    onClick={() => resolver(a.id)}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-success/30 bg-success/8 text-success hover:bg-success/15 transition-colors whitespace-nowrap"
                  >
                    <i className="ti ti-check text-sm" />
                    Resolver
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}