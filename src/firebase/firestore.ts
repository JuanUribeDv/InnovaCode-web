import {
  collection, query, where, getDocs, doc, updateDoc,
  addDoc, deleteDoc, getDoc
} from "firebase/firestore"
import { db } from "./config"
import type { Venta, Compra, Producto, Proveedor, Usuario, Meta, Receta} from "../types"

const EMPRESA_ID = "empresa_demo"

// ─── VENTAS ──────────────────────────────────────────────
export async function getVentasHoy(): Promise<Venta[]> {
  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).replace(/\//g, "/")
  const q = query(
    collection(db, "ventas"),
    where("empresa_id", "==", EMPRESA_ID),
    where("fecha", "==", hoy)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta))
}

export async function getVentasMes(mes: string): Promise<Venta[]> {
  // mes formato: "06/2026"
  const q = query(
    collection(db, "ventas"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Venta))
    .filter((v) => v.fecha?.endsWith(mes.slice(2)))
}

export async function getAllVentas(): Promise<Venta[]> {
  const q = query(
    collection(db, "ventas"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Venta))
}

export async function addVenta(venta: Omit<Venta, "id">): Promise<void> {
  await addDoc(collection(db, "ventas"), venta)
}

// ─── COMPRAS ─────────────────────────────────────────────
export async function getComprasHoy(): Promise<Compra[]> {
  const hoy = new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).replace(/\//g, "/")
  const q = query(
    collection(db, "compras"),
    where("empresa_id", "==", EMPRESA_ID),
    where("fecha", "==", hoy)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Compra))
}

export async function getAllCompras(): Promise<Compra[]> {
  const q = query(
    collection(db, "compras"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Compra))
}

export async function addCompra(compra: Omit<Compra, "id">): Promise<void> {
  await addDoc(collection(db, "compras"), compra)
}

// ─── INVENTARIO ──────────────────────────────────────────
export async function getInventario(): Promise<Producto[]> {
  const q = query(
    collection(db, "inventario"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Producto))
}

export async function updateProducto(id: string, data: Partial<Producto>): Promise<void> {
  await updateDoc(doc(db, "inventario", id), data)
}

export async function addProducto(producto: Omit<Producto, "id">): Promise<void> {
  await addDoc(collection(db, "inventario"), producto)
}

export async function deleteProducto(id: string): Promise<void> {
  await deleteDoc(doc(db, "inventario", id))
}

// ─── PROVEEDORES ─────────────────────────────────────────
export async function getProveedores(): Promise<Proveedor[]> {
  const q = query(
    collection(db, "proveedores"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Proveedor))
}

export async function addProveedor(p: Omit<Proveedor, "id">): Promise<void> {
  await addDoc(collection(db, "proveedores"), p)
}

export async function updateProveedor(id: string, data: Partial<Proveedor>): Promise<void> {
  await updateDoc(doc(db, "proveedores", id), data)
}

export async function deleteProveedor(id: string): Promise<void> {
  await deleteDoc(doc(db, "proveedores", id))
}

// ─── USUARIOS ────────────────────────────────────────────
export async function getUsuarios(): Promise<Usuario[]> {
  const q = query(
    collection(db, "usuarios"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Usuario))
}

export async function updateUsuario(id: string, data: Partial<Usuario>): Promise<void> {
  await updateDoc(doc(db, "usuarios", id), data)
}

// ─── METAS ───────────────────────────────────────────────
export async function getMetaMes(mesAno: string): Promise<Meta | null> {
  // mesAno formato: "empresa_demo_2026-06"
  const docRef = doc(db, "metas", `${EMPRESA_ID}_${mesAno}`)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Meta
}

// ─── RECETAS ─────────────────────────────────────────────
export async function getRecetas(): Promise<Receta[]> {
  const q = query(
    collection(db, "recetas"),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Receta))
}

export async function addReceta(receta: Omit<Receta, "id">): Promise<void> {
  await addDoc(collection(db, "recetas"), receta)
}

export async function updateReceta(id: string, data: Partial<Receta>): Promise<void> {
  await updateDoc(doc(db, "recetas", id), data)
}

export async function deleteReceta(id: string): Promise<void> {
  await deleteDoc(doc(db, "recetas", id))
}

// ─── DESCUENTO INVENTARIO POR RECETA (igual que la app) ──
export async function descontarIngredientesPorReceta(
  nombreProducto: string,
  cantidadVendida: number
): Promise<void> {
  const q = query(
    collection(db, "recetas"),
    where("nombre", "==", nombreProducto),
    where("empresa_id", "==", EMPRESA_ID)
  )
  const snap = await getDocs(q)
  if (snap.empty) return // sin receta, no descuenta

  const recetaDoc = snap.docs[0]
  const ingredientes = recetaDoc.data().ingredientes as Array<{
    productoId: string
    nombre_producto: string
    cantidad: number
    unidad: string
  }>

  const factorConversion = (desde: string, hasta: string): number | null => {
    if (desde === hasta) return 1
    if (desde === "g" && hasta === "kg") return 0.001
    if (desde === "kg" && hasta === "g") return 1000
    if (desde === "mL" && hasta === "L") return 0.001
    if (desde === "L" && hasta === "mL") return 1000
    return null
  }

  for (const ing of ingredientes) {
    const ref = doc(db, "inventario", ing.productoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) continue

    const unidadInventario = (snap.data().unidad_base ?? "und").toLowerCase()
    const unidadReceta = ing.unidad.toLowerCase()
    const factor = factorConversion(unidadReceta, unidadInventario) ?? 1
    const cantidadDescontar = ing.cantidad * cantidadVendida * factor
    const cantidadActual = snap.data().cantidad as number
    const hoy = new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    })

    await updateDoc(ref, {
      cantidad: Math.max(0, cantidadActual - cantidadDescontar),
      ultimo_movimiento: "salida",
      fecha_ultimo_movimiento: hoy,
    })
  }
}

// ─── INVENTARIO — Entrada y Salida ───────────────────────
export async function registrarEntradaProducto(
  productoId: string,
  cantidad: number,
  nuevoPrecio?: number
): Promise<void> {
  const ref = doc(db, "inventario", productoId)
  const snap = await getDoc(ref)
  const cantidadActual = (snap.data()?.cantidad as number) ?? 0
  const actualizacion: Record<string, any> = {
    cantidad: cantidadActual + cantidad,
    ultimo_movimiento: "entrada",
    fecha_ultimo_movimiento: new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }),
  }
  if (nuevoPrecio !== undefined) actualizacion["precio_u"] = nuevoPrecio
  await updateDoc(ref, actualizacion)
}

export async function registrarSalidaProducto(
  productoId: string,
  cantidad: number
): Promise<void> {
  const ref = doc(db, "inventario", productoId)
  const snap = await getDoc(ref)
  const cantidadActual = (snap.data()?.cantidad as number) ?? 0
  if (cantidad > cantidadActual) throw new Error("Stock insuficiente")
  await updateDoc(ref, {
    cantidad: cantidadActual - cantidad,
    ultimo_movimiento: "salida",
    fecha_ultimo_movimiento: new Date().toLocaleDateString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }),
  })
}