import { useUserAndTenant } from "../hooks/useUserAndTenant";
import QRCodeDisplay from "./QRCodeDisplay";

export default function ConnectWhatsAppPage() {
  const { tenant } = useUserAndTenant();

  const instanceId = tenant?.id
    ? `tenant_${tenant.id}`
    : "tenant_demo";

  const evoBase =
    import.meta.env.VITE_EVO_PROXY_URL ??
    "http://localhost:3001/api";

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2>Integração WhatsApp</h2>
      <p>Conecte o WhatsApp para habilitar automações via IA.</p>

      <QRCodeDisplay
        instanceId={instanceId}
        baseUrl={evoBase}
        autoStart={false}   // 🔥 AGORA NÃO CONECTA AUTOMATICAMENTE
      />
    </div>
  );
}
