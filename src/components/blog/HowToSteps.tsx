import React from 'react';
import { HowToStep } from '@/types/blog';

interface HowToStepsProps {
  title: string;
  steps: HowToStep[];
}

export const HowToSteps: React.FC<HowToStepsProps> = ({ title, steps }) => {
  return (
    <section aria-label={title} className="my-10">
      <h3 className="font-display text-lg font-bold uppercase tracking-tight text-foreground md:text-xl">
        {title}
      </h3>

      <ol className="mt-6 space-y-4">
        {steps.map((step) => (
          <li
            key={step.stepNumber}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 font-mono text-sm font-bold text-primary">
              {step.stepNumber}
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {step.verbTitle}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
