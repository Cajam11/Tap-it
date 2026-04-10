import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import HelpContactForm from "@/components/help/HelpContactForm";
import HelpFaqAccordion from "@/components/help/HelpFaqAccordion";
import { createClient } from "@/lib/supabase/server";

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
        question: "Platnosť môjho QR kódu vypršala — ako ho obnovím?",
        answer:
          "QR kód sa obnoví automaticky po predĺžení alebo zaplatení členstva. Ak si členstvo obnovil a kód stále nefunguje, kontaktuj nás.",
      },
      {
        number: 4,
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
        number: 5,
        question: "Ako zruším alebo zmením svoje členstvo?",
        answer:
          "Členstvo môžeš zmeniť alebo zrušiť priamo vo svojom profile v sekcii „Členstvo“. Zrušenie je potrebné vykonať najneskôr 7 dní pred ďalším fakturačným obdobím.",
      },
      {
        number: 6,
        question: "Kedy sa mi strhne platba za mesačnú permanentku?",
        answer:
          "Platba sa strhuje vždy v ten istý deň v mesiaci, v ktorý si si členstvo prvýkrát aktivoval.",
      },
      {
        number: 7,
        question: "Akceptujete MultiSport alebo UpBalanse kartu?",
        answer:
          "Áno, akceptujeme MultiSport aj UpBalanse. Skupinové tréningy sú zahrnuté aj pri vstupe cez tieto karty.",
      },
      {
        number: 8,
        question: "Mám ročnú permanentku — môžem navštevovať obe pobočky?",
        answer:
          "Áno, ročná permanentka platí v oboch pobočkách — OC Tehelko aj ePORT Mall.",
      },
    ],
  },
  {
    title: "Registrácia & účet",
    items: [
      {
        number: 9,
        question: "Zabudol som heslo — ako ho resetnem?",
        answer:
          "Na prihlasovacej stránke klikni na „Zabudol som heslo“ a postupuj podľa inštrukcií zaslaných na tvoj e-mail.",
      },
      {
        number: 10,
        question: "Ako zmením svoje osobné údaje alebo e-mailovú adresu?",
        answer:
          "Osobné údaje môžeš upraviť v nastaveniach svojho účtu po prihlásení.",
      },
      {
        number: 11,
        question: "Môžem mať jeden účet pre viacerých ľudí?",
        answer:
          "Nie, každý člen musí mať vlastný účet z bezpečnostných dôvodov — QR kód je viazaný na konkrétnu osobu.",
      },
    ],
  },
  {
    title: "Pobočky & prevádzka",
    items: [
      {
        number: 12,
        question: "Kde sa nachádzajú vaše pobočky?",
        answer:
          "Máme dve pobočky: OC Tehelko na Bajkalskej 2 a ePORT Mall na Ivanskej ceste 26.",
      },
      {
        number: 13,
        question: "Ako zistím aktuálnu obsadenosť fitka?",
        answer:
          "Aktuálna obsadenosť je zobrazená priamo na hlavnej stránke v reálnom čase.",
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
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Pomoc a podpora</h1>
            <p className="mt-2 text-white/65">
              Tu nájdeš najčastejšie otázky a odpovede. Ak potrebuješ pomoc, použi kontaktný formulár nižšie.
            </p>
          </section>

          <HelpFaqAccordion sections={FAQ_SECTIONS} />

          <HelpContactForm />
        </div>
      </main>
    </>
  );
}
