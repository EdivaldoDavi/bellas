import { useUserTenant } from "../../../context/UserTenantProvider";
import styles from "../Onboarding.module.css";
import { CheckCircle } from "lucide-react"; // Ícone elegante

export default function StepCongratulations() {
  const { updateOnboardingStep } = useUserTenant();

  function finish() {
    // Finaliza onboarding e libera o sistema
    updateOnboardingStep(999);
  }

  return (
    <div className={styles.stepContainer}>
      <div className={styles.congratsWrapper}>
        <CheckCircle className={styles.congratsIcon} />

        <h2 className={styles.stepTitle}>🎉 Parabéns!</h2>

        <p className={styles.stepText}>
          Você concluiu toda a configuração inicial do seu Studio!
        </p>

        <p className={styles.stepText}>
          Agora você já pode começar a usar o <strong>Meu Pedido Favorito</strong>
          para gerenciar seus clientes, agendamentos e muito mais.
        </p>

        <div className={styles.congratsCard}>
          <p>
            ✨ Seu sistema está prontinho e funcionando!
            <br />
            Aproveite para explorar os recursos e personalizar sua experiência.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={finish}>
            Ir para o Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
