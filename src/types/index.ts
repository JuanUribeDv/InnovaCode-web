export interface Venta {
  id?: string
  nombre_producto: string
  nombre_cliente: string
  cantidad: number
  precio_u: number
  precio_total: number
  fecha: string
  empresa_id: string
  origen: string
}

export interface Compra {
  id?: string
  nombre_producto: string
  nombre_proveedor: string
  cantidad: number
  precio_u: number
  precio_total: number
  fecha: string
  empresa_id: string
  origen: string
}

export interface Producto {
  id?: string
  nombre_producto: string
  cantidad: number
  precio_u: number
  stock_min: number
  categoria: string
  empresa_id: string
  fecha_creacion: string
  fecha_ultimo_movimiento: string
  ultimo_movimiento: string
  unidad_base?: string
  codigo_barras?: string
}

export interface Proveedor {
  id?: string
  nombre: string
  nit: string
  contacto: string
  email: string
  empresa_id: string
  fecha_creacion: string
}

export interface Usuario {
  id?: string
  nombre: string
  correo: string
  tipoDocumento: string
  numeroDocumento: string
  telefono: string
  estado: string
  rol: string
  empresa_id: string
}

export interface Meta {
  id?: string
  monto_meta: number
  mes: string
  año: number
  empresa_id: string
}

export interface Movimiento {
  id?: string
  nombre_producto: string
  tipo: string
  cantidad: number
  fecha: string
  empresa_id: string
  usuario?: string
}

export interface IngredienteReceta {
  productoId: string
  nombre_producto: string
  cantidad: number
  unidad: string
}

export interface Receta {
  id?: string
  nombre: string
  categoria: string
  descripcion: string
  empresa_id: string
  ingredientes: IngredienteReceta[]
  fechaCreacion?: number
}