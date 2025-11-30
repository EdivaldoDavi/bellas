import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";

export default function ConnectWhatsAppPage() {
  const { tenant, subscription, loading } = useUserAndTenant();

  // 📌 Garantir chamada dos hooks
  const instanceId = tenant?.id || "";
  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;

  // 🚀 UMA ÚNICA conexão Evolution controlando tudo
  const {
    status,
    qrBase64,
    loading: evoLoading,
    start,
    refresh,
    logout,
  } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  // 🔥 Hooks sempre acima dos returns condicionais
  if (loading)
    return <div style={{ padding: "2rem" }}>Carregando informações…</div>;

  if (!tenant)
    return <div style={{ padding: "2rem" }}>❌ Tenant não encontrado.</div>;

  // 🚦 Estados reais de conexão
  const isWhatsConnected = status === "CONNECTED";

  // 🔵 Mostrar botão Pause somente se houver assinatura + conexão ativa
  const shouldShowPauseButton = !!subscription && isWhatsConnected;

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
        {/* 🔵 QRCode agora recebe status e handlers do HOOK ÚNICO */}
        <QRCodeDisplay
          instanceId={instanceId}
          status={status}
          qr={qrBase64}
          loading={evoLoading}
          autoStart={false}
          onStart={start}
          onRefresh={refresh}
          onLogout={logout}
        />

        <div style={{ height: "1rem" }} />

        {/* 🔵 Botão Pausar/Retomar Atendimento */}
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
