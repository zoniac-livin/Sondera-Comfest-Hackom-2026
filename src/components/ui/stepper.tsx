import { Check } from "lucide-react";

export interface JourneyStep { name: string; detail: string }
interface StepperProps { steps: JourneyStep[]; activeIndex: number }

export function Stepper({ steps, activeIndex }: StepperProps) {
  return (
    <nav className="stepper" aria-label="Investigation steps">
      {steps.map((step, index) => (
        <div className={`step ${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-complete" : ""}`} key={step.name} aria-current={index === activeIndex ? "step" : undefined}>
          <span className="step-number" aria-hidden="true">{index < activeIndex ? <Check size={15} /> : `0${index + 1}`}</span>
          <span className="step-copy"><span className="step-name">{step.name}</span><span className="step-detail">{step.detail}</span></span>
        </div>
      ))}
    </nav>
  );
}
