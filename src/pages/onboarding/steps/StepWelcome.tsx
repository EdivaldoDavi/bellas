// src/pages/onboarding/steps/StepWelcome.tsx
import { useEffect } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import LoadingSpinner from "../../../components/LoadingSpinner"; // Importar o LoadingSpinner

export default function StepWelcome() {
  const { updateOnboardingStep, tenant, loading, profile } = useUserTenant(); // Adicionado 'profile'

  useEffect(() => {
    console.log("StepWelcome useEffect: tenant=", tenant, "profile=", profile, "loading=", loading);
  }, [tenant, profile, loading]);

  async function start() {
    if (!tenant?.id) {
      // Esta condição deve ser evitada pelo botão desabilitado, mas é um fallback seguro.
      console.warn("Tenant ID não disponível ao clicar em 'Bora Começar'.");
      return;
    }
    // Avança para o step 1
    await updateOnboardingStep(1);
  }

  // Exibe um spinner enquanto os dados do tenant estão sendo carregados
  if (loading) {
    return <LoadingSpinner message="Carregando informações do Studio..." />;
  }

  // Se não houver tenant após o carregamento, pode ser um erro ou um estado inesperado.
  // Neste caso, o SetupRedirectGuards deveria ter redirecionado, mas como fallback:
  if (!tenant) {
    return (
      <div className={styles.stepContainer}>
        <h2 className={styles.stepTitle}>Erro ao carregar Studio</h2>
        <p className={styles.stepText}>
          Não foi possível carregar as informações do seu Studio. Por favor, tente novamente.
        </p>
        {/* Poderia adicionar um botão para tentar novamente ou voltar ao setup */}
      </div>
    );
  }

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>
        👋 Olá, {tenant.name || "bem-vindo(a)"}!
      </h2>

      <p className={styles.stepText}>
        Vamos deixar tudo preparado para você começar a usar seu Studio com facilidade!
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={start}
          disabled={loading || !tenant.id} // Desabilita se estiver carregando ou sem tenant.id
        >
          Bora Começar!!!
        </button>
      </div>
    </div>
  );
}