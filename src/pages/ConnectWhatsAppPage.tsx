import { useUserAndTenant } from "../hooks/useUserAndTenant";
import QRCodeDisplay from "./QRCodeDisplay";

export default function ConnectWhatsAppPage() {
  const { tenant, loading } = useUserAndTenant();

  if (loading)
    return <div style={{ padding: "2rem" }}>Carregando informações…</div>;
  if (!tenant?.id)
    return (
      <div style={{ padding: "2rem" }}>
        ❌ Nenhum tenant encontrado. Recarregue a página.
      </div>
    );

  const instanceId = tenant.id; // ✅ UUID puro
  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ?? "http://localhost:3001/api";

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2>Integração WhatsApp</h2>
      <p>
        Conecte o WhatsApp para habilitar automações, confirmações e mensagens
        via IA.
      </p>

      <QRCodeDisplay
        instanceId={instanceId}
        autoStart={false} // manual start
        baseUrl={evoBase}
      />
    </div>
  );
}
