import { NavLink, useNavigate } from "react-router-dom"
import { auth } from "../../firebase/config"
import { signOut } from "firebase/auth"

const navItems = [
  {
    section: "Principal",
    items: [
      { to: "/dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
      { to: "/reportes", icon: "ti-chart-bar", label: "Reportes" },
      { to: "/ventas", icon: "ti-receipt", label: "Ventas" },
      { to: "/compras", icon: "ti-shopping-cart", label: "Compras" },
    ],
  },
  {
    section: "Gestión",
    items: [
      { to: "/inventario", icon: "ti-box", label: "Inventario" },
      { to: "/proveedores", icon: "ti-truck", label: "Proveedores" },
      { to: "/recetas", icon: "ti-chef-hat", label: "Recetas" },
      { to: "/usuarios", icon: "ti-users", label: "Usuarios" },
      { to: "/alertas", icon: "ti-bell", label: "Alertas", badge: 3 },
    ],
  },
  {
    section: "Admin",
    items: [
      { to: "/metas", icon: "ti-target", label: "Metas" },
      { to: "/configuracion", icon: "ti-settings", label: "Configuración" },
    ],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth)
    navigate("/login")
  }

  return (
    <aside className="w-[210px] min-w-[210px] bg-bg-sidebar border-r border-border flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-[18px] border-b border-border">
        <div className="w-8 h-8 bg-accent-purple rounded-lg flex items-center justify-center text-white font-medium text-sm">
          N
        </div>
        <div>
          <div className="text-text-primary font-medium text-[15px]">NovaCore</div>
          <div className="text-text-muted text-[10px]">Panel admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((group) => (
          <div key={group.section} className="px-2 py-3">
            <div className="text-[10px] text-text-muted uppercase tracking-widest px-2 mb-1">
              {group.section}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg mb-0.5 text-[12.5px] transition-colors ${
                    isActive
                      ? "bg-accent-purple/15 text-accent-purple"
                      : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                  }`
                }
              >
                <i className={`ti ${item.icon} text-base`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Usuario abajo */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => navigate("/perfil")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg w-full hover:bg-bg-card transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple text-[11px] font-medium">
            JR
          </div>
          <div className="flex-1 text-left">
            <div className="text-text-primary text-[12px] font-medium">Juan Restrepo</div>
            <div className="text-text-muted text-[10px]">Administrador</div>
          </div>
          <i className="ti ti-chevron-right text-text-muted text-sm" />
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg w-full text-danger hover:bg-danger/10 transition-colors mt-1 text-[12px]"
        >
          <i className="ti ti-logout text-base" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}