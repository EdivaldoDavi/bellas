import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AlertTriangle, X } from 'lucide-react';
import styles from "../css/WhatsAppDisconnectedToast.module.css";
interface WhatsAppDisconnectedToastProps {
  closeToast?: () => void;
  instanceId: string;
}

const WhatsAppDisconnectedToast: React.FC<WhatsAppDisconnectedToastProps> = ({ closeToast, instanceId }) => {
  const navigate = useNavigate();

  const handleConnectClick = () => {
    navigate('/integracoes/whatsapp');
    closeToast?.();
  };

  const handleDismissClick = () => {
    localStorage.setItem(`whatsapp_alert_dismissed_instance_${instanceId}`, 'true');
    closeToast?.();
  };

  return (
    <div className={styles.toastContent}>
      <div className={styles.iconWrapper}>
        <AlertTriangle size={24} className={styles.alertIcon} />
      </div>
      <div className={styles.messageContent}>
        <p className={styles.messageTitle}>WhatsApp Desconectado</p>
        <p className={styles.messageText}>
          Para utilizar o agendamento com IA, conecte o WhatsApp.
        </p>
        <div className={styles.actions}>
          <button className={styles.connectButton} onClick={handleConnectClick}>
            Conectar
          </button>
          <button className={styles.dismissButton} onClick={handleDismissClick}>
            Fechar
          </button>
        </div>
      </div>
      <button className={styles.closeButton} onClick={handleDismissClick}>
        <X size={18} />
      </button>
    </div>
  );
};

export default WhatsAppDisconnectedToast;
