import type { StockIconName } from "@/lib/stock-icon-catalog";
import { getPhaseIconName } from "@/lib/phase-icons";

export function StockIcon({ name, size = 18, className = "" }: {
  name: StockIconName; size?: number; className?: string;
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" data-stock-icon={name}>
    <use href={`/icons/tabler/sprite.svg#${name}`} />
  </svg>;
}

export function PhaseIcon({ phase, size = 18, className = "" }: {
  phase: { title: string; icon?: string }; size?: number; className?: string;
}) {
  return <StockIcon name={getPhaseIconName(phase)} size={size} className={className} />;
}
