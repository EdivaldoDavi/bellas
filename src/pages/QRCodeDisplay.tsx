// src/components/QRCodeDisplay.tsx
import styles from "../css/QRCodeDisplay.module.css";
import type { EvoStatus } from "../hooks/useEvolutionConnection";

export interface QRCodeDisplayProps {
  instanceId: string;
  status: EvoStatus | string;
  qr?: string | null;
  loading?: boolean;
  autoStart?: boolean;
  onStart: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export default function QRCodeDisplay({
  instanceId,
  status,
  qr,
  loading = false,
  onStart,
  onRefresh,
  onLogout,
}: QRCodeDisplayProps) {
  /* ---------------- STATES ---------------- */
  const isConnecting =
    loading || status === "OPENING" || status === "INITIALIZING";

  const isConnected = status === "CONNECTED";

  const isDisconnected =
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  const showQR = !!qr && !isConnected && !isConnecting;

  /* ---------------- RENDER ---------------- */
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>WhatsApp · Conexão</h2>
          {instanceId && (
            <span className={styles.instanceId}>Instância: {instanceId}</span>
          )}
        </div>

        {/* Status visual */}
        <div className={styles.statusBox}>
          <span className={styles.statusDot} data-status={status} />
          <span className={styles.statusText}>{labelFromStatus(status)}</span>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className={styles.qrArea}>
            <img src={qr!} className={styles.qr} alt="QR Code" />
            <p className={styles.qrHint}>
              Escaneie o QR Code no seu aplicativo WhatsApp.
            </p>
          </div>
        )}

        {/* Loading */}
        {isConnecting && (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <p>Conectando…</p>
          </div>
        )}

        {/* Conectado */}
        {isConnected && (
          <div className={styles.connectedBox}>
            <div className={styles.connectedIllustration}>
              <div className={styles.checkInside}>✓</div>
            </div>
            <p>✅ Conectado com sucesso!</p>
          </div>
        )}

        {/* Botões */}
        <div className={styles.buttons}>
          {isDisconnected && (
            <>
              {/* Instruções */}
              <div className={styles.instructionsBox}>
                <p className={styles.instructionsTitle}>
                  📱 Como conectar seu WhatsApp:
                </p>
                <ol className={styles.instructionsList}>
                  <li>
                    Abra o aplicativo <strong>WhatsApp</strong> no seu celular.
                  </li>
                  <li>
                    Vá em{" "}
                    <strong>… (três pontinhos) → Dispositivos conectados</strong>.
                  </li>
                  <li>
                    Toque em <strong>“Conectar um dispositivo”</strong>.
                  </li>
                  <li>Escaneie o QR Code exibido aqui.</li>
                </ol>
              </div>

              <button
                onClick={onStart}
                disabled={loading}
                className={styles.btnPrimary}
              >
                {loading ? "Conectando..." : "Conectar WhatsApp"}
              </button>

              <button className={styles.btnSecondary} onClick={onRefresh}>
                Recarregar QR Code
              </button>
            </>
          )}

          {isConnected && (
            <button className={styles.btnDanger} onClick={onLogout}>
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STATUS LABEL ---------------- */
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
