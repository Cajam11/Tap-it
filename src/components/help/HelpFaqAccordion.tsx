"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  number: number;
  question: string;
  answer: string;
};

type FaqSection = {
  title: string;
  items: FaqItem[];
};

type HelpFaqAccordionProps = {
  sections: FaqSection[];
};

export default function HelpFaqAccordion({ sections }: HelpFaqAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  function toggleItem(itemNumber: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemNumber)) {
        next.delete(itemNumber);
      } else {
        next.add(itemNumber);
      }
      return next;
    });
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="px-2 text-2xl font-bold text-white">{section.title}</h2>

          <div className="mt-5 space-y-3">
            {section.items.map((item) => {
              const isOpen = openItems.has(item.number);
              const answerId = `help-faq-answer-${item.number}`;

              return (
                <article
                  key={item.number}
                  className={`overflow-hidden rounded-2xl border transition-colors ${
                    isOpen
                      ? "border-white/20 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.number)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                  >
                    <h3 className="text-base font-semibold text-white sm:text-lg">
                      {item.number}. {item.question}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-white/70 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>

                  <div
                    id={answerId}
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm leading-6 text-white/70 sm:px-5 sm:pb-5">{item.answer}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
