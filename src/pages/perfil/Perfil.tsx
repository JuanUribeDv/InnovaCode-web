import { useEffect, useState } from "react"
import { auth } from "../../firebase/config"
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth"
import { getUsuarios, updateUsuario } from "../../firebase/firestore"
import type { Usuario } from "../../types"

export default function Perfil() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nombre: "", correo: "", telefono: "" })
  const [loading, setLoading] = useState(true)
  const [guardado, setGuardado] = useState(false)
  const [modalPass, setModalPass] = useState(false)
  const [passActual, setPassActual] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [passError, setPassError] = useState("")
  const [passOk, setPassOk] = useState(false)
  const [cambiando, setCambiando] = useState(false)

  const currentUser = auth.currentUser

  const initiales = (nombre: string) =>
    nombre
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()

  useEffect(() => {
    const cargar = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          setLoading(false)
          return
        }
        const usuarios = await getUsuarios()
        const u = usuarios.find(
          (u) =>
            u.correo === user.email ||
            u.correo === user.email?.toLowerCase()
        )
        if (u) {
          setUsuario(u)
          setForm({
            nombre: u.nombre,
            correo: u.correo,
            telefono: u.telefono ?? "",
          })
        } else {
          setForm({
            nombre: user.displayName ?? "Administrador",
            correo: user.email ?? "",
            telefono: "",
          })
        }
      } catch (error) {
        console.error("Error cargando perfil:", error)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const guardar = async () => {
    if (!usuario?.id) return
    await updateUsuario(usuario.id, {
      nombre: form.nombre,
      telefono: form.telefono,
    })
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const cambiarPassword = async () => {
    if (!currentUser || !passActual || !passNueva) return
    if (passNueva.length < 6) {
      setPassError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    setCambiando(true)
    setPassError("")
    try {
      const cred = EmailAuthProvider.credential(
        currentUser.email!,
        passActual
      )
      await reauthenticateWithCredential(currentUser, cred)
      await updatePassword(currentUser, passNueva)
      setPassOk(true)
      setTimeout(() => {
        setModalPass(false)
        setPassOk(false)
        setPassActual("")
        setPassNueva("")
      }, 1500)
    } catch {
      setPassError("Contraseña actual incorrecta.")
    } finally {
      setCambiando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <i className="ti ti-user-off text-text-muted text-3xl" />
        <p className="text-text-secondary text-sm">
          No se encontró el perfil en Firestore.
        </p>
        <p className="text-text-muted text-[11px]">
          Sesión activa: {currentUser?.email}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      {/* Hero */}
      <div className="bg-bg-card border border-border rounded-xl p-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-white text-2xl font-medium min-w-16">
          {initiales(usuario.nombre)}
        </div>
        <div className="flex-1">
          <div className="text-text-primary text-lg font-medium mb-1">
            {usuario.nombre}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-accent-purple/15 text-accent-purple font-medium">
              {usuario.rol.charAt(0).toUpperCase() + usuario.rol.slice(1)}
            </span>
            <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-success/10 text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              Activo
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <i className="ti ti-mail text-text-muted text-[12px]" />
              {usuario.correo}
            </span>
            <span className="flex items-center gap-1">
              <i className="ti ti-phone text-text-muted text-[12px]" />
              {usuario.telefono || "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Datos personales */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-4">
            <i className="ti ti-user text-accent-purple text-[15px]" />
            Datos personales
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-text-secondary text-[11px] block mb-1">
                Nombre completo
              </label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] block mb-1">
                Correo electrónico
              </label>
              <input
                value={form.correo}
                disabled
                className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-muted text-sm outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] block mb-1">
                Teléfono
              </label>
              <input
                value={form.telefono}
                onChange={(e) =>
                  setForm({ ...form, telefono: e.target.value })
                }
                placeholder="Ej: 312 345 6789"
                className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-text-secondary text-[11px] block mb-1">
                Documento
              </label>
              <input
                value={`${usuario.tipoDocumento}: ${usuario.numeroDocumento}`}
                disabled
                className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-muted text-sm outline-none cursor-not-allowed"
              />
            </div>
            <button
              onClick={guardar}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                guardado
                  ? "bg-success text-white"
                  : "bg-accent-purple text-white hover:bg-accent-purple/90"
              }`}
            >
              <i
                className={`ti ${
                  guardado ? "ti-check" : "ti-device-floppy"
                } text-base`}
              />
              {guardado ? "¡Guardado!" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <div className="text-text-primary font-medium text-[12.5px] flex items-center gap-2 mb-4">
            <i className="ti ti-shield-lock text-accent-purple text-[15px]" />
            Seguridad
          </div>
          <div className="flex flex-col divide-y divide-border">
            {[
              {
                icon: "ti-lock",
                iconBg: "bg-accent-purple/10",
                iconColor: "text-accent-purple",
                label: "Contraseña",
                desc: "Cambia tu contraseña de acceso",
                action: () => setModalPass(true),
                btnLabel: "Cambiar",
                btnClass:
                  "border-accent-purple/30 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/15",
              },
              {
                icon: "ti-device-mobile",
                iconBg: "bg-success/10",
                iconColor: "text-success",
                label: "Verificación en 2 pasos",
                desc: "Aumenta la seguridad de tu cuenta",
                action: () => {},
                btnLabel: "Configurar",
                btnClass:
                  "border-border text-text-secondary hover:border-accent-purple/30",
              },
              {
                icon: "ti-history",
                iconBg: "bg-accent-blue/10",
                iconColor: "text-accent-blue",
                label: "Sesiones activas",
                desc: "Revisa los dispositivos conectados",
                action: () => {},
                btnLabel: "Ver todas",
                btnClass:
                  "border-border text-text-secondary hover:border-accent-purple/30",
              },
            ].map(
              ({
                icon,
                iconBg,
                iconColor,
                label,
                desc,
                action,
                btnLabel,
                btnClass,
              }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center min-w-8`}
                  >
                    <i className={`ti ${icon} ${iconColor} text-[14px]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text-primary text-[12px]">{label}</div>
                    <div className="text-text-muted text-[10.5px]">{desc}</div>
                  </div>
                  <button
                    onClick={action}
                    className={`text-[10.5px] px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors ${btnClass}`}
                  >
                    {btnLabel}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal cambiar contraseña */}
      {modalPass && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-text-primary font-medium">
                Cambiar contraseña
              </h3>
              <button
                onClick={() => setModalPass(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <i className="ti ti-x text-lg" />
              </button>
            </div>

            {passError && (
              <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 rounded-lg mb-3">
                {passError}
              </div>
            )}
            {passOk && (
              <div className="bg-success/10 border border-success/30 text-success text-sm px-3 py-2 rounded-lg mb-3">
                ¡Contraseña actualizada!
              </div>
            )}

            <div className="flex flex-col gap-3 mb-5">
              {[
                {
                  label: "Contraseña actual",
                  value: passActual,
                  set: setPassActual,
                },
                {
                  label: "Nueva contraseña",
                  value: passNueva,
                  set: setPassNueva,
                },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-text-secondary text-[11px] block mb-1">
                    {label}
                  </label>
                  <input
                    type="password"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="w-full bg-bg-input border border-border-input rounded-lg px-3 py-2 text-text-primary text-sm outline-none focus:border-accent-purple/60 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModalPass(false)}
                className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm hover:bg-border/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={cambiarPassword}
                disabled={cambiando || !passActual || !passNueva}
                className="flex-1 py-2 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cambiando ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <i className="ti ti-lock" />
                    Actualizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}