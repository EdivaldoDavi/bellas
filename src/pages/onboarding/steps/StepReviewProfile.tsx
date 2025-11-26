// src/pages/onboarding/steps/StepReviewProfile.tsx
import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";

export default function StepReviewProfile() {
  const { profile, tenant, updateOnboardingStep } = useUserTenant();

  return (
    <div>
      <h2 className={styles.stepTitle}>Revise seus dados principais</h2>
      <p className={styles.stepText}>
        Esse é o seu usuário e o primeiro profissional já criado
        automaticamente. Você pode ajustar depois na página de Perfil ou
        Profissionais.
      </p>

      <ul style={{ marginTop: 12, marginBottom: 4, paddingLeft: 18, color: "var(--text)" }}> {/* Added color */}
        <li>
          <strong>Nome:</strong> {profile?.full_name || "—"}
        </li>
        <li>
          <strong>E-mail:</strong> {profile?.email || "—"}
        </li>
        <li>
          <strong>Salão:</strong> {tenant?.name || "—"}
        </li>
      </ul>

      <p className={styles.stepText}>
        Se você não for atender como profissional, poderá desativar seu cadastro
        de profissional depois, na tela de Profissionais.
      </p>

      <div className={styles.actions}>
        <button
          className={styles.primaryBtn}
          onClick={() => updateOnboardingStep(2)}
        >
          Está tudo certo, continuar
        </button>

        <button
          className={styles.secondaryBtn}
          onClick={() => updateOnboardingStep(99)}
        >
          Pular onboarding
        </button>
      </div>
    </div>
  );
}