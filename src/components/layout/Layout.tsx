import { useEffect, useState } from "react"
import { Outlet, Navigate } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { auth } from "../../firebase/config"
import { getUsuarios } from "../../firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

export default function Layout() {
  const [status, setStatus] = useState<"loading" | "allowed" | "forbidden" | "unauthenticated">("loading")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauthenticated")
        return
      }
      try {
        const usuarios = await getUsuarios()
        const u = usuarios.find((u) => u.correo === user.email)
       if (u && u.rol === "admin" && u.estado === "activo") {
          setStatus("allowed")
        } else {
          setStatus("forbidden")
        }
      } catch {
        setStatus("forbidden")
      }
    })
    return unsub
  }, [])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-text-secondary text-sm">Verificando acceso...</span>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" />
  }

  if (status === "forbidden") {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-base">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center">
            <i className="ti ti-lock text-danger text-3xl" />
          </div>
          <h2 className="text-text-primary text-lg font-medium">
            Acceso denegado
          </h2>
          <p className="text-text-secondary text-sm max-w-sm">
            Este panel es exclusivo para administradores de NovaCore.
            Si eres empleado, usa la app móvil.
          </p>
          <button
            onClick={() => auth.signOut()}
            className="px-5 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/90 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex bg-bg-base min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-[210px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}