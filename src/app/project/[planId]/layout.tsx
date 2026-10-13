import styles from "./project-palette.module.css";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.workspace}>{children}</div>;
}
