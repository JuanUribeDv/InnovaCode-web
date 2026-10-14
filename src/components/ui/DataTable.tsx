interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, emptyMessage = "Sin registros",
}: DataTableProps<T>) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead className="bg-bg-base">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-text-muted font-medium text-left px-3 py-2.5 border-b border-border uppercase tracking-wider text-[10px] whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-text-muted py-10"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-accent-purple/[0.03] transition-colors last:border-0"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-text-primary">
                      {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}