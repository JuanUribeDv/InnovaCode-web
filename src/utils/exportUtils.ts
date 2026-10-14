import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─── Helpers ────────────────────────────────────────────────
function fmtPeso(n: number) {
  return `$${n.toLocaleString("es-CO")}`
}

function fechaHoy() {
  return new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

function nombreArchivo(base: string, ext: string) {
  const fecha = new Date().toISOString().slice(0, 10)
  return `${base}_${fecha}.${ext}`
}

// ─── Estilo base PDF ────────────────────────────────────────
function crearPDF(titulo: string, subtitulo?: string): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  // Header
  doc.setFillColor(13, 17, 25)
  doc.rect(0, 0, 297, 22, "F")

  doc.setFontSize(14)
  doc.setTextColor(240, 244, 255)
  doc.setFont("helvetica", "bold")
  doc.text("NovaCore ERP", 14, 10)

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(74, 85, 104)
  doc.text("Panel administrativo", 14, 16)

  doc.setFontSize(16)
  doc.setTextColor(240, 244, 255)
  doc.setFont("helvetica", "bold")
  doc.text(titulo, 297 / 2, 10, { align: "center" })

  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(74, 85, 104)
    doc.text(subtitulo, 297 / 2, 16, { align: "center" })
  }

  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)
  doc.text(`Generado: ${fechaHoy()}`, 283, 10, { align: "right" })

  return doc
}

// ─── KPI boxes en PDF ───────────────────────────────────────
function agregarKPIs(
  doc: jsPDF,
  kpis: { label: string; value: string; color?: [number, number, number] }[],
  y: number
) {
  const startX = 14
  const boxW = (297 - 28 - (kpis.length - 1) * 4) / kpis.length
  const boxH = 16

  kpis.forEach((kpi, i) => {
    const x = startX + i * (boxW + 4)
    doc.setFillColor(17, 27, 40)
    doc.setDrawColor(26, 42, 60)
    doc.roundedRect(x, y, boxW, boxH, 2, 2, "FD")

    doc.setFontSize(7)
    doc.setTextColor(74, 85, 104)
    doc.setFont("helvetica", "normal")
    doc.text(kpi.label.toUpperCase(), x + boxW / 2, y + 5, { align: "center" })

    const [r, g, b] = kpi.color ?? [240, 244, 255]
    doc.setFontSize(11)
    doc.setTextColor(r, g, b)
    doc.setFont("helvetica", "bold")
    doc.text(kpi.value, x + boxW / 2, y + 12, { align: "center" })
  })

  return y + boxH + 6
}

// ════════════════════════════════════════════════════════════
// EXPORTAR VENTAS
// ════════════════════════════════════════════════════════════
export function exportarVentasExcel(ventas: any[], periodo?: string) {
  const filas = ventas.map((v) => ({
    Fecha: v.fecha,
    Producto: v.nombre_producto,
    Cliente: v.nombre_cliente ?? "—",
    Cantidad: v.cantidad,
    "Precio unitario": v.precio_u,
    "Total venta": v.precio_total,
    Origen: v.origen ?? "Manual",
  }))

  const totalGeneral = ventas.reduce((s, v) => s + v.precio_total, 0)

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)

  // Ancho de columnas
  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 22 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
  ]

  // Fila de totales
  const totalRow = ventas.length + 2
  XLSX.utils.sheet_add_aoa(ws, [
    ["", "", "", "", "TOTAL GENERAL", totalGeneral, ""],
  ], { origin: totalRow })

  // Hoja resumen
  const resumen = [
    ["NovaCore ERP — Resumen de ventas"],
    [`Período: ${periodo ?? "General"}`],
    [`Generado: ${fechaHoy()}`],
    [],
    ["Total ventas", ventas.length],
    ["Ingresos totales", totalGeneral],
    ["Ticket promedio", ventas.length > 0 ? totalGeneral / ventas.length : 0],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  wsResumen["!cols"] = [{ wch: 22 }, { wch: 18 }]

  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")
  XLSX.utils.book_append_sheet(wb, ws, "Ventas")
  XLSX.writeFile(wb, nombreArchivo("NovaCore_Ventas", "xlsx"))
}

export function exportarVentasPDF(
  ventas: any[],
  kpis: { label: string; value: string; color?: [number, number, number] }[],
  periodo?: string
) {
  const doc = crearPDF("Reporte de Ventas", periodo)

  let y = agregarKPIs(doc, kpis, 27)

  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Producto", "Cliente", "Cant.", "Precio u.", "Total", "Origen"]],
    body: ventas.map((v) => [
      v.fecha,
      v.nombre_producto,
      v.nombre_cliente ?? "—",
      v.cantidad,
      fmtPeso(v.precio_u),
      fmtPeso(v.precio_total),
      v.origen ?? "Manual",
    ]),
    foot: [["", "", "", "", "TOTAL", fmtPeso(ventas.reduce((s, v) => s + v.precio_total, 0)), ""]],
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [200, 213, 232],
      fillColor: [17, 27, 40],
      lineColor: [26, 42, 60],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [13, 17, 25],
      textColor: [74, 85, 104],
      fontStyle: "bold",
      fontSize: 7,
    },
    footStyles: {
      fillColor: [13, 17, 25],
      textColor: [0, 200, 150],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [15, 23, 35] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right", textColor: [0, 200, 150] },
      6: { cellWidth: 22, halign: "center" },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(nombreArchivo("NovaCore_Ventas", "pdf"))
}

// ════════════════════════════════════════════════════════════
// EXPORTAR COMPRAS
// ════════════════════════════════════════════════════════════
export function exportarComprasExcel(compras: any[]) {
  const filas = compras.map((c) => ({
    Fecha: c.fecha,
    Producto: c.nombre_producto,
    Proveedor: c.nombre_proveedor,
    Cantidad: c.cantidad,
    "Precio unitario": c.precio_u,
    "Total compra": c.precio_total,
    "Registrado por": c.origen ?? "Manual",
  }))

  const totalGeneral = compras.reduce((s, c) => s + c.precio_total, 0)

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)

  ws["!cols"] = [
    { wch: 12 }, { wch: 28 }, { wch: 22 },
    { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
  ]

  const totalRow = compras.length + 2
  XLSX.utils.sheet_add_aoa(ws, [
    ["", "", "", "", "TOTAL GENERAL", totalGeneral, ""],
  ], { origin: totalRow })

  const resumen = [
    ["NovaCore ERP — Resumen de compras"],
    [`Generado: ${fechaHoy()}`],
    [],
    ["Total compras", compras.length],
    ["Gasto total", totalGeneral],
    ["Promedio por compra", compras.length > 0 ? totalGeneral / compras.length : 0],
    ["Proveedores únicos", new Set(compras.map((c) => c.nombre_proveedor)).size],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  wsResumen["!cols"] = [{ wch: 22 }, { wch: 18 }]

  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")
  XLSX.utils.book_append_sheet(wb, ws, "Compras")
  XLSX.writeFile(wb, nombreArchivo("NovaCore_Compras", "xlsx"))
}

export function exportarComprasPDF(
  compras: any[],
  kpis: { label: string; value: string; color?: [number, number, number] }[]
) {
  const doc = crearPDF("Reporte de Compras")

  let y = agregarKPIs(doc, kpis, 27)

  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Producto", "Proveedor", "Cant.", "Precio u.", "Total", "Registrado por"]],
    body: compras.map((c) => [
      c.fecha,
      c.nombre_producto,
      c.nombre_proveedor,
      c.cantidad,
      fmtPeso(c.precio_u),
      fmtPeso(c.precio_total),
      c.origen ?? "Manual",
    ]),
    foot: [["", "", "", "", "TOTAL", fmtPeso(compras.reduce((s, c) => s + c.precio_total, 0)), ""]],
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [200, 213, 232],
      fillColor: [17, 27, 40],
      lineColor: [26, 42, 60],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [13, 17, 25],
      textColor: [74, 85, 104],
      fontStyle: "bold",
      fontSize: 7,
    },
    footStyles: {
      fillColor: [13, 17, 25],
      textColor: [91, 164, 245],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [15, 23, 35] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 55 },
      2: { cellWidth: 45 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right", textColor: [91, 164, 245] },
      6: { cellWidth: 30, halign: "center" },
    },
    margin: { left: 14, right: 14 },
  })

  doc.save(nombreArchivo("NovaCore_Compras", "pdf"))
}

// ════════════════════════════════════════════════════════════
// EXPORTAR REPORTES
// ════════════════════════════════════════════════════════════
export function exportarReportesExcel(
  ventas: any[],
  compras: any[],
  topProductos: { nombre: string; unidades: number; total: number }[],
  topProveedores: { nombre: string; total: number }[],
  periodo: string
) {
  const wb = XLSX.utils.book_new()

  // Hoja resumen P&G
  const totalVentas = ventas.reduce((s, v) => s + v.precio_total, 0)
  const totalCompras = compras.reduce((s, c) => s + c.precio_total, 0)
  const utilidad = totalVentas - totalCompras
  const margen = totalVentas > 0 ? ((utilidad / totalVentas) * 100).toFixed(1) : "0"

  const pg = [
    ["NovaCore ERP — Estado de resultados"],
    [`Período: ${periodo}`],
    [`Generado: ${fechaHoy()}`],
    [],
    ["CONCEPTO", "MONTO", "% INGRESOS"],
    ["Ingresos por ventas", totalVentas, "100%"],
    ["Costo de mercancía", totalCompras, `${totalCompras > 0 && totalVentas > 0 ? ((totalCompras / totalVentas) * 100).toFixed(1) : 0}%`],
    ["Utilidad bruta", utilidad, `${margen}%`],
    [],
    ["Margen neto", `${margen}%`, ""],
    ["Ticket promedio", ventas.length > 0 ? totalVentas / ventas.length : 0, ""],
    ["Total transacciones", ventas.length, ""],
  ]
  const wsPG = XLSX.utils.aoa_to_sheet(pg)
  wsPG["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }]

  // Hoja top productos
  const wsProductos = XLSX.utils.json_to_sheet(
    topProductos.map((p, i) => ({
      Posición: i + 1,
      Producto: p.nombre,
      "Unidades vendidas": p.unidades,
      "Total ingresos": p.total,
      "% del total": totalVentas > 0 ? `${((p.total / totalVentas) * 100).toFixed(1)}%` : "0%",
    }))
  )
  wsProductos["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 14 }]

  // Hoja top proveedores
  const wsProveedores = XLSX.utils.json_to_sheet(
    topProveedores.map((p, i) => ({
      Posición: i + 1,
      Proveedor: p.nombre,
      "Total compras": p.total,
      "% del gasto": totalCompras > 0 ? `${((p.total / totalCompras) * 100).toFixed(1)}%` : "0%",
    }))
  )
  wsProveedores["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 18 }, { wch: 14 }]

  XLSX.utils.book_append_sheet(wb, wsPG, "P&G")
  XLSX.utils.book_append_sheet(wb, wsProductos, "Top Productos")
  XLSX.utils.book_append_sheet(wb, wsProveedores, "Top Proveedores")
  XLSX.writeFile(wb, nombreArchivo(`NovaCore_Reportes_${periodo.replace(/\s/g, "_")}`, "xlsx"))
}

export function exportarReportesPDF(
  ventas: any[],
  compras: any[],
  topProductos: { nombre: string; unidades: number; total: number }[],
  topProveedores: { nombre: string; total: number }[],
  periodo: string
) {
  const totalVentas = ventas.reduce((s, v) => s + v.precio_total, 0)
  const totalCompras = compras.reduce((s, c) => s + c.precio_total, 0)
  const utilidad = totalVentas - totalCompras
  const margen = totalVentas > 0 ? ((utilidad / totalVentas) * 100).toFixed(1) : "0"

  const doc = crearPDF("Reporte Ejecutivo", periodo)

  let y = agregarKPIs(doc, [
    { label: "Ingresos totales", value: fmtPeso(totalVentas), color: [0, 200, 150] },
    { label: "Costo de ventas", value: fmtPeso(totalCompras), color: [200, 213, 232] },
    { label: "Utilidad bruta", value: fmtPeso(utilidad), color: utilidad >= 0 ? [0, 200, 150] : [224, 82, 82] },
    { label: "Margen neto", value: `${margen}%`, color: utilidad >= 0 ? [0, 200, 150] : [224, 82, 82] },
    { label: "Transacciones", value: String(ventas.length), color: [91, 164, 245] },
  ], 27)

  // P&G
  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)
  doc.setFont("helvetica", "bold")
  doc.text("ESTADO DE RESULTADOS", 14, y + 2)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [["Concepto", "Monto", "% Ingresos"]],
    body: [
      ["Ingresos por ventas", fmtPeso(totalVentas), "100%"],
      ["Costo de mercancía", `(${fmtPeso(totalCompras)})`, totalVentas > 0 ? `${((totalCompras / totalVentas) * 100).toFixed(1)}%` : "—"],
      ["Utilidad bruta", fmtPeso(utilidad), `${margen}%`],
    ],
    styles: { fontSize: 8, cellPadding: 3, textColor: [200, 213, 232], fillColor: [17, 27, 40], lineColor: [26, 42, 60], lineWidth: 0.1 },
    headStyles: { fillColor: [13, 17, 25], textColor: [74, 85, 104], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [15, 23, 35] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    margin: { left: 14, right: 160 },
    tableWidth: 120,
  })

  const afterPG = (doc as any).lastAutoTable.finalY + 8

  // Top productos
  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)
  doc.setFont("helvetica", "bold")
  doc.text("TOP PRODUCTOS", 14, afterPG)

  autoTable(doc, {
    startY: afterPG + 4,
    head: [["#", "Producto", "Unidades", "Total"]],
    body: topProductos.slice(0, 8).map((p, i) => [
      i + 1,
      p.nombre,
      p.unidades,
      fmtPeso(p.total),
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: [200, 213, 232], fillColor: [17, 27, 40], lineColor: [26, 42, 60], lineWidth: 0.1 },
    headStyles: { fillColor: [13, 17, 25], textColor: [74, 85, 104], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [15, 23, 35] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 65 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 30, halign: "right", textColor: [0, 200, 150] },
    },
    margin: { left: 14, right: 160 },
    tableWidth: 130,
  })

  // Top proveedores (columna derecha)
  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)
  doc.setFont("helvetica", "bold")
  doc.text("TOP PROVEEDORES", 155, afterPG)

  autoTable(doc, {
    startY: afterPG + 4,
    head: [["#", "Proveedor", "Total compras"]],
    body: topProveedores.slice(0, 8).map((p, i) => [
      i + 1,
      p.nombre,
      fmtPeso(p.total),
    ]),
    styles: { fontSize: 8, cellPadding: 3, textColor: [200, 213, 232], fillColor: [17, 27, 40], lineColor: [26, 42, 60], lineWidth: 0.1 },
    headStyles: { fillColor: [13, 17, 25], textColor: [74, 85, 104], fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [15, 23, 35] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 35, halign: "right", textColor: [91, 164, 245] },
    },
    margin: { left: 155, right: 14 },
    tableWidth: 128,
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(42, 53, 65)
    doc.text(
      `NovaCore ERP · Página ${i} de ${pageCount} · ${fechaHoy()}`,
      297 / 2, 205, { align: "center" }
    )
  }

  doc.save(nombreArchivo(`NovaCore_Reporte_${periodo.replace(/\s/g, "_")}`, "pdf"))
}