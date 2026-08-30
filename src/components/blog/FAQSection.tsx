import React, { useState } from 'react';
import { FAQItem } from '@/types/blog';
import { Check, Link as LinkIcon, Plus } from 'iconoir-react';
import { toast } from 'sonner';

interface FAQSectionProps {
  faqs: FAQItem[];
}

export const FAQSection: React.FC<FAQSectionProps> = ({ faqs }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyAnchor = (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Anchor link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section aria-labelledby="faq-heading" className="my-12">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <h2
          id="faq-heading"
          className="font-display text-xl font-bold uppercase tracking-tight text-foreground md:text-2xl"
        >
          Frequently Asked Questions
        </h2>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          30–50 Word AI Chunks
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            id={faq.id}
            className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-foreground md:text-lg">
                {faq.question}
              </h3>
              <button
                onClick={() => copyAnchor(faq.id)}
                title="Copy persistent anchor link"
                className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border text-muted-foreground opacity-60 transition-all group-hover:opacity-100 hover:border-primary hover:text-primary"
                aria-label={`Copy link for question: ${faq.question}`}
              >
                {copiedId === faq.id ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <LinkIcon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
