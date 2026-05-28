import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import HelpContactForm from "@/components/help/HelpContactForm";
import HelpFaqAccordion from "@/components/help/HelpFaqAccordion";
import { createClient } from "@/lib/supabase/server";
import { CircleHelp } from "lucide-react";

export const metadata = {
  title: "Pomoc | Tap-it",
  description: "Často kladené otázky a kontakt pre podporu.",
};

const NAV_LINKS: [string, string][] = [];

type FaqSection = {
  title: string;
  items: Array<{
    number: number;
    question: string;
    answer: string;
  }>;
};

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "QR kód & vstup",
    items: [
      {
        number: 1,
        question: "Môj QR kód nefunguje pri vstupe — čo mám robiť?",
        answer:
          "Uisti sa, že máš aktívne členstvo a stabilné internetové pripojenie. Ak problém pretrváva, ukáž svoj QR kód pracovníkovi na recepcii alebo nás kontaktuj cez formulár nižšie.",
      },
      {
        number: 2,
        question: "Ako získam môj QR kód po registrácii?",
        answer:
          "Po úspešnej registrácii a zaplatení členstva nájdeš svoj QR kód v sekcii „Členstvo“ vo svojom profile na stránke.",
      },
      {
        number: 3,
        question: "Nemám pri sebe telefón — môžem vstúpiť inak?",
        answer:
          "Áno, v takom prípade sa prihlás na recepcii a pracovník ti vstup umožní po overení tvojej totožnosti.",
      },
    ],
  },
  {
    title: "Členstvo & platby",
    items: [
      {
        number: 4,
        question: "Kedy sa mi strhne platba za mesačnú permanentku?",
        answer:
          "Platba sa strhuje vždy v ten istý deň v mesiaci, v ktorý si si členstvo prvýkrát aktivoval.",
      },
      {
        number: 5,
        question: "Akceptujete MultiSport alebo UpBalanse kartu?",
        answer:
          "Áno, akceptujeme MultiSport aj UpBalanse. Skupinové tréningy sú zahrnuté aj pri vstupe cez tieto karty.",
      },
      {
        number: 6,
        question: "Mám ročnú permanentku — môžem navštevovať obe pobočky?",
        answer:
          "Áno, ročná permanentka platí v oboch pobočkách — OC Tehelko aj ePORT Mall.",
      },
    ],
  },
];

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : undefined,
    },
  };

  const navProfile = {
    full_name:
      typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url:
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  return (
    <>
      <NavBarAuth
        navLinks={NAV_LINKS}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-12">
          <section className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-white/60">
              <CircleHelp className="h-4 w-4" />
              FAQ
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Často kladené otázky
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55 sm:text-base">
              Tu nájdeš najčastejšie otázky a odpovede. Ak potrebuješ pomoc,
              použi kontaktný formulár nižšie.
            </p>
          </section>

          <HelpFaqAccordion sections={FAQ_SECTIONS} />

          <HelpContactForm />
        </div>
      </main>
    </>
  );
}
