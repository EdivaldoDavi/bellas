import { useEffect, useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { useEvolutionConnection } from "../../../hooks/useEvolutionConnection";
import QRCodeDisplay from "../../QRCodeDisplay";

import styles from "../Onboarding.module.css";
import { AlertTriangle } from "lucide-react";

export default function StepCongratulations() {
  const { tenant } = useUserTenant();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;
  const instanceId = tenant?.id || "";

  // Hook Evolution - mesmo que sua página oficial
  const {
    status,
    qrBase64,
    loading,
    start,
    refresh,
    logout,
  } = useEvolutionConnection({
    baseUrl: evoBase,
    autostart: false,
    initialInstanceId: instanceId,
  });

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>🎉 Seu Studio está pronto!</h2>

      <p className={styles.stepText}>
        Agora você pode conectar seu WhatsApp para ativar automações,
        lembretes e confirmações inteligentes.
      </p>

      {/* ========================================================
         🚫 MOBILE → Exibir aviso e NÃO tentar abrir QR Code
      ========================================================== */}
      {isMobile && (
        <div className={styles.warningBox}>
          <AlertTriangle size={22} color="#b68400" />
          <div>
            <strong>Atenção:</strong> Você está usando um celular.
            <br />
            O WhatsApp <strong>não permite escanear QR Code</strong> usando o
            mesmo aparelho onde o app está instalado.
            <br /><br />
            Para conectar, use outro dispositivo (notebook, tablet ou outro celular).
            <br /><br />
            Ou, se preferir, conecte depois em:
            <br />
            <strong>Menu → WhatsApp → Conectar WhatsApp</strong>
          </div>
        </div>
      )}

      {/* ========================================================
         🖥️ DESKTOP → Mostrar QR Code direto usando seu componente
      ========================================================== */}
      {!isMobile && (
        <div style={{ marginTop: "20px" }}>
          <QRCodeDisplay
            instanceId={instanceId}
            status={status}
            qr={qrBase64}
            loading={loading}
            autoStart={false}
            onStart={start}
            onRefresh={refresh}
            onLogout={logout}
          />
        </div>
      )}

      {/* ========================================================
         Botão final
      ========================================================== */}
      <button
        className={styles.primaryBtn}
        style={{ marginTop: "30px" }}
        onClick={() => (window.location.href = "/dashboard")}
      >
        Ir para o painel
      </button>
    </div>
  );
}
