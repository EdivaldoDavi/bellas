import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";
import styles from "../css/ConnectWhatsApp.module.css"; // Importar o CSS

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
console.log("STATUS REAL DO WHATSAPP:", status);

  // 🔥 Hooks sempre acima dos returns condicionais
  if (loading)
    return <div style={{ padding: "2rem" }}>Carregando informações…</div>;

  if (!tenant)
    return <div style={{ padding: "2rem" }}>❌ Tenant não encontrado.</div>;

  // 🚦 Estados reais de conexão
const isWhatsConnected = [
  "CONNECTED",
  "LOGGED_IN",
  "PAIRING",
  "READY",
  "AUTHENTICATED",
  "ONLINE"
].includes(status?.toUpperCase());


  // 🔵 Mostrar botão Pause somente se houver assinatura + conexão ativa
  const shouldShowPauseButton = !!subscription && isWhatsConnected;
console.log("TENANT:", tenant);
console.log("SUBSCRIPTION:", subscription);

  return (
    <div className={styles.container}> {/* Usando a classe CSS aqui */}
      <h2 className={styles.title}>Integração WhatsApp</h2>

      <p className={styles.description}>
        Conecte o WhatsApp para habilitar automações, confirmações e mensagens
        inteligentes via IA.
      </p>

      {/* O QRCodeDisplay agora é o card principal da página */}
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
          className={styles.hint} // Usando a classe CSS aqui
        >
          Conecte o WhatsApp para habilitar o controle de atendimento.
        </div>
      ) : (
        <div
          className={styles.hint} // Usando a classe CSS aqui
        >
          Associe um plano de assinatura para ativar o controle de atendimento.
        </div>
      )}
    </div>
  );
}