// src/pages/onboarding/steps/StepWelcome.tsx
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

export default function StepWelcome() {
  const { updateOnboardingStep, tenant } = useUserTenant();

  console.log("🟦 StepWelcome — tenant recebido:", tenant);
  console.log("🟩 StepWelcome — tenant.id:", tenant?.id);
  console.log("🟧 StepWelcome — onboarding_step atual:", tenant?.onboarding_step);

  async function start() {
    console.log("▶️ Clicou em Bora Começar!!!");

    if (!tenant?.id) {
      console.log("❌ ERRO: tenant.id está indefinido.");
      return;
    }

    console.log("🔼 Atualizando onboarding_step para 1...");

    await updateOnboardingStep(1);

    console.log("✅ updateOnboardingStep(1) chamado com sucesso!");
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
