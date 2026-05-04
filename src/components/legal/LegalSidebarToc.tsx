"use client";

import { useEffect, useState } from "react";

type TocItem = {
  href: string;
  label: string;
};

export default function LegalSidebarToc({ toc }: { toc: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const root = document.getElementById("document-scroll-container");
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root,
        // Tento rootMargin zabezpečí, že sa sekcia aktivuje, keď príde bližšie k hornej časti obrazovky
        rootMargin: "-10% 0px -70% 0px",
      },
    );

    // Initial check a fallback na prvú sekciu
    if (toc.length > 0) {
      setActiveId(
        (currentActiveId) => currentActiveId || toc[0].href.replace("#", ""),
      );
    }

    toc.forEach((item) => {
      const id = item.href.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    // Handle scroll to the absolute bottom (workaround pre posledne kratke sekcie)
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = root;
      // Ak používateľ zoscrolloval úplne na spodok (s malou rezervou 5px)
      if (Math.ceil(scrollTop + clientHeight) >= scrollHeight - 5) {
        const lastItem = toc[toc.length - 1];
        if (lastItem) {
          setActiveId(lastItem.href.replace("#", ""));
        }
      }
    };

    root.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", handleScroll);
    };
  }, [toc]);

  return (
    <nav aria-label="Obsah dokumentu" className="flex flex-col gap-2 relative">
      {/* Subtle left border for TOC */}
      <div className="absolute left-0 top-1 bottom-1 w-px bg-white/5" />

      {toc.map((item, index) => {
        const id = item.href.replace("#", "");
        const isActive = activeId === id;

        return (
          <a
            key={item.href}
            href={item.href}
            className={`group flex items-start gap-3 text-sm transition-colors pl-4 relative ${
              isActive ? "text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {isActive && (
              <div className="absolute left-[-1px] top-1 bottom-1 w-[2px] bg-red-500 rounded-r" />
            )}
            <span
              className={`font-semibold transition-colors ${
                isActive
                  ? "text-red-500"
                  : "text-white/70 group-hover:text-red-400"
              }`}
            >
              {index + 1}.
            </span>
            <span className="leading-snug">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
