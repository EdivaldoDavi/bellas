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
    // 🔥 DETECÇÃO CONFIÁVEL (desktop vs mobile)
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    setIsMobile(mobile);
  }, []);

  const evoBase = import.meta.env.VITE_EVO_PROXY_URL;
  const instanceId = tenant?.id || "";

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
        Agora você pode conectar o WhatsApp para habilitar automações,
        confirmações e lembretes inteligentes.
      </p>

      {/* ========================================================
         📱 MOBILE → MOSTRA APENAS O AVISO
      ========================================================== */}
      {isMobile && (
        <div className={styles.warningBox}>
          <AlertTriangle size={22} color="#b68400" />
          <div>
            <strong>Atenção:</strong> Você está usando um celular.
            <br />
            O WhatsApp não permite ler o QR Code usando o mesmo aparelho.
            <br /><br />
            Conecte usando um notebook, tablet ou outro celular.
            <br /><br />
            Ou conecte depois em:
            <br />
            <strong>Menu → WhatsApp → Conectar WhatsApp</strong>
          </div>
        </div>
      )}

      {/* ========================================================
         🖥️ DESKTOP → MOSTRA QR CODE AUTOMATICAMENTE
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
