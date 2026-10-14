import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../../firebase/config"
import { useNavigate } from "react-router-dom"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completa todos los campos.")
      return
    }
    setLoading(true)
    setError("")
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate("/dashboard")
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("Correo o contraseña incorrectos.")
      } else {
        setError("Error al iniciar sesión. Intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-accent-purple rounded-xl flex items-center justify-center text-white text-xl font-semibold mb-3">
            N
          </div>
          <h1 className="text-text-primary text-xl font-semibold">NovaCore</h1>
          <p className="text-text-secondary text-sm mt-1">Panel de administración</p>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h2 className="text-text-primary font-medium text-base mb-5">Iniciar sesión</h2>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-text-secondary text-[11px] mb-1 block">
                Correo electrónico
              </label>
              <div className="flex items-center gap-2 bg-bg-input border border-border-input rounded-lg px-3 py-2">
                <i className="ti ti-mail text-text-muted text-base" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@negocio.co"
                  className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
                />
              </div>
            </div>

            <div>
              <label className="text-text-secondary text-[11px] mb-1 block">
                Contraseña
              </label>
              <div className="flex items-center gap-2 bg-bg-input border border-border-input rounded-lg px-3 py-2">
                <i className="ti ti-lock text-text-muted text-base" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="bg-transparent flex-1 text-text-primary text-sm outline-none placeholder:text-text-muted"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  className="text-text-muted hover:text-text-secondary"
                >
                  <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"} text-base`} />
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <i className="ti ti-login text-base" />
                  Ingresar
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-text-muted text-[11px] text-center mt-4">
          NovaCore ERP · Panel web
        </p>
      </div>
    </div>
  )
}