// src/pages/onboarding/Onboarding.tsx
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";

import StepWelcome from "./steps/StepWelcome";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepCongratulations from "./steps/stepCongratulations";

const TOTAL_STEPS = 6;

export default function Onboarding() {
  const { tenant } = useUserTenant();
  const step = tenant?.onboarding_step ?? 0;

  console.log("🔷 Renderizando Onboarding — step:", step);

  const renderStep = () => {
    switch (step) {
      case 0:  return <StepWelcome />;
      case 1:  return <StepServices />;
      case 2:  return <StepSchedule />;
      case 3:  return <StepFirstCustomer />;
      case 4:  return <StepFirstAppointment />;
      case 5:  return <StepCongratulations />;
      default: return <StepWelcome />;
    }
  };

  const progress =
    step >= 99 ? 100 : Math.min(100, ((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Só a barra de progresso fica aqui */}
        <div className={styles.progressWrapper}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {Math.round(progress)}% concluído
          </span>
        </div>

        <div className={styles.body}>
          {renderStep()}
        </div>

      </div>
    </div>
  );
}
