// src/pages/onboarding/steps/StepCongratulations.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useUserTenant } from "../../../context/UserTenantProvider";
import { useEvolutionConnection } from "../../../hooks/useEvolutionConnection";

import QRCodeDisplay from "../../QRCodeDisplay";
import confetti from "canvas-confetti";

import styles from "../Onboarding.module.css";

import {
  Trophy,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function StepCongratulations() {
  const navigate = useNavigate();
  const { tenant, updateOnboardingStep } = useUserTenant();

  const [isMobile, setIsMobile] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  /* ============================================================
     🎆 Confetti ao abrir
  ============================================================ */
  useEffect(() => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 8, spread: 65, origin: { x: 0.1 } });
      confetti({ particleCount: 8, spread: 65, origin: { x: 0.9 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, []);

  /* ============================================================
     📱 Detectar mobile real
  ============================================================ */
  useEffect(() => {
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(mobile);
  }, []);

  /* ============================================================
     🔗 Evolution API – conectar WhatsApp
  ============================================================ */
  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;
  const instanceId = tenant?.id ?? "";

  const { status, qrBase64, loading, start, refresh, logout } =
    useEvolutionConnection({
      baseUrl: evoBase,
      autostart: false,
      initialInstanceId: instanceId,
    });

  /* ============================================================
     📌 Finalizar onboarding
  ============================================================ */
  const finalize = useCallback(async () => {
    try {
      await updateOnboardingStep(99);
      navigate("/dashboard");
    } catch (err) {
      console.error("Erro ao finalizar onboarding:", err);
    }
  }, [updateOnboardingStep, navigate]);

  /* ============================================================
     JSX
  ============================================================ */
  return (
    <div className={styles.stepContainer}>

      {/* 🎉 Ícone */}
      <div className={styles.congratsWrapper}>
        <div className={styles.congratsIcon}>
          <Trophy size={62} />
        </div>
      </div>

      <h2 className={styles.stepTitle}>🎉 Seu Studio está pronto!</h2>

      <p className={styles.stepText}>
        Parabéns! O <strong>{tenant?.name}</strong> foi configurado com sucesso.
        Agora falta apenas conectar seu WhatsApp.
      </p>

      {/* ======================================================================
         📱 MOBILE – mostra o aviso premium
      ====================================================================== */}
      {isMobile && (
        <>
          <button
            className={styles.warningButton}
            onClick={() => setShowWarning(true)}
          >
            <AlertTriangle size={20} />
            <span>Aviso importante sobre WhatsApp</span>
          </button>

          {/* PREMIUM MODAL */}
          {showWarning && (
            <div className={styles.warningModalOverlay}>
              <div className={styles.warningModalPremium}>
                
                {/* Header */}
                <div className={styles.warningPremiumHeader}>
                  <div className={styles.warningPremiumIconWrapper}>
                    <AlertTriangle size={24} className={styles.warningPremiumIcon} />
                  </div>
                  <h3 className={styles.warningPremiumTitle}>
                    Aviso sobre conexão do WhatsApp
                  </h3>
                </div>

                {/* Conteúdo */}
                <div className={styles.warningPremiumContent}>
                  <p>
                    Você está acessando pelo <strong>celular</strong>.
                    Para conectar seu WhatsApp e receber agendamentos da IA 🤖,
                    será necessário usar outro aparelho para exibir o QR Code.
                  </p>

                  <p style={{ marginTop: 10 }}>
                    Assim, você escaneia o código usando o celular
                    que vai receber os agendamentos.
                  </p>

                  <p style={{ marginTop: 12 }}>✨ Pode ser qualquer um destes:</p>

                  <ul className={styles.warningList}>
                    <li>💻 Notebook ou computador</li>
                    <li>📱 Outro celular</li>
                    <li>📟 Tablet</li>
                  </ul>

                  <p style={{ marginTop: 16 }}>
                    Depois abra o menu WhatsApp → Conectar WhatsApp,
                    e faça a leitura do QR Code usando o aparelho oficial.
                  </p>
                </div>

                {/* Botão */}
                <button
                  className={styles.warningPremiumButton}
                  onClick={() => setShowWarning(false)}
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================================================================
         🖥 DESKTOP – mostra o QR Code direto
      ====================================================================== */}
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
        style={{ marginTop: "32px" }}
        onClick={finalize}
      >
        Bora trabalhar! <CheckCircle2 size={18} />
      </button>
    </div>
  );
}
