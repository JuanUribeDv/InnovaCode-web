interface KpiCardProps {
  label: string
  value: string
  sub?: string
  subType?: "success" | "danger" | "warning" | "neutral"
  icon?: string
  accentLeft?: "danger" | "warning" | "success" | "purple" | "blue"
}

const subColors = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  neutral: "text-text-muted",
}

const accentColors = {
  danger: "border-l-danger",
  warning: "border-l-warning",
  success: "border-l-success",
  purple: "border-l-accent-purple",
  blue: "border-l-accent-blue",
}

export default function KpiCard({
  label, value, sub, subType = "success", icon, accentLeft,
}: KpiCardProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-xl p-3 ${
        accentLeft ? `border-l-2 ${accentColors[accentLeft]}` : ""
      }`}
    >
      <div className="text-text-secondary text-[10.5px] mb-1 flex items-center gap-1">
        {icon && <i className={`ti ${icon} text-[13px]`} />}
        {label}
      </div>
      <div className="text-text-primary text-lg font-medium">{value}</div>
      {sub && (
        <div className={`text-[10px] mt-1 ${subColors[subType]}`}>{sub}</div>
      )}
    </div>
  )
}