interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-text-primary font-medium text-base">{title}</h2>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}