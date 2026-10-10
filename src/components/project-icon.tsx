import {
  Activity, BookOpen, Boxes, BrainCircuit, Building2, CalendarDays, Camera,
  ChartColumn, ChartNoAxesCombined, Clapperboard, CodeXml, Coffee, Compass,
  CookingPot, Database, Dumbbell, Feather, Fingerprint, Flag, Flower2, Focus,
  GraduationCap, Handshake, HeartPulse, House, KanbanSquare, KeyRound, Leaf,
  ListTodo, LockKeyhole, Luggage, MapPinned, Megaphone, MessagesSquare, Network,
  NotebookPen, Orbit, Package, PackageCheck, Palette, Plane, Puzzle, Radio,
  Receipt, Route, ScanLine, Send, ShieldCheck, ShoppingCart, Sprout, Store,
  Scissors, Target, Telescope, Terminal, Truck, UsersRound, Utensils, Wallet, WashingMachine, Waypoints, Workflow, Wrench,
  type LucideIcon,
} from "lucide-react";
import { getProjectIdentity, type ProjectIconName } from "@/lib/project-identity";
import s from "./project-icon.module.css";

const icons = {
  Activity, BookOpen, Boxes, BrainCircuit, Building2, CalendarDays, Camera,
  ChartColumn, ChartNoAxesCombined, Clapperboard, CodeXml, Coffee, Compass,
  CookingPot, Database, Dumbbell, Feather, Fingerprint, Flag, Flower2, Focus,
  GraduationCap, Handshake, HeartPulse, House, KanbanSquare, KeyRound, Leaf,
  ListTodo, LockKeyhole, Luggage, MapPinned, Megaphone, MessagesSquare, Network,
  NotebookPen, Orbit, Package, PackageCheck, Palette, Plane, Puzzle, Radio,
  Receipt, Route, ScanLine, Send, ShieldCheck, ShoppingCart, Sprout, Store,
  Scissors, Target, Telescope, Terminal, Truck, UsersRound, Utensils, Wallet, WashingMachine, Waypoints, Workflow, Wrench,
} satisfies Record<ProjectIconName, LucideIcon>;

export function ProjectIcon({ project, className = "", size = 26 }: {
  project: { id: string; title: string }; className?: string; size?: number;
}) {
  const identity = getProjectIdentity(project);
  const Icon = icons[identity.icon];
  return <span className={`${s.tile} ${s[identity.tone]} ${className}`} aria-hidden="true" data-project-icon={identity.icon} data-project-tone={identity.tone}>
    <Icon size={size} strokeWidth={1.8}/>
  </span>;
}
