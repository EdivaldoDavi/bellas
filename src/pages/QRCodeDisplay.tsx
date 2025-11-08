import { useEffect, useMemo } from "react";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import type { EvoStatus } from "../hooks/useEvolutionConnection";
import styles from "../css/QRCodeDisplay.module.css";

export interface QRCodeDisplayProps {
  instanceId: string;
  autoStart?: boolean;   // agora só conecta se for TRUE e explicitamente permitido
  baseUrl?: string;
}

export default function QRCodeDisplay({
  instanceId,
  autoStart = false,     // 🔥 padrão alterado: NUNCA conecta sozinho
  baseUrl = "/api",
}: QRCodeDisplayProps) {
  
  const safeInstanceId = useMemo(
    () => (instanceId || "").trim(),
    [instanceId]
  );

  const {
    status,
    qrBase64,
    error,
    loading,
    start,
    logout,
  } = useEvolutionConnection({
    baseUrl,
    autostart: false,          // 🔥 hook nunca inicia sozinho
    initialInstanceId: safeInstanceId,
  });

  /* LOGS para debug */
  useEffect(() => console.log("📡 STATUS:", status), [status]);
useEffect(() => { qrBase64 && console.log("🟢 QR:", qrBase64.slice(0, 32)); }, [qrBase64]);
useEffect(() => { error && console.error("❌ ERRO:", error); }, [error]);

  /* 🔥 autoStart SOMENTE se permitido explicitamente */
  useEffect(() => {
    if (autoStart && safeInstanceId) {
      start();                  // somente aqui, e somente se autoStart = TRUE
    }
  }, [autoStart, safeInstanceId, start]);

  const isTrying = loading || status === "OPENING";
  const isConnected =
    status === "CONNECTED" ||
    status === "OPEN" ||
    status === "AUTHENTICATED";

  const showQR = !!qrBase64 && !isConnected;

  return (
    <div className={styles.wrapper}>
      
      {/* STATUS */}
      <div className={styles.statusRow}>
        <span className={styles.dot} data-status={status} />
        <span className={styles.statusText}>{labelFromStatus(status)}</span>
      </div>

      {/* ERRO */}
      {error && (
        <div className={styles.errorBox}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {/* BOTÕES */}
      <div className={styles.actions}>
        {!isConnected && (
          <button
            className={styles.btnConnect}
            onClick={() => start()}
            disabled={isTrying || !safeInstanceId}
          >
            {isTrying ? "Conectando..." : "Conectar WhatsApp"}
          </button>
        )}

        {isConnected && (
          <button className={styles.btnDisconnect} onClick={logout}>
            Desconectar
          </button>
        )}

        {!isConnected && !isTrying && (
          <button
            className={styles.btnSecondary}
            onClick={() => start()}
          >
            Forçar verificação
          </button>
        )}
      </div>

      {/* QR CODE */}
      {showQR && (
        <section className={styles.qrSection}>
          <img
            src={
              qrBase64.startsWith("data:image/")
                ? qrBase64
                : `data:image/png;base64,${qrBase64}`
            }
            alt="QR Code do WhatsApp"
            className={styles.qr}
          />

          <ol className={styles.steps}>
            <li>Abra o WhatsApp.</li>
            <li>Menu → Dispositivos conectados → Conectar.</li>
            <li>Escaneie o QR acima.</li>
          </ol>

          <button
            className={styles.btnReload}
            onClick={() => start()}
            disabled={isTrying}
          >
            Recarregar QR
          </button>
        </section>
      )}

      {/* CONECTADO */}
      {isConnected && (
        <section className={styles.connectedBox}>
          ✅ Conectado com sucesso!
        </section>
      )}
    </div>
  );
}

/* LABELS AMIGÁVEIS */
function labelFromStatus(s: EvoStatus | string) {
  const up = (s || "UNKNOWN").toUpperCase();

  switch (up) {
    case "IDLE": return "Pronto";
    case "OPENING": return "Conectando…";
    case "QRCODE": return "Aguardando leitura do QR";
    case "CONNECTED":
    case "OPEN":
    case "AUTHENTICATED":
      return "Conectado";
    case "DISCONNECTED": return "Desconectado";
    case "LOGGED_OUT": return "Sessão encerrada";
    case "ERROR": return "Erro";
    default: return "Desconhecido";
  }
}
