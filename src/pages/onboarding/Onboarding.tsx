// src/pages/onboarding/Onboarding.tsx
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";

import StepWelcome from "./steps/StepWelcome";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepFinish from "./steps/StepFinish";

const TOTAL_STEPS = 5; // Agora sem o StepReviewProfile

export default function Onboarding() {
  const { tenant, updateOnboardingStep } = useUserTenant();

  const step = tenant?.onboarding_step ?? 0;

  /* ============================================================
     🔙 Botão VOLTAR (aparece apenas se step > 0 e step < 99)
  ============================================================ */
  const handleBack = async () => {
    if (step > 0 && step < 99) {
      await updateOnboardingStep(step - 1);
    }
  };

  /* ============================================================
     RENDERIZAÇÃO DOS STEPS
  ============================================================ */
  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepWelcome />;
      case 1:
        return <StepServices />;
      case 2:
        return <StepSchedule />;
      case 3:
        return <StepFirstCustomer />;
      case 4:
        return <StepFirstAppointment />;
      case 99:
        return <StepFinish />;
      default:
        return <StepWelcome />;
    }
  };

  /* ============================================================
     PROGRESSO
  ============================================================ */
  const progress =
    step >= 99 ? 100 : Math.min(100, ((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Vamos preparar Tudo!</h1>
            <p className={styles.subtitle}>
              Vamos deixar seu Studio pronto para começar a receber agendamentos.
            </p>
          </div>

          {/* PROGRESSO */}
          <div className={styles.progressWrapper}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {step >= 99 ? "100%" : `${Math.round(progress)}%`} concluído
            </span>
          </div>
        </header>

      

        <div className={styles.body}>{renderStep()}</div>
      </div>
    </div>
  );
}
