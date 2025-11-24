
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";
import styles from "../css/ConnectWhatsApp.module.css"; // Importar o novo CSS

export default function ConnectWhatsAppPage() {
  const { tenant, subscription, loading } = useUserAndTenant();

  // 🔥 Sempre chamar hooks, mesmo que tenant não exista!
  const instanceId = tenant?.id || ""; // safe
  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId, // safe
  });

  // 🔥 Sempre chamar hooks ACIMA de qualquer return condicional

  if (loading)
    return <div style={{ padding: "2rem" }}>Carregando informações…</div>;

  if (!tenant)
    return <div style={{ padding: "2rem" }}>❌ Tenant não encontrado.</div>;

  const isWhatsDisconnected =
    !status ||
    status === "DISCONNECTED" ||
    status === "LOGGED_OUT" ||
    status === "ERROR" ||
    status === "UNKNOWN" ||
    status === "IDLE";

  const shouldShowPauseButton = !!subscription && !isWhatsDisconnected;

  return (
    <div className={styles.container}> {/* Usar a classe do novo CSS */}
      <h2 className={styles.title}>Integração WhatsApp</h2>

      <p className={styles.description}>
        Conecte o WhatsApp para habilitar automações, confirmações e mensagens
        inteligentes via IA.
      </p>

      <div className={styles.card}> {/* Usar a classe do novo CSS */}
        {/* 🔵 QRCode SEMPRE aparece */}
        <QRCodeDisplay
          instanceId={instanceId}
          autoStart={false}
          baseUrl={evoBase}
        />

        <div style={{ height: "1rem" }} />

        {/* 🔵 Botão só aparece quando estiver conectado */}
        {shouldShowPauseButton ? (
          <N8nPauseButton
            subscriptionId={subscription!.id}
            initialState={subscription!.n8n_pause}
          />
        ) : subscription ? (
          <div className={styles.hint}> {/* Usar a classe do novo CSS */}
            Conecte o WhatsApp para habilitar o controle de atendimento.
          </div>
        ) : (
          <div className={styles.hint}> {/* Usar a classe do novo CSS */}
            Associe um plano de assinatura para ativar o controle de atendimento.
          </div>
        )}
      </div>
    </div>
  );
}
