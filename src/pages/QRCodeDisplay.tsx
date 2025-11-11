import { useEffect, useMemo } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import type { EvoStatus } from "../hooks/useEvolutionConnection";
import styles from "../css/QRCodeDisplay.module.css";

export interface QRCodeDisplayProps {
  instanceId: string;
  autoStart?: boolean;
  baseUrl?: string;
}

export default function QRCodeDisplay({
  instanceId,
  autoStart = false,
  baseUrl = "/api",
}: QRCodeDisplayProps) {

  const safeInstanceId = useMemo(() => instanceId.trim(), [instanceId]);

  const {
    status,
    qrBase64,
    error,
    loading,
    start,
    refresh,
    logout,
    realInstanceId,
  } = useEvolutionConnection({
    baseUrl,
    autostart: false,
    initialInstanceId: safeInstanceId,
  });

  // ✅ Refresh apenas 1 vez ao montar
  useEffect(() => {
    refresh();
  }, []);

  // ✅ AutoStart opcional (somente quando usuário ativou)
  useEffect(() => {
    if (autoStart && safeInstanceId) {
      start();
    }
  }, [autoStart, safeInstanceId, start]);

useEffect(() => {
  console.log("🔄 STATUS RECEBIDO DO HOOK:", status);

  if (status === "CONNECTED") {
    document.body.classList.add("wa-connected");
  } else {
    document.body.classList.remove("wa-connected");
  }
}, [status, safeInstanceId]);


  /* ---------- Estados de UI ---------- */
  const isConnecting = loading || status === "OPENING";
  const isConnected = status === "CONNECTED";
  const showQR = !!qrBase64 && !isConnected;

  return (
    <div className={styles.container}>
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

        {error && <div className={styles.errorBox}>❌ {error}</div>}

        {showQR && (
          <div className={styles.qrArea}>
            <img src={qrBase64} className={styles.qr} alt="QR Code" />
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
            <p>✅ Conectado com sucesso!</p>
          </div>
        )}

        <div className={styles.buttons}>
          {!isConnected && (
            <button
              className={styles.btnPrimary}
              disabled={isConnecting}
              onClick={start}
            >
              {isConnecting ? "Conectando..." : "Conectar"}
            </button>
          )}

          {!isConnected && (
            <button className={styles.btnSecondary} onClick={refresh}>
              Recarregar
            </button>
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

function labelFromStatus(s: EvoStatus | string) {
  const up = (s || "UNKNOWN").toUpperCase();
  switch (up) {
    case "IDLE": return "Pronto";
    case "OPENING": return "Conectando…";
    case "QRCODE": return "Aguardando leitura…";
    case "CONNECTED": return "Conectado";
    case "DISCONNECTED": return "Desconectado";
    case "LOGGED_OUT": return "Sessão encerrada";
    case "ERROR": return "Erro";
    default: return "Desconectado";
  }
}
