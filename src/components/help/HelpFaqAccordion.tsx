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
        <section key={section.title} className="space-y-4">
          <h2 className="text-[28px] font-bold text-white sm:text-3xl">{section.title}</h2>

          <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {section.items.map((item) => {
              const isOpen = openItems.has(item.number);
              const answerId = `help-faq-answer-${item.number}`;

              return (
                <article
                  key={item.number}
                  className={`overflow-hidden transition-colors ${isOpen ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(item.number)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6"
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
                      <p className="px-4 pb-4 text-[15px] leading-7 text-white/70 sm:px-6 sm:pb-5">{item.answer}</p>
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
