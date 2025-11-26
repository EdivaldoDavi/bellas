import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";
import styles from "../css/ConnectWhatsApp.module.css";

export default function ConnectWhatsAppPage({
  insideSetup = false,
  onFinish,
}: {
  insideSetup?: boolean;
  onFinish?: () => void;
}) {
  const { tenant, subscription, loading } = useUserAndTenant();

  const instanceId = tenant?.id || "";
  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  if (loading) {
    return <div className={styles.loading}>Carregando informações…</div>;
  }

  if (!tenant) {
    return <div className={styles.error}>Tenant não encontrado.</div>;
  }

  const isDisconnected =
    !status ||
    ["DISCONNECTED", "LOGGED_OUT", "ERROR", "UNKNOWN", "IDLE"].includes(
      status
    );

  const canShowPause = subscription && !isDisconnected;

  return (
    <div className={styles.container}>
      {!insideSetup && (
        <>
          <h2 className={styles.title}>Integração WhatsApp</h2>
          <p className={styles.description}>
            Conecte o WhatsApp para habilitar automações, notificações e
            mensagens inteligentes via IA.
          </p>
        </>
      )}

      <div className={styles.card}>
        {/* 🔥 Agora o QRCode já tenta conectar sozinho */}
        <QRCodeDisplay
          instanceId={instanceId}
          autoStart={true}
          baseUrl={evoBase}
        />

        <div style={{ height: "1rem" }} />

        {canShowPause ? (
          <N8nPauseButton
            subscriptionId={subscription!.id}
            initialState={subscription!.n8n_pause}
          />
        ) : (
          <div className={styles.hint}>
            {subscription
              ? "Conecte o WhatsApp para ativar o controle de atendimento."
              : "Você precisa de um plano ativo para conectar o WhatsApp."}
          </div>
        )}
      </div>

      {insideSetup && (
        <button onClick={onFinish} className={styles.nextButton} style={{ backgroundColor: "var(--color-primary)" }}> {/* Use CSS variable */}
          Continuar
        </button>
      )}
    </div>
  );
}