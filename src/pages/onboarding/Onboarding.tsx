import { useEffect, useState, useCallback, useMemo } from "react";
import { useUserTenant } from "../../context/UserTenantProvider";
import styles from "./Onboarding.module.css";
import { toast } from "react-toastify"; // Import toast

import StepWelcome from "./steps/StepWelcome";
import StepServices from "./steps/StepServices";
import StepSchedule from "./steps/StepSchedule";
import StepFirstCustomer from "./steps/StepFirstCustomer";
import StepFirstAppointment from "./steps/StepFirstAppointment";
import StepCongratulations from "./steps/stepCongratulations";
import OnboardingFixedNavigation from "../../components/OnboardingFixedNavigation"; // Import new navigation

const TOTAL_STEPS = 6; // Total steps including congratulations

export default function Onboarding() {
  const { tenant, updateOnboardingStep, loading: userTenantLoading } = useUserTenant();
  const step = tenant?.onboarding_step ?? 0;

  // Local states for step-specific validation
  const [hasServices, setHasServices] = useState(false);
  const [hasProfessionalSchedule, setHasProfessionalSchedule] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [hasAppointment, setHasAppointment] = useState(false);

  // Força o tema 'light' e as cores padrão para o onboarding
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    // Força as cores padrão do onboarding
    document.documentElement.style.setProperty("--color-primary", "#8343A2");
    document.documentElement.style.setProperty("--color-secondary", "#e0b6f5");
    document.documentElement.style.setProperty("--color-primary-rgb", "131, 67, 162"); // RGB para a cor padrão

    return () => {
      // Ao sair do onboarding, o tema será redefinido pelo useTheme no Layout
      // ou em outros componentes, então não precisamos reverter aqui explicitamente.
    };
  }, []);

  // Callback para atualizar o estado de validação de serviços
  const onServicesValidated = useCallback((isValid: boolean) => {
    setHasServices(isValid);
  }, []);

  // Callback para atualizar o estado de validação de agendamento do profissional
  const onScheduleValidated = useCallback((isValid: boolean) => {
    setHasProfessionalSchedule(isValid);
  }, []);

  // Callback para atualizar o estado de validação de cliente
  const onCustomerValidated = useCallback((isValid: boolean) => {
    setHasCustomer(isValid);
  }, []);

  // Callback para atualizar o estado de validação de agendamento
  const onAppointmentValidated = useCallback((isValid: boolean) => {
    setHasAppointment(isValid);
  }, []);


  const handleBack = useCallback(() => {
    if (step > 0) {
      updateOnboardingStep(step - 1);
    }
  }, [step, updateOnboardingStep]);

  const handleNext = useCallback(async () => {
    let canProceed = true;

    // Perform validation based on the current step
    switch (step) {
      case 0: // StepWelcome
        // No specific validation needed, just proceed
        break;
      case 1: // StepServices
        if (!hasServices) {
          toast.warn("Cadastre pelo menos um serviço antes de continuar.");
          canProceed = false;
        }
        break;
      case 2: // StepSchedule
        if (!hasProfessionalSchedule) {
          toast.warn("Você deve associar ao menos 1 serviço e definir horários para o profissional cadastrado.");
          canProceed = false;
        }
        break;
      case 3: // StepFirstCustomer
        if (!hasCustomer) {
          toast.warn("Cadastre pelo menos um cliente antes de continuar.");
          canProceed = false;
        }
        break;
      case 4: // StepFirstAppointment
        if (!hasAppointment) {
          toast.warn("Você precisa criar pelo menos um agendamento de teste.");
          canProceed = false;
        }
        break;
      case 5: // StepCongratulations (Final step)
        // This is the final step, the 'Finalizar' button will trigger the final update
        await updateOnboardingStep(99); // Mark onboarding as complete
        break;
      default:
        break;
    }

    if (canProceed && step < TOTAL_STEPS -1) { // Only proceed if not the final step
      updateOnboardingStep(step + 1);
    }
  }, [step, hasServices, hasProfessionalSchedule, hasCustomer, hasAppointment, updateOnboardingStep]);

  // Determine if the 'Next' button should be enabled
  const canGoNext = useMemo(() => {
    if (userTenantLoading) return false; // Disable while loading context
    switch (step) {
      case 0: return true; // Welcome step always allows next
      case 1: return hasServices;
      case 2: return hasProfessionalSchedule;
      case 3: return hasCustomer;
      case 4: return hasAppointment;
      case 5: return true; // Final step, 'Finalizar' is always enabled
      default: return false;
    }
  }, [step, hasServices, hasProfessionalSchedule, hasCustomer, hasAppointment, userTenantLoading]);


  const renderStep = () => {
    switch (step) {
      case 0: return <StepWelcome />;
      case 1: return <StepServices onServicesValidated={onServicesValidated} />;
      case 2: return <StepSchedule onScheduleValidated={onScheduleValidated} />;
      case 3: return <StepFirstCustomer onCustomerValidated={onCustomerValidated} />;
      case 4: return <StepFirstAppointment onAppointmentValidated={onAppointmentValidated} />;
      case 5: return <StepCongratulations />;
      default: return <StepWelcome />;
    }
  };

  const progress =
    step >= 99 ? 100 : Math.min(100, ((step + 1) / TOTAL_STEPS) * 100);

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ✔ A barra de progresso fica sozinha no topo */}
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

        {/* ✔ Somente o step atual é renderizado */}
        <div className={styles.body}>
          {renderStep()}
        </div>

      </div>
      {/* Fixed Navigation Bar - Conditionally render */}
      {step !== TOTAL_STEPS - 1 && ( // Only show if NOT the last step
        <OnboardingFixedNavigation
          currentStep={step}
          onBack={handleBack}
          onNext={handleNext}
          canGoNext={canGoNext}
          isLastStep={step === TOTAL_STEPS - 1}
        />
      )}
    </div>
  );
}