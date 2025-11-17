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

  /* ============================================================
     🔄 Atualizar visual global quando conectado
  ============================================================ */
  useEffect(() => {
    if (status === "CONNECTED") {
      document.body.classList.add("wa-connected");
    } else {
      document.body.classList.remove("wa-connected");
    }
  }, [status]);

  /* ============================================================
     🔄 Atualiza estado na montagem
  ============================================================ */
  useEffect(() => {
    refresh();
  }, [refresh]);

  /* ============================================================
     🚀 AutoStart opcional
  ============================================================ */
  useEffect(() => {
    if (autoStart && safeInstanceId) start();
  }, [autoStart, safeInstanceId, start]);

  /* ============================================================
     🔍 UI STATES
  ============================================================ */
  const isConnecting = loading || status === "OPENING";
  const isConnected = status === "CONNECTED";
  const isDisconnected =
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  const showQR = !!qrBase64 && !isConnected && !isConnecting;

  /* ============================================================
     🛑 Remover erro “Not Found” ou erros irrelevantes
  ============================================================ */
  const hideError =
    error === "Not Found" ||
    status === "DISCONNECTED" ||
    status === "UNKNOWN" ||
    status === "IDLE" ||
    status === "LOGGED_OUT";

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

        {/* ERRO (filtrado) */}
        {!hideError && error && (
          <div className={styles.errorBox}>❌ {error}</div>
        )}

        {/* QR CODE */}
        {showQR && (
          <div className={styles.qrArea}>
            <img src={qrBase64} className={styles.qr} alt="QR Code" />
            <p className={styles.qrHint}>
              Escaneie o QR Code no seu aplicativo WhatsApp.
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

        {/* BOTÕES */}
        <div className={styles.buttons}>
          {isDisconnected && (
            <>
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
                    <strong> ... três pontinhos → Dispositivos conectados</strong>.
                  </li>
                  <li>
                    Toque em <strong>“Conectar um dispositivo”</strong>.
                  </li>
                  <li>Escaneie o QR Code exibido aqui na tela.</li>
                </ol>
              </div>

              <button
                onClick={start}
                disabled={loading}
                className={styles.btnPrimary}
              >
                {loading ? "Conectando..." : "Conectar WhatsApp"}
              </button>

              <button className={styles.btnSecondary} onClick={refresh}>
                Recarregar
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
