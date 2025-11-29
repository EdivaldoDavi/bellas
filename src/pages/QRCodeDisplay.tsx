import { useMemo } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import type { EvoStatus } from "../hooks/useEvolutionConnection";
import styles from "../css/QRCodeDisplay.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export interface QRCodeDisplayProps {
  instanceId: string;
  baseUrl?: string;
}

export default function QRCodeDisplay({
  instanceId,
  baseUrl = "/api",
}: QRCodeDisplayProps) {
  const safeInstanceId = useMemo(() => instanceId.trim(), [instanceId]);

  const {
    status,
    qrBase64,
    error,
    loading,
    start,
    logout,
    realInstanceId,
  } = useEvolutionConnection({
    baseUrl,
    autostart: false, // sempre desligado
    initialInstanceId: safeInstanceId,
  });

  const { tenant } = useUserAndTenant();

  /* ============================================================
     🔍 UI STATES
  ============================================================ */
  const isConnecting = loading || status === "OPENING";
  const isConnected = status === "CONNECTED";

  const isDisconnected =
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  const showQR = Boolean(
    qrBase64 &&
      !isConnected &&
      !isConnecting &&
      status !== "ERROR" &&
      status !== "LOGGED_OUT"
  );

  const showError =
    error &&
    status !== "LOGGED_OUT" &&
    status !== "IDLE" &&
    status !== "DISCONNECTED";

  /* ============================================================
     🔽 RENDER
  ============================================================ */
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* CABEÇALHO */}
        <div className={styles.header}>
          <h2 className={styles.title}>WhatsApp · Conexão</h2>

          {realInstanceId && (
            <span className={styles.instanceId}>
              Instância: {realInstanceId}
            </span>
          )}
        </div>

        {/* STATUS */}
        <div className={styles.statusBox}>
          <span className={styles.statusDot} data-status={status} />
          <span className={styles.statusText}>{labelFromStatus(status)}</span>
        </div>

        {/* ERRO */}
        {showError && <div className={styles.errorBox}>❌ {error}</div>}

        {/* QR CODE */}
        {showQR && (
          <div className={styles.qrArea}>
           <img src={qrBase64 ?? undefined} className={styles.qr} alt="QR Code" />

            <p className={styles.qrHint}>
              Escaneie o QR Code no aplicativo WhatsApp.
            </p>
          </div>
        )}

        {/* LOADING */}
        {isConnecting && (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <p>Conectando…</p>
          </div>
        )}

        {/* CONECTADO */}
        {isConnected && (
          <div className={styles.connectedBox}>
            <div className={styles.connectedIllustration}>
              <div className={styles.checkInside}>✓</div>
            </div>
            <p>✅ Conectado com sucesso!</p>
          </div>
        )}

        {/* INSTRUÇÕES + BOTÕES */}
        <div className={styles.buttons}>
          {isDisconnected && (
            <>
              <div className={styles.instructionsBox}>
                <p className={styles.instructionsTitle}>
                  📱 Como conectar seu WhatsApp:
                </p>

                <ol className={styles.instructionsList}>
                  <li>Abra o app <strong>WhatsApp</strong> no celular.</li>
                  <li>Toque em <strong>Dispositivos conectados</strong>.</li>
                  <li>
                    Toque em <strong>“Conectar um dispositivo”</strong>.
                  </li>
                  <li>Escaneie o QR Code exibido nesta tela.</li>
                </ol>
              </div>

              {/* BOTÃO MANUAL */}
              <button
                onClick={() => start()}
                disabled={loading}
                className={styles.btnPrimary}
                style={{
                  backgroundColor: tenant?.primary_color || "var(--color-primary)",
                }}
              >
                {loading ? "Gerando QR..." : "Gerar novo QR Code"}
              </button>
            </>
          )}

          {isConnected && (
            <button className={styles.btnDanger} onClick={logout}>
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ↪ LABEL DO STATUS
============================================================ */
function labelFromStatus(s: EvoStatus | string) {
  const up = (s || "UNKNOWN").toUpperCase();

  switch (up) {
    case "IDLE":
      return "Pronto";
    case "OPENING":
      return "Conectando…";
    case "QRCODE":
      return "Aguardando leitura…";
    case "CONNECTED":
      return "Conectado";
    case "DISCONNECTED":
      return "Desconectado";
    case "LOGGED_OUT":
      return "Sessão encerrada";
    case "ERROR":
      return "Erro";
    default:
      return "Desconectado";
  }
}
