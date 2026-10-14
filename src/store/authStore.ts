import { create } from "zustand"

interface AuthStore {
  empresaId: string
  rol: string
  nombreNegocio: string
  setSession: (empresaId: string, rol: string, nombreNegocio: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  empresaId: "empresa_demo",
  rol: "",
  nombreNegocio: "",
  setSession: (empresaId, rol, nombreNegocio) =>
    set({ empresaId, rol, nombreNegocio }),
  clear: () => set({ empresaId: "", rol: "", nombreNegocio: "" }),
}))