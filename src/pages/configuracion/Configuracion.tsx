import { useState } from "react"

const seccionesNav = [
  { key: "negocio", icon: "ti-building-store", label: "Mi negocio" },
  { key: "alertas", icon: "ti-bell", label: "Alertas" },
  { key: "seguridad", icon: "ti-lock", label: "Seguridad" },
  { key: "apariencia", icon: "ti-palette", label: "Apariencia" },
  { key: "exportaciones", icon: "ti-file-export", label: "Exportaciones" },
]

interface Toggle { label: string; desc: string; value: boolean }

export default function Configuracion() {
  const [seccion, setSeccion] = useState("negocio")
  const [guardado, setGuardado] = useState(false)
  const [form, setForm] = useState({
    nombre: "El Buen Sabor",
    nit: "900.123.456-7",
    telefono: "604 345 6789",
    ciudad: "Medellín, Antioquia",
    direccion: "Calle 50 #40-20, El Poblado",
    tipo: "Comida rápida",
  })
  const [toggles, setToggles] = useState<Toggle[]>([
    { label: "Notificaciones por correo", desc: "Recibir alertas de stock y resumen diario al correo del admin.", value: true },
    { label: "Cierre de caja automático", desc: "Generar el cierre de caja a las 11:59pm si no se hace manualmente.", value: false },
    { label: "Mostrar precios con IVA", desc: "Incluir IVA en los reportes y recibos de venta.", value: true },
    { label: "Alertas push en el panel", desc: "Mostrar notificaciones emergentes cuando hay alertas críticas.", value: true },
  ])

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const flipToggle = (i: number) => {
    setToggles((prev) => prev.map((t, idx) => idx === i ? { ...t, value: !t.value } : t))
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Sub-nav */}
      <div className="w-44 min-w-44 flex flex-col gap-1 pt-1">
        <p className="text-text-muted text-[10px] uppercase tracking-widest px-2 mb-1">Secciones</p>
        {seccionesNav.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setSeccion(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors text-left w-full ${
              seccion === key
                ? "bg-accent-purple/12 text-accent-purple"
                : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
            }`}
          >
            <i className={`ti ${icon} text-[14px]`} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col gap-4">
        {seccion === "negocio" && (
          <>
            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-4">
                <i className="ti ti-photo text-accent-purple text-[15px]" />
                Logo y nombre
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent-purple rounded-xl flex items-center justify-center text-white text-2xl font-semibold">
                  E
                </div>
                <div>
                  <div className="text-text-primary text-[12.5px] font-medium mb-0.5">{form.nombre}</div>
                  <div className="text-text-muted text-[10.5px] mb-1.5">PNG o JPG · máx. 2MB · recomendado 200×200px</div>
                  <button className="text-[11px] px-3 py-1.5 rounded-lg bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/15 transition-colors flex items-center gap-1">
                    <i className="ti ti-upload text-xs" />
                    Cambiar logo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nombre del negocio", key: "nombre" },
                  { label: "NIT / RUT", key: "nit" },
                  { label: "Teléfono", key: "telefono" },
                  { label: "Ciudad", key: "ciudad" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-text-secondary text-[11px] block mb-1">{label}</label>
                    <input
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-text-secondary text-[11px] block mb-1">Dirección</label>
                  <input
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Tipo de negocio</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none"
                  >
                    <option>Comida rápida</option>
                    <option>Licorera</option>
                    <option>Minimercado</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-text-secondary text-[11px] block mb-1">Moneda</label>
                  <select className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none">
                    <option>COP — Peso colombiano</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-5">
              <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-3">
                <i className="ti ti-toggle-right text-accent-purple text-[15px]" />
                Preferencias del sistema
              </div>
              <div className="flex flex-col divide-y divide-border">
                {toggles.map((t, i) => (
                  <div key={t.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex-1 pr-4">
                      <div className="text-text-primary text-[12px] mb-0.5">{t.label}</div>
                      <div className="text-text-muted text-[10.5px]">{t.desc}</div>
                    </div>
                    <button
                      onClick={() => flipToggle(i)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${t.value ? "bg-accent-purple" : "bg-border"}`}
                    >
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${t.value ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={guardar}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all w-fit ${
                guardado
                  ? "bg-success text-white"
                  : "bg-accent-purple text-white hover:bg-accent-purple/90"
              }`}
            >
              <i className={`ti ${guardado ? "ti-check" : "ti-device-floppy"} text-base`} />
              {guardado ? "¡Guardado!" : "Guardar cambios"}
            </button>
          </>
        )}

        {seccion !== "negocio" && (
          <div className="bg-bg-card border border-border rounded-xl flex flex-col items-center justify-center py-20 gap-3">
            <i className="ti ti-tools text-text-muted text-3xl" />
            <p className="text-text-secondary text-sm">Sección en construcción</p>
            <p className="text-text-muted text-[11.5px]">Próximamente disponible</p>
          </div>
        )}
      </div>
    </div>
  )
}