import spinnerStyles from '../css/LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <div className={spinnerStyles.spinnerContainerSmall}>
      <div className={spinnerStyles.spinner}></div>
      {message ? <p className={spinnerStyles.loadingTextSmall}>{message}</p> : null}
    </div>
  );
}