import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import styles from '../css/OnboardingFixedNavigation.module.css';

interface OnboardingFixedNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  canGoNext: boolean;
  isLastStep: boolean;
}

export default function OnboardingFixedNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  canGoNext,
  isLastStep,
}: OnboardingFixedNavigationProps) {
  return (
    <div className={styles.navigationBar}>
      <button
        className={styles.navButton}
        onClick={onBack}
        disabled={currentStep === 0}
      >
        <ChevronLeft size={20} />
        <span className={styles.buttonLabel}>Voltar</span>
      </button>

      <button
        className={`${styles.navButton} ${styles.nextButton}`}
        onClick={onNext}
        disabled={!canGoNext}
      >
        <span className={styles.buttonLabel}>
          {isLastStep ? 'Finalizar' : 'Próximo'}
        </span>
        {isLastStep ? <Check size={20} /> : <ChevronRight size={20} />}
      </button>
    </div>
  );
}