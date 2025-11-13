import { Pause, Play } from "lucide-react";
import { useN8nPauseToggle } from "../hooks/useN8nPauseToggle";
import styles from "../css/N8nPauseButton.module.css";

export default function N8nPauseButton({
  subscriptionId,
  initialState
}: {
  subscriptionId: string;
  initialState: boolean;
}) {
  const { paused, loading, toggle } = useN8nPauseToggle(
    subscriptionId,
    initialState
  );

  return (
    <button
      className={`${styles.button} ${
        paused ? styles.resumeButton : styles.pauseButton
      }`}
      onClick={toggle}
      disabled={loading}
    >
      {loading ? (
        "Processando..."
      ) : paused ? (
        <>
          <Play size={18} /> Retomar Atendimento
        </>
      ) : (
        <>
          <Pause size={18} /> Pausar Atendimento
        </>
      )}
    </button>
  );
}
