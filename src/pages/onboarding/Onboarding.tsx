import { useEffect, useState, useCallback, useMemo } from "react";
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";
import { toast } from "react-toastify";

import StepWelcome from "./steps/StepWelcome";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepCongratulations from "./steps/stepCongratulations";

import OnboardingFixedNavigation from "../../components/OnboardingFixedNavigation";

const TOTAL_STEPS = 6; // 0..5

export default function Onboarding() {
  const { tenant, updateOnboardingStep, loading: tenantLoading } = useUserTenant();
  const step = tenant?.onboarding_step ?? 0;

  // ADDED: estado local de passo para navegação suave
  const [uiStep, setUiStep] = useState(step);

  useEffect(() => {
    // Sincroniza quando o tenant muda (ex.: recarregado pelo contexto)
    setUiStep(step);
  }, [step]);

  /** ============================
   * VALIDATION FLAGS
  ============================ */
  const [hasServices, setHasServices] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [hasAppointment, setHasAppointment] = useState(false);

  /** ============================
   * FORÇAR LIGHT MODE
  ============================ */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.setProperty("--color-primary", "#8343A2");
    document.documentElement.style.setProperty("--color-secondary", "#E0B6F5");
  }, []);

  /** ============================
   * CALLBACKS TIPADOS
  ============================ */
  type ValidatorFn = (valid: boolean) => void;

  const onServicesValidated: ValidatorFn = useCallback((v) => setHasServices(v), []);
  const onScheduleValidated: ValidatorFn = useCallback((v) => setHasSchedule(v), []);
  const onCustomerValidated: ValidatorFn = useCallback((v) => setHasCustomer(v), []);
  const onAppointmentValidated: ValidatorFn = useCallback((v) => setHasAppointment(v), []);

  /** ============================
   * NAVEGAÇÃO ENTRE STEPS
  ============================ */
  const handleBack = useCallback(() => {
    if (uiStep > 0) {
      setUiStep((s) => s - 1); // navega instantâneo
      updateOnboardingStep(uiStep - 1); // persiste em background
    }
  }, [uiStep, updateOnboardingStep]);

  const handleNext = useCallback(async () => {
    let ok = true;

    switch (uiStep) {
      case 1:
        if (!hasServices) {
          toast.warn("Cadastre pelo menos um serviço antes de continuar.");
          ok = false;
        }
        break;

      case 2:
        if (!hasSchedule) {
          toast.warn("Associe pelo menos um serviço e defina horários.");
          ok = false;
        }
        break;

      case 3:
        if (!hasCustomer) {
          toast.warn("Cadastre pelo menos um cliente.");
          ok = false;
        }
        break;

      case 4:
        if (!hasAppointment) {
          toast.warn("Crie pelo menos um agendamento de teste.");
          ok = false;
        }
        break;

      case 5:
        await updateOnboardingStep(99);
        return;
    }

    if (ok && uiStep < TOTAL_STEPS - 1) {
      setUiStep((s) => s + 1);       // navega instantâneo
      updateOnboardingStep(uiStep + 1); // persiste em background
    }
  }, [
    uiStep,
    hasServices,
    hasSchedule,
    hasCustomer,
    hasAppointment,
    updateOnboardingStep,
  ]);

  /** ============================
   * HABILITAR BOTÃO NEXT?
  ============================ */
  const canGoNext = useMemo(() => {
    if (tenantLoading) return false;

    switch (uiStep) {
      case 0:
      case 5:
        return true;

      case 1:
        return hasServices;

      case 2:
        return hasSchedule;

      case 3:
        return hasCustomer;

      case 4:
        return hasAppointment;

      default:
        return false;
    }
  }, [
    uiStep,
    hasServices,
    hasSchedule,
    hasCustomer,
    hasAppointment,
    tenantLoading,
  ]);

  /** ============================
   * RENDER DE CADA STEP
  ============================ */
  const renderStep = () => {
    switch (uiStep) {
      case 0:
        return <StepWelcome />;
      case 1:
        return <StepServices onServicesValidated={onServicesValidated} />;
      case 2:
        return <StepSchedule onScheduleValidated={onScheduleValidated} />;
      case 3:
        return <StepFirstCustomer onCustomerValidated={onCustomerValidated} />;
      case 4:
        return <StepFirstAppointment onAppointmentValidated={onAppointmentValidated} />;
      case 5:
        return <StepCongratulations />;
      default:
        return <StepWelcome />;
    }
  };

  /** ============================
   * PROGRESSO
  ============================ */
  const progress = Math.min(100, ((uiStep + 1) / TOTAL_STEPS) * 100);

  /** ============================
   * LAYOUT
  ============================ */
  return (
    <div className={styles.page}>
      {/* Progresso */}
      <div className={styles.progressWrapper}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressText}>{Math.round(progress)}% concluído</span>
      </div>

      {/* Wrapper animado */}
      <div key={uiStep} className={`${styles.stepWrapper} ${styles.stepTransition}`}>
        {renderStep()}
      </div>

      {/* Navigation */}
      {uiStep > 0 && uiStep < TOTAL_STEPS - 1 && (
        <OnboardingFixedNavigation
          currentStep={uiStep}
          onBack={handleBack}
          onNext={handleNext}
          canGoNext={canGoNext}
          isLastStep={false}
        />
      )}
    </div>
  );
}