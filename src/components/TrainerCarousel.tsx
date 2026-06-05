"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import FadeIn from "@/components/FadeIn";

export type LandingTrainer = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
};

type TrainerCarouselProps = {
  trainers: LandingTrainer[];
  trainerServiceId: string | null;
};

export default function TrainerCarousel({
  trainers,
  trainerServiceId,
}: TrainerCarouselProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const list = scrollRef.current;
    if (!list) return;

    const maxScrollLeft = list.scrollWidth - list.clientWidth;
    setCanScrollLeft(list.scrollLeft > 4);
    setCanScrollRight(list.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    const list = scrollRef.current;
    if (!list) return;

    const rafId = window.requestAnimationFrame(updateScrollState);
    const observer = new ResizeObserver(updateScrollState);

    observer.observe(list);
    list.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      list.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, trainers.length]);

  const scrollByPage = (direction: "left" | "right") => {
    const list = scrollRef.current;
    if (!list) return;

    list.scrollBy({
      left: direction === "left" ? -list.clientWidth * 0.85 : list.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  if (trainers.length === 0) {
    return (
      <p className="text-center text-white/40">Zatiaľ žiadni tréneri v ponuke.</p>
    );
  }

  return (
    <div className="relative">
      <ul
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {trainers.map((trainer, i) => {
          const displayName = trainer.full_name ?? "Tréner";
          const avatarFallback = displayName.trim().charAt(0).toUpperCase();
          const bookingHref = trainerServiceId
            ? `/bookings/trainers/${trainer.id}?serviceId=${trainerServiceId}`
            : "/bookings/trainers";

          return (
            <FadeIn
              key={trainer.id}
              as="li"
              delay={i * 90}
              className="w-[min(82vw,22rem)] shrink-0 snap-start sm:w-[20rem] lg:w-[23rem]"
            >
              <div className="group">
                <Link
                  href={bookingHref}
                  className="relative block overflow-hidden rounded-3xl border border-white/[0.06] transition-colors duration-300 hover:border-white/[0.12] focus-visible:ring-2 focus-visible:ring-white outline-none"
                >
                  {trainer.avatar_url ? (
                    <Image
                      src={trainer.avatar_url}
                      alt={displayName}
                      width={600}
                      height={750}
                      loading="lazy"
                      sizes="(min-width: 1024px) 23rem, (min-width: 640px) 20rem, 82vw"
                      className="aspect-[3/4] w-full object-cover transition-[transform] duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center bg-white/[0.04]">
                      <span className="text-6xl font-semibold text-white/70">
                        {avatarFallback || "T"}
                      </span>
                    </div>
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                  />

                  <div
                    className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm"
                    aria-hidden="true"
                  >
                    <ArrowUpRight className="h-5 w-5 text-white" />
                  </div>

                  <div className="absolute bottom-0 inset-x-0 px-6 pb-5">
                    <p className="line-clamp-2 text-sm text-white/60">
                      {trainer.bio || "Osobný tréner"}
                    </p>
                  </div>
                </Link>

                <div className="mt-5 text-center">
                  <Link
                    href={bookingHref}
                    className="text-xl font-bold text-white transition-colors hover:text-red-400 focus-visible:ring-2 focus-visible:ring-white rounded outline-none sm:text-2xl"
                  >
                    {displayName}
                  </Link>
                  {trainer.phone && (
                    <a
                      href={`tel:${trainer.phone.replace(/\s/g, "")}`}
                      className="mt-1 block text-base text-white/40 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white rounded outline-none"
                    >
                      {trainer.phone}
                    </a>
                  )}
                </div>
              </div>
            </FadeIn>
          );
        })}
      </ul>

      <div className="mt-8 flex justify-center gap-4">
        <button
          type="button"
          onClick={() => scrollByPage("left")}
          disabled={!canScrollLeft}
          aria-label="Predchádzajúci tréneri"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-white outline-none"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollByPage("right")}
          disabled={!canScrollRight}
          aria-label="Ďalší tréneri"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:border-white/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-white outline-none"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
