// src/components/ConnectWhatsAppPage.tsx

import { useUserAndTenant } from "../hooks/useUserAndTenant";
import { useEvolutionConnection } from "../hooks/useEvolutionConnection";
import QRCodeDisplay from "./QRCodeDisplay";
import N8nPauseButton from "../components/N8nPauseButton";
import styles from "../css/ConnectWhatsApp.module.css";

/**
 * 🔥 Este componente agora funciona:
 * - Dentro do SETUP (Step 2)
 * - Como página normal (`/integracoes/whatsapp`)
 *
 * Props adicionais:
 *  insideSetup: boolean  → remove cabeçalho e mostra botão "Continuar"
 *  onFinish: () => void → função chamada ao clicar no botão de continuar
 */
export default function ConnectWhatsAppPage({
  insideSetup = false,
  onFinish,
}: {
  insideSetup?: boolean;
  onFinish?: () => void;
}) {
  const { tenant, subscription, loading } = useUserAndTenant();

  // 🔥 hooks SEMPRE no topo (REACT RULE)
  const instanceId = tenant?.id || "";
  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  const { status } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  // 🔄 loading
  if (loading) {
    return <div className={styles.loading}>Carregando informações…</div>;
  }

  // ❌ tenant ausente
  if (!tenant) {
    return <div className={styles.error}>Tenant não encontrado.</div>;
  }

  // 📌 status desconectado
  const isDisconnected =
    !status ||
    ["DISCONNECTED", "LOGGED_OUT", "ERROR", "UNKNOWN", "IDLE"].includes(status);

  const canShowPause =
    subscription && !isDisconnected;

  return (
    <div className={styles.container}>
      
      {/* 🚫 No setup o título de página some */}
      {!insideSetup && (
        <>
          <h2 className={styles.title}>Integração WhatsApp</h2>
          <p className={styles.description}>
            Conecte o WhatsApp para habilitar automações, notificações e 
            mensagens inteligentes via IA.
          </p>
        </>
      )}

      {/* 📦 Card principal */}
      <div className={styles.card}>
        
        {/* QR CODE aparece SEMPRE */}
        <QRCodeDisplay
          instanceId={instanceId}
          autoStart={false}
          baseUrl={evoBase}
        />

        <div style={{ height: "1rem" }} />

        {/* 🔵 Botão para pausar fluxos quando conectado */}
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

      {/* 👉 Apenas no SETUP */}
      {insideSetup && (
        <button
          onClick={onFinish}
          className={styles.nextButton}
        >
          Continuar
        </button>
      )}
    </div>
  );
}
