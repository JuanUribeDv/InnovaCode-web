import { useLocation, useNavigate } from "react-router-dom"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard ejecutivo",
  "/reportes": "Reportes",
  "/ventas": "Ventas",
  "/compras": "Compras",
  "/inventario": "Inventario",
  "/proveedores": "Proveedores",
  "/usuarios": "Usuarios",
  "/alertas": "Alertas",
  "/metas": "Metas de ventas",
  "/configuracion": "Configuración",
  "/perfil": "Mi perfil",
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const title = titles[location.pathname] ?? "NovaCore"

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <header className="h-[52px] bg-bg-base border-b border-border flex items-center px-5 gap-3 sticky top-0 z-30">
      <h1 className="text-text-primary font-medium text-[15px] flex-1">{title}</h1>

      <span className="text-text-muted text-[11px] flex items-center gap-1">
        <i className="ti ti-calendar text-[12px]" />
        {today}
      </span>

      <button
        onClick={() => navigate("/alertas")}
        className="w-8 h-8 bg-bg-card border border-border-light rounded-lg flex items-center justify-center relative hover:border-accent-purple/40 transition-colors"
      >
        <i className="ti ti-bell text-text-secondary text-base" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
      </button>
    </header>
  )
}