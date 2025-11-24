
import spinnerStyles from '../css/LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Carregando..." }: LoadingSpinnerProps) {
  return (
    <div className={spinnerStyles.spinnerContainerSmall}>
      <div className={spinnerStyles.spinner}></div>
      <p className={spinnerStyles.loadingTextSmall}>{message}</p>
    </div>
  );
}