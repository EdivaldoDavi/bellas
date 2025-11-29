import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";

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
    <div style={{ padding: "1.5rem", maxWidth: 600 }}>
      <h2>Integração WhatsApp</h2>

      <p>
        Conecte o WhatsApp para habilitar automações, confirmações e mensagens
        inteligentes via IA.
      </p>

      <div
        style={{
          background: "var(--card-bg, #fff)",
          padding: "1.5rem",
          borderRadius: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
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
          <div
            style={{
              marginTop: "0.75rem",
              opacity: 0.7,
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Conecte o WhatsApp para habilitar o controle de atendimento.
          </div>
        ) : (
          <div
            style={{
              marginTop: "0.75rem",
              opacity: 0.7,
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Associe um plano de assinatura para ativar o controle de atendimento.
          </div>
        )}
      </div>
    </div>
  );
}