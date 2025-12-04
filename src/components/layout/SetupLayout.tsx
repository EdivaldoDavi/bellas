import { type ReactNode } from "react";
import styles from "./SetupLayout.module.css";

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
