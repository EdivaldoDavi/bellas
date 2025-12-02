// src/pages/onboarding/steps/StepWelcome.tsx
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

export default function StepWelcome() {
  const { updateOnboardingStep, tenant } = useUserTenant();

  function start() {
    updateOnboardingStep(1); // ← isso agora vai funcionar
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>
        👋 Olá, {tenant?.name || "bem-vindo(a)"}!
      </h2>

      <p className={styles.stepText}>
        Vamos deixar tudo preparado para você começar a usar seu Studio com facilidade!
      </p>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={start}>
          Bora Começar!!!
        </button>
      </div>
    </div>
  );
}
