import { useEffect, useState } from "react"
import { getAllVentas, getMetaMes } from "../../firebase/firestore"
import { doc, setDoc } from "firebase/firestore"
import { db } from "../../firebase/config"

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString("es-CO")}`
}

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function Metas() {
  const [ventasMes, setVentasMes] = useState(0)
  const [metaMes, setMetaMes] = useState(0)
  const [nuevaMeta, setNuevaMeta] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const mesIdx = now.getMonth()
  const anio = now.getFullYear()
  const mesAno = `${anio}-${String(mesIdx + 1).padStart(2, "0")}`
  const diasTranscurridos = now.getDate()
  const diasDelMes = new Date(anio, mesIdx + 1, 0).getDate()

  useEffect(() => {
    const cargar = async () => {
      const [ventas, meta] = await Promise.all([
        getAllVentas(),
        getMetaMes(mesAno),
      ])
      const mesActual = `${String(mesIdx + 1).padStart(2, "0")}/${anio}`
      const totalMes = ventas
        .filter((v) => {
          const p = v.fecha?.split("/")
          return p && `${p[1]}/${p[2]}` === mesActual
        })
        .reduce((s, v) => s + v.precio_total, 0)
      setVentasMes(totalMes)
      setMetaMes(meta?.monto_meta ?? 0)
      setLoading(false)
    }
    cargar()
  }, [])

  const progreso = metaMes > 0 ? Math.min((ventasMes / metaMes) * 100, 100) : 0
  const proyeccion = diasTranscurridos > 0 ? (ventasMes / diasTranscurridos) * diasDelMes : 0
  const falta = Math.max(metaMes - ventasMes, 0)

  const guardarMeta = async () => {
    const valor = Number(nuevaMeta.replace(/\D/g, ""))
    if (!valor) return
    setGuardando(true)
    await setDoc(doc(db, "metas", `empresa_demo_${mesAno}`), {
      monto_meta: valor,
      mes: String(mesIdx + 1).padStart(2, "0"),
      año: anio,
      empresa_id: "empresa_demo",
    })
    setMetaMes(valor)
    setEditando(false)
    setGuardando(false)
    setNuevaMeta("")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Progreso principal */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-5">
            <i className="ti ti-target text-accent-purple text-[15px]" />
            Progreso — {MESES[mesIdx]} {anio}
          </div>

          {metaMes > 0 ? (
            <>
              {/* Círculo de progreso SVG */}
              <div className="flex flex-col items-center mb-5">
                <div className="relative w-32 h-32">
                  <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                    <circle cx="64" cy="64" r="52" fill="none" stroke="#1E2640" strokeWidth="10" />
                    <circle
                      cx="64" cy="64" r="52" fill="none"
                      stroke="#6C63FF" strokeWidth="10"
                      strokeDasharray={`${(progreso / 100) * 326.7} 326.7`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-accent-purple text-2xl font-medium">{progreso.toFixed(0)}%</span>
                    <span className="text-text-muted text-[10px]">alcanzado</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: "Ventas actuales", value: fmt(ventasMes), color: "text-success" },
                  { label: "Meta del mes", value: fmt(metaMes), color: "text-text-primary" },
                  { label: "Faltan", value: fmt(falta), color: "text-warning" },
                  { label: "Días restantes", value: `${diasDelMes - diasTranscurridos}`, color: "text-accent-blue" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-bg-base border border-border rounded-lg p-2.5">
                    <div className="text-text-muted text-[10px] mb-0.5">{label}</div>
                    <div className={`font-medium text-[13px] ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[11px] mb-1.5">
                  <span className="text-text-secondary">Progreso del mes</span>
                  <span className="text-accent-purple font-medium">{progreso.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-purple rounded-full transition-all duration-700"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
              </div>

              <div className="bg-accent-purple/8 border border-accent-purple/20 rounded-lg p-3 flex items-center gap-2">
                <i className="ti ti-trending-up text-accent-purple text-[16px]" />
                <div className="text-text-secondary text-[11.5px]">
                  Al ritmo actual, proyección: <strong className="text-accent-purple">{fmt(proyeccion)}</strong>
                  {proyeccion >= metaMes
                    ? <span className="text-success"> · ¡Vas a superar la meta!</span>
                    : <span className="text-warning"> · Faltan {fmt(metaMes - proyeccion)} para la meta</span>
                  }
                </div>
              </div>

              <button
                onClick={() => setEditando(true)}
                className="w-full mt-3 py-2 border border-border rounded-lg text-text-secondary text-sm hover:border-accent-purple/40 hover:text-accent-purple transition-colors flex items-center justify-center gap-2"
              >
                <i className="ti ti-edit text-sm" />
                Cambiar meta del mes
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <i className="ti ti-target text-text-muted text-3xl" />
              <p className="text-text-secondary text-sm text-center">
                No hay meta configurada para {MESES[mesIdx]} {anio}
              </p>
              <button
                onClick={() => setEditando(true)}
                className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors flex items-center gap-2"
              >
                <i className="ti ti-plus" />
                Configurar meta
              </button>
            </div>
          )}
        </div>

        {/* Desglose semanal */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-4">
            <i className="ti ti-chart-bar text-accent-purple text-[15px]" />
            Desglose por semana
          </div>

          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => {
              const inicioSem = i * 7 + 1
              const finSem = Math.min((i + 1) * 7, diasDelMes)
              const enCurso = diasTranscurridos >= inicioSem && diasTranscurridos <= finSem
              const pasada = diasTranscurridos > finSem
              const metaSem = metaMes / 4

              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">
                        Sem {i + 1} ({inicioSem}–{finSem} {MESES[mesIdx].slice(0, 3)})
                      </span>
                      {enCurso && (
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-accent-purple/15 text-accent-purple">
                          En curso
                        </span>
                      )}
                    </div>
                    <span className={pasada || enCurso ? "text-success font-medium" : "text-text-muted"}>
                      {pasada || enCurso ? fmt(metaSem * (enCurso ? progreso / 100 : 1)) : "—"}
                    </span>
                  </div>
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: pasada ? "100%" : enCurso ? `${progreso}%` : "0%",
                        background: pasada ? "#4ADE80" : "#6C63FF",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-text-secondary text-[11px] mb-2">Progreso del mes en días</div>
            <div className="flex items-end gap-0.5 h-14">
              {Array.from({ length: diasDelMes }, (_, i) => {
                const dia = i + 1
                const pasado = dia <= diasTranscurridos
                const hoy2 = dia === diasTranscurridos
                return (
                  <div
                    key={dia}
                    className={`flex-1 rounded-sm transition-all ${
                      hoy2 ? "bg-accent-purple" :
                      pasado ? "bg-accent-purple/30" : "bg-border"
                    }`}
                    style={{ height: pasado ? `${30 + Math.random() * 26}px` : "8px" }}
                  />
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>1</span>
              <span>{diasDelMes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal editar meta */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-medium">Meta de {MESES[mesIdx]} {anio}</h3>
              <button onClick={() => setEditando(false)} className="text-text-muted hover:text-text-primary">
                <i className="ti ti-x text-lg" />
              </button>
            </div>
            <label className="text-text-secondary text-[11px] block mb-2">
              Monto de la meta (COP)
            </label>
            <div className="flex items-center gap-2 bg-bg-input border border-border-input rounded-lg px-3 py-2 mb-4">
              <span className="text-text-muted text-sm">$</span>
              <input
                type="text"
                value={nuevaMeta}
                onChange={(e) => setNuevaMeta(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 20000000"
                className="bg-transparent flex-1 text-text-primary text-sm outline-none"
              />
            </div>
            {nuevaMeta && (
              <p className="text-accent-purple text-[11px] mb-4">
                = {fmt(Number(nuevaMeta))}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setEditando(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarMeta}
                disabled={guardando || !nuevaMeta}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><i className="ti ti-device-floppy" /> Guardar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}