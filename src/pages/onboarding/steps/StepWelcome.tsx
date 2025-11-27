// src/pages/onboarding/steps/StepWelcome.tsx
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

export default function StepWelcome() {
  const { updateOnboardingStep, tenant } = useUserTenant();

  return (
    <div>
      <h2 className={styles.stepTitle}>
        👋 Olá, {tenant?.name || "bem-vindo(a)"}!
      </h2>
      <p className={styles.stepText}>
        Vamos configurar o essencial para você começar a usar o sistema
        tranquilamente: serviços, horários e um primeiro agendamento.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => updateOnboardingStep(1)}
        >
          Começar configuração
        </button>
{/*
        <button
          className={styles.secondaryBtn}
          onClick={() => updateOnboardingStep(99)}
        >
          Pular por enquanto
        </button>
        */}
      </div>
{/*
      <button
        className={styles.skipBtn}
        onClick={() => updateOnboardingStep(99)}
      >
        Quero explorar sozinho agora
      </button>
      */}
    </div>
  );
}