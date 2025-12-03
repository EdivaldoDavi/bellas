// src/pages/onboarding/steps/StepWelcome.tsx
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

export default function StepWelcome() {
  const { updateOnboardingStep, refreshTenant, tenant } = useUserTenant();

  async function start() {
    if (!tenant?.id) return;

    // Avança para o step 1
    await updateOnboardingStep(1);

    // 🔥 FORÇA RECARREGAR O TENANT IMEDIATAMENTE
    await refreshTenant();
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
