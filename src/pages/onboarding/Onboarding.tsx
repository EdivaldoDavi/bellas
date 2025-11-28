// src/pages/onboarding/Onboarding.tsx
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";

import StepWelcome from "./steps/StepWelcome";
import StepReviewProfile from "./steps/StepReviewProfile";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepFinish from "./steps/StepFinish";

const TOTAL_STEPS = 6; // sem contar o finish

export default function Onboarding() {
  const { tenant } = useUserTenant();

  const step = tenant?.onboarding_step ?? 0;

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepWelcome />;
      case 1:
        return <StepReviewProfile />;
      case 2:
        return <StepServices />;
      case 3:
        return <StepSchedule />;
      case 4:
        return <StepFirstCustomer />;
      case 5:
        return <StepFirstAppointment />;
      case 99:
        return <StepFinish />;
      default:
        return <StepWelcome />;
    }
  };

  const progress =
    step >= 99 ? 100 : Math.min(100, ((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Configuração inicial</h1>
            <p className={styles.subtitle}>
              Vamos deixar seu Studio pronto para começar a receber agendamentos.
            </p>
          </div>

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
