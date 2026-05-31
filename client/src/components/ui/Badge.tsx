interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'blue'
  size?: 'sm' | 'md'
}

const variants = {
  default: 'bg-gray-700 text-gray-300',
  success: 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50',
  warning: 'bg-amber-900/60 text-amber-400 border border-amber-700/50',
  danger: 'bg-red-900/60 text-red-400 border border-red-700/50',
  info: 'bg-blue-900/60 text-blue-400 border border-blue-700/50',
  purple: 'bg-purple-900/60 text-purple-400 border border-purple-700/50',
  blue: 'bg-blue-900/60 text-blue-300 border border-blue-700/50',
}

const sizes = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-xs' }

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {label}
    </span>
  )
}

export function StatusBadge({ stato }: { stato: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    DA_SVOLGERE: { label: 'Da svolgere', variant: 'default' },
    SVOLTA: { label: 'Svolta', variant: 'success' },
    IN_RITARDO: { label: 'In ritardo', variant: 'danger' },
    APERTO: { label: 'Aperto', variant: 'danger' },
    IN_LAVORAZIONE: { label: 'In lavorazione', variant: 'warning' },
    RISOLTO: { label: 'Risolto', variant: 'success' },
    FORMAZIONE: { label: 'Formazione', variant: 'blue' },
    TEST: { label: 'Test', variant: 'purple' },
  }
  const cfg = map[stato] || { label: stato, variant: 'default' as const }
  return <Badge label={cfg.label} variant={cfg.variant} />
}
