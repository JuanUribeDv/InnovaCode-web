import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/layout/Layout"
import Login from "./pages/auth/Login"
import Dashboard from "./pages/dashboard/Dashboard"
import Ventas from "./pages/ventas/Ventas"
import Compras from "./pages/compras/Compras"
import Inventario from "./pages/inventario/Inventario"
import Proveedores from "./pages/proveedores/Proveedores"
import Usuarios from "./pages/usuarios/Usuarios"
import Alertas from "./pages/alertas/Alertas"
import Metas from "./pages/metas/Metas"
import Configuracion from "./pages/configuracion/Configuracion"
import Perfil from "./pages/perfil/Perfil"
import Reportes from "./pages/reportes/Reportes"
import Recetas from "./pages/recetas/Recetas"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="compras" element={<Compras />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="alertas" element={<Alertas />} />
          <Route path="metas" element={<Metas />} />
          <Route path="configuracion" element={<Configuracion />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="recetas" element={<Recetas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App