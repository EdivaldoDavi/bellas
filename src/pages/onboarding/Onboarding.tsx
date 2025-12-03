// src/pages/onboarding/Onboarding.tsx
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";

import StepWelcome from "./steps/StepWelcome";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepCongratulations from "./steps/stepCongratulations";

// ✔ CORRETO: 6 steps (0..5)
const TOTAL_STEPS = 6;

export default function Onboarding() {
  const { tenant } = useUserTenant();

  // ---------- LOG 1: Tenant recebido ----------
  console.log("🟦 ONBOARDING — tenant recebido:", tenant);

  const step = tenant?.onboarding_step ?? 0;

  // ---------- LOG 2: Step interpretado ----------
  console.log("🟩 ONBOARDING — step atual:", step);

  const renderStep = () => {
    console.log("🟨 renderStep() chamado, step =", step);

    switch (step) {
      case 0:
        console.log("➡️ Renderizando StepWelcome");
        return <StepWelcome />;

      case 1:
        console.log("➡️ Renderizando StepServices");
        return <StepServices />;

      case 2:
        console.log("➡️ Renderizando StepSchedule");
        return <StepSchedule />;

      case 3:
        console.log("➡️ Renderizando StepFirstCustomer");
        return <StepFirstCustomer />;

      case 4:
        console.log("➡️ Renderizando StepFirstAppointment");
        return <StepFirstAppointment />;

      case 5:
        console.log("🎉 Renderizando StepCongratulations!");
        return <StepCongratulations />;

      default:
        console.log("⚠️ Step inesperado, renderizando StepWelcome");
        return <StepWelcome />;
    }
  };

  const progress =
    step >= 99 ? 100 : Math.min(100, ((step + 1) / TOTAL_STEPS) * 100);

  // ---------- LOG 3: Progresso ----------
  console.log(
    `📊 Progresso calculado: step=${step}, progress=${progress}%`
  );

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
