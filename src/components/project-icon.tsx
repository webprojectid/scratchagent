import { getProjectIdentity } from "@/lib/project-identity";
import { projectStockIcons } from "@/lib/phase-icons";
import { StockIcon } from "./stock-icon";
import s from "./project-icon.module.css";

export function ProjectIcon({ project, className = "", size = 26, neutral = false }: {
  project: { id: string; title: string }; className?: string; size?: number; neutral?: boolean;
}) {
  const identity = getProjectIdentity(project);
  return <span className={`${s.tile} ${neutral ? s.neutral : s[identity.tone]} ${className}`} aria-hidden="true" data-project-icon={identity.icon} data-project-tone={neutral ? "neutral" : identity.tone}>
    <StockIcon name={projectStockIcons[identity.icon]} size={size} />
  </span>;
}
