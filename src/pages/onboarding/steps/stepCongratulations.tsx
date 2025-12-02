import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../Onboarding.module.css";
import { PartyPopper, Trophy, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useUserTenant } from "../../../context/UserTenantProvider";

export default function StepCongratulations() {
  const navigate = useNavigate();
const { updateOnboardingStep } = useUserTenant(); // adicionar isso no componente
  // 🎉 Efeito de confete na entrada
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 6,
        spread: 70,
        startVelocity: 40,
        origin: { x: Math.random(), y: 0 },
        colors: ["#8343A2", "#ffcc00", "#00d68f"],
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return (
    <div className={styles.stepContainer} style={{ textAlign: "center" }}>
      <div style={{ marginBottom: "10px" }}>
        <PartyPopper
          size={78}
          color="var(--color-primary)"
          style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))" }}
        />
      </div>

      <h2 className={styles.stepTitle} style={{ fontSize: "1.9rem" }}>
        🎉 Uhuuul! Você conseguiu!
      </h2>

      <p className={styles.stepText} style={{ fontSize: "1.05rem" }}>
        Seu Studio está oficialmente configurado e pronto para brilhar!
        <br />
        Serviços, horários, clientes e até um agendamento de teste — tudo no lugar!  
        Agora é só <strong>abrir as portas e começar a atender</strong> 🥳
      </p>

      <div style={{ marginTop: "18px" }}>
        <Trophy
          size={72}
          color="var(--color-primary)"
          style={{ marginBottom: "8px" }}
        />
        <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          Você desbloqueou o modo profissional! 💅✨
        </div>
      </div>

      <div className={styles.actions} style={{ marginTop: "30px" }}>
                <button
            className={styles.primaryBtn}
            style={{ fontSize: "1.05rem" }}
            onClick={async () => {
              await updateOnboardingStep(99);  // <-- FINALIZA SETUP
              navigate("/dashboard");
            }}
          >
            Ir para o painel e começar a usar →
          </button>

      </div>

      <div
        style={{
          marginTop: "20px",
          fontSize: "0.92rem",
          color: "var(--text-muted)",
        }}
      >
        <CheckCircle2
          size={20}
          color="var(--color-primary)"
          style={{ verticalAlign: "middle", marginRight: 6 }}
        />
        Dica: você pode ajustar qualquer configuração pelo menu lateral.
      </div>
    </div>
  );
}
