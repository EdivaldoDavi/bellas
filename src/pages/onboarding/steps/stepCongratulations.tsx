import { useEffect, useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { useEvolutionConnection } from "../../../hooks/useEvolutionConnection";
import QRCodeDisplay from "../../QRCodeDisplay";
import confetti from "canvas-confetti";

import styles from "../Onboarding.module.css";

import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function StepCongratulations() {
  const { tenant } = useUserTenant();
  const [isMobile, setIsMobile] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  /* 🎊 CONFETTI */
  useEffect(() => {
    const duration = 1800;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 4, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 4, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  /* Detectar mobile real */
  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;
  const instanceId = tenant?.id || "";

  const {
    status,
    qrBase64,
    loading,
    start,
    refresh,
    logout,
  } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  return (
    <div className={styles.stepContainer}>
      <div className={styles.celebrationIcon}>
        <Trophy size={46} color="#9b59b6" />
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
        <div className={styles.mobileWarningToggle}>
          <button
            className={styles.warningButton}
            onClick={() => setShowWarning((v) => !v)}
          >
            <AlertTriangle size={20} color="#b68400" />
            <span>Aviso importante sobre o WhatsApp</span>
            {showWarning ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Card expansível */}
          {showWarning && (
            <div className={styles.warningCard}>
              <AlertTriangle size={22} color="#b68400" />
              <p>
                Você está em um <strong>celular</strong>.  
                O WhatsApp não permite escanear QR Code usando o mesmo aparelho
                que será conectado.
              </p>

              <p style={{ marginTop: "10px" }}>
                Para conectar seu WhatsApp, use:
              </p>

              <ul>
                <li>• Notebook ou Desktop</li>
                <li>• Tablet</li>
                <li>• Outro celular</li>
              </ul>

              <p style={{ marginTop: "8px" }}>
                Você também pode conectar depois pelo menu{" "}
                <strong>WhatsApp</strong> no painel.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
         🖥 DESKTOP — mostrar QR normalmente
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

      <button
        className={styles.primaryBtn}
        style={{ marginTop: "30px" }}
        onClick={() => (window.location.href = "/dashboard")}
      >
        Ir para o painel <CheckCircle2 size={18} />
      </button>
    </div>
  );
}
