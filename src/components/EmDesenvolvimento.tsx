import { Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "../css/EmDesenvolvimento.module.css";

export default function EmDesenvolvimento() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Wrench size={64} strokeWidth={1.5} className={styles.icon} />

      <h1>Em Desenvolvimento</h1>
      <p>Esta funcionalidade estará disponível em breve.</p>

      <button
        className={styles.button}
        onClick={() => navigate("/dashboard")}
      >
        Voltar ao Dashboard
      </button>
    </div>
  );
}
