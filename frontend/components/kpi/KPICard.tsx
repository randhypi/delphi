import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  loading?: boolean;
  trend?: {
    value: string;
    positive?: boolean;
  };
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-indigo-600",
  iconBg = "bg-indigo-50",
  loading = false,
  trend,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="card-glass p-5">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="card-glass p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>

      <p className="text-2xl font-bold text-slate-900 font-mono leading-none mb-1">
        {value}
      </p>

      {subtitle && (
        <p className="text-slate-400 text-xs mt-1">{subtitle}</p>
      )}

      {trend && (
        <div className="mt-2">
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
              trend.positive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
