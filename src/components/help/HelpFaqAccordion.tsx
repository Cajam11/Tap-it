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
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
            {section.title}
          </h2>

          {section.items.map((item) => {
            const isOpen = openItems.has(item.number);
            const answerId = `help-faq-answer-${item.number}`;

            return (
              <article
                key={item.number}
                className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
                  isOpen
                    ? "border-white/10 bg-white/[0.05]"
                    : "border-white/[0.07] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.number)}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
                >
                  <h3 className="text-base font-semibold text-white sm:text-[17px]">
                    {item.question}
                  </h3>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-white/40 transition-transform duration-200 ${
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
                    <p className="px-5 pb-5 text-[15px] leading-7 text-white/60 sm:px-6">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
