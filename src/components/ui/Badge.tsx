type BadgeVariant = "success" | "danger" | "warning" | "info" | "purple" | "gray"

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const styles: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
  info: "bg-accent-blue/10 text-accent-blue",
  purple: "bg-accent-purple/10 text-accent-purple/90",
  gray: "bg-text-muted/10 text-text-secondary",
}

export default function Badge({ label, variant = "gray" }: BadgeProps) {
  return (
    <span className={`inline-block text-[9.5px] font-medium px-2 py-0.5 rounded-md ${styles[variant]}`}>
      {label}
    </span>
  )
}