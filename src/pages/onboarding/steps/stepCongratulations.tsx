import { useEffect, useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { useEvolutionConnection } from "../../../hooks/useEvolutionConnection";
import QRCodeDisplay from "../../QRCodeDisplay";
import confetti from "canvas-confetti";

import styles from "../Onboarding.module.css";
import { useNavigate } from "react-router-dom";

import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export default function StepCongratulations() {
  const { tenant } = useUserTenant();
  const [isMobile, setIsMobile] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
const navigate = useNavigate();
const { updateOnboardingStep } = useUserTenant(); // <-- se ainda não estiver importado
  /* 🎊 Confetti */
  useEffect(() => {
    const duration = 1800;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 5, spread: 70, origin: { x: 0.1 } });
      confetti({ particleCount: 5, spread: 70, origin: { x: 0.9 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  /* Detectar mobile real */
  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;
  const instanceId = tenant?.id || "";

  const { status, qrBase64, loading, start, refresh, logout } =
    useEvolutionConnection({
      baseUrl: evoBase,
      autostart: false,
      initialInstanceId: instanceId,
    });

  return (
    <div className={styles.stepContainer}>
      {/* Ícone de celebração */}
      <div className={styles.congratsWrapper}>
        <div className={styles.congratsIcon}>
          <Trophy size={62} />
        </div>
      </div>

      <h2 className={styles.stepTitle}>🎉 Parabéns, seu Studio está pronto!</h2>

      <p className={styles.stepText}>
        Você concluiu a configuração do <strong>{tenant?.name}</strong>!
        Agora é só conectar o WhatsApp e começar seus atendimentos.
      </p>

      {/* ======================================================
         📱 MOBILE — botão para mostrar aviso
      ====================================================== */}
{isMobile && (
  <>
    <button
      className={styles.warningButton}
      onClick={() => setShowWarning(true)}
    >
      <AlertTriangle size={20} color="#b68400" />
      <span>Aviso importante sobre WhatsApp</span>
      <ChevronRight size={18} />
    </button>

    {/* Modal - sempre centralizado */}
    {showWarning && (
      <div className={styles.warningModalOverlay}>
        <div className={styles.warningModal}> {/* REMOVIDO: .warningModalWrapper */}

          {/* === INÍCIO DO CONTEÚDO REFATORADO === */}
          
          <div className={styles.warningHeader}>
            <AlertTriangle size={28} color="#b68400" />
            
            {/* Título mais amigável */}
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-color, #fff)' }}>
                Atenção: Você está no celular! 📱
            </h3>
          </div>

          <p className={styles.warningText}>
            Notamos que você está acessando por um celular.
          </p>
          
          {/* Explicação clara e focada na ação */}
          <p className={styles.warningText}>
            Para escanear o QR Code e conectar seu WhatsApp, você **precisará de um segundo aparelho**. É fisicamente impossível usar o mesmo celular para exibir e ler o código simultaneamente. 😉
          </p>

          <p style={{ marginTop: 10, fontWeight: 500 }} className={styles.warningInstruction}>
            Para seguir com a conexão, utilize:
          </p>

          <ul className={styles.warningList}>
            <li>Notebook ou Desktop</li>
            <li>Tablet</li>
            <li>Outro celular</li>
          </ul>

          <p style={{ marginTop: 12, fontSize: '0.9rem' }} className={styles.warningFooter}>
            *Quando estiver de posse de um dos dispositivos acima, acesse o sistema faça o login e vá para a opção Whattsapp do aplicativo para fazer a conexão.😉
          </p>

          <button
            className={styles.closeWarningButton}
            onClick={() => setShowWarning(false)}
          >
            Entendi
          </button>
          
          {/* === FIM DO CONTEÚDO REFATORADO === */}

        </div>
      </div>
    )}
  </>
)}
      {/* ======================================================
         🖥 DESKTOP — QR CODE
      ====================================================== */}
      {!isMobile && (
        <div style={{ marginTop: "25px" }}>
          <QRCodeDisplay
            instanceId={instanceId}
            status={status}
            qr={qrBase64}
            loading={loading}
            autoStart={false}
            onStart={start}
            onRefresh={refresh}
            onLogout={logout}
          />
        </div>
      )}

      {/* Botão final */}
     <button
        className={styles.primaryBtn}
        style={{ marginTop: "30px" }}
        onClick={async () => {
          try {
            await updateOnboardingStep(99); // Marca como concluído
            navigate("/dashboard");        // Redireciona
          } catch (err) {
            console.error("Erro ao finalizar onboarding:", err);
          }
        }}
      >
        Bora começar! <CheckCircle2 size={18} />
      </button>

    </div>
  );
}