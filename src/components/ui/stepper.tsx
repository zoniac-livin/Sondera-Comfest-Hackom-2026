import { Check } from "lucide-react";

export interface JourneyStep { name: string; detail: string }
interface StepperProps {
  steps: JourneyStep[];
  activeIndex: number;
  availableThrough?: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, activeIndex, availableThrough = activeIndex, onStepClick }: StepperProps) {
  return (
    <nav className="stepper" aria-label="Investigation steps">
      {steps.map((step, index) => (
        <button
          className={`step ${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-complete" : ""}`}
          key={step.name}
          type="button"
          onClick={() => onStepClick?.(index)}
          disabled={!onStepClick || index > availableThrough}
          aria-current={index === activeIndex ? "step" : undefined}
        >
          <span className="step-number" aria-hidden="true">{index < activeIndex ? <Check size={15} /> : `0${index + 1}`}</span>
          <span className="step-copy"><span className="step-name">{step.name}</span><span className="step-detail">{step.detail}</span></span>
        </button>
      ))}
    </nav>
  );
}
