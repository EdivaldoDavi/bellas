// src/pages/onboarding/steps/StepFinish.tsx
import { useNavigate } from "react-router-dom";
import styles from "../Onboarding.module.css";

export default function StepFinish() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className={styles.stepTitle}>🎉 Tudo pronto!</h2>
      <p className={styles.stepText}>
        Seu salão já está configurado com o básico para começar a atender. Você
        pode continuar ajustando serviços, horários, profissionais e clientes a
        qualquer momento pelo menu lateral.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate("/dashboard")}
        >
          Ir para o painel
        </button>
      </div>
    </div>
  );
}
