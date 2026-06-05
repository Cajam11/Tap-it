"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Calendar } from "lucide-react";
import { format } from "date-fns";
import { sk } from "date-fns/locale";
import type { GymNews } from "@/lib/types";

export default function GymNewsSection({ news }: { news: GymNews[] }) {
  const [selectedNews, setSelectedNews] = useState<GymNews | null>(null);

  if (!news || news.length === 0) {
    return null;
  }

  return (
    <>
      <section className="py-20 px-4 lg:px-8 bg-[#080808] overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic leading-none mb-10">
            Aktuality z <span className="text-red-500">Gymu</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="group relative aspect-[4/5] sm:aspect-square overflow-hidden rounded-3xl bg-neutral-900 border border-white/10 text-left transition-transform hover:scale-[1.02]"
              >
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                   <div className="flex items-center text-red-500 text-xs font-bold mb-2 tracking-wider">
                    <Calendar className="w-4 h-4 mr-2" />
                    {item.valid_from ? (
                      <>
                        {format(new Date(item.valid_from), "d. MMMM", { locale: sk })}
                        {item.valid_to && ` - ${format(new Date(item.valid_to), "d. MMMM", { locale: sk })}`}
                      </>
                    ) : (
                      format(new Date(item.created_at), "d. MMMM", { locale: sk })
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {item.title}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL OVERLAY */}
      {selectedNews && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
          {/* Click away area */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={() => setSelectedNews(null)}
          />
          
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 rounded-3xl border border-white/10 shadow-2xl flex flex-col z-10 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black text-white/70 hover:text-white rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            
            {selectedNews.image_url && (
              <div className="relative w-full h-64 sm:h-80 shrink-0">
                <Image
                  src={selectedNews.image_url}
                  alt={selectedNews.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
              </div>
            )}
            
            <div className="p-6 sm:p-10 pt-8 mt-[-40px] relative z-10">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
                {selectedNews.title}
              </h2>
              <div
                className="prose prose-invert prose-red max-w-none prose-p:leading-relaxed prose-a:text-red-500"
                dangerouslySetInnerHTML={{ __html: selectedNews.content_html }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
