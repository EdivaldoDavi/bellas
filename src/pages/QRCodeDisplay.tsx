import styles from "../css/QRCodeDisplay.module.css";
import type { EvoStatus } from "../hooks/useEvolutionConnection";
import { useUserAndTenant } from "../hooks/useUserAndTenant";

export interface QRCodeDisplayProps {
  status: EvoStatus;
  qrBase64: string | null;
  loading: boolean;
  error: string | null;
  realInstanceId: string;
  onStart: () => void;
  onLogout: () => void;
}

export default function QRCodeDisplay({
  status,
  qrBase64,
  loading,
  error,
  realInstanceId,
  onStart,
  onLogout,
}: QRCodeDisplayProps) {

  const { tenant } = useUserAndTenant();

  const isConnecting = loading || status === "OPENING";
  const isConnected = status === "CONNECTED";

  const isDisconnected =
    ["DISCONNECTED", "LOGGED_OUT", "UNKNOWN", "IDLE", "ERROR"].includes(
      status
    );

  const showQR =
    !!qrBase64 &&
    !isConnected &&
    !isConnecting &&
    status !== "ERROR" &&
    status !== "LOGGED_OUT";

  const showError =
    error &&
    status !== "IDLE" &&
    status !== "LOGGED_OUT" &&
    status !== "DISCONNECTED";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>WhatsApp · Conexão</h2>
        {realInstanceId && (
          <span className={styles.instanceId}>
            Instância: {realInstanceId}
          </span>
        )}
      </div>

      <div className={styles.statusBox}>
        <span className={styles.statusDot} data-status={status} />
        <span className={styles.statusText}>{labelFromStatus(status)}</span>
      </div>

      {showError && <div className={styles.errorBox}>❌ {error}</div>}

      {showQR && (
        <div className={styles.qrArea}>
          <img src={qrBase64 ?? undefined} className={styles.qr} alt="QR Code" />
          <p className={styles.qrHint}>Escaneie o QR Code no WhatsApp.</p>
        </div>
      )}

      {isConnecting && (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <p>Conectando…</p>
        </div>
      )}

      {isConnected && (
        <div className={styles.connectedBox}>
          <div className={styles.connectedIllustration}>
            <div className={styles.checkInside}>✓</div>
          </div>
          <p>Conectado com sucesso!</p>
        </div>
      )}

      <div className={styles.buttons}>
        {isDisconnected && (
          <button
            onClick={onStart}
            disabled={loading}
            className={styles.btnPrimary}
            style={{
              backgroundColor: tenant?.primary_color || "var(--color-primary)",
            }}
          >
            {loading ? "Gerando QR..." : "Conectar WhatsApp"}
          </button>
        )}

        {isConnected && (
          <button className={styles.btnDanger} onClick={onLogout}>
            Desconectar
          </button>
        )}
      </div>
    </div>
  );
}

function labelFromStatus(status: EvoStatus) {
  return (
    {
      IDLE: "Pronto",
      OPENING: "Conectando…",
      QRCODE: "Aguardando leitura…",
      CONNECTED: "Conectado",
      DISCONNECTED: "Desconectado",
      LOGGED_OUT: "Sessão encerrada",
      ERROR: "Erro",
      UNKNOWN: "Desconectado",
    }[status] || "Desconectado"
  );
}
