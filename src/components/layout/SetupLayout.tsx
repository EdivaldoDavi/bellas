import { type ReactNode } from "react";
import styles from "./SetupLayout.module.css";

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.bg} />

      {/* Conteúdo centralizado, mas sem card adicional */}
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
}
