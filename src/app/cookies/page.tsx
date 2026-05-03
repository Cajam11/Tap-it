import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Zásady používania cookies | Premium Gyms",
  description:
    "Zásady používania cookies Premium Gyms – Powered by Tap-it platné od 1. januára 2026.",
};

export default function CookiesPage() {
  return (
    <LegalDocumentPage
      title="ZÁSADY POUŽÍVANIA COOKIES"
      subtitle="Premium Gyms – Powered by Tap-it"
      effectiveDate="1. januára 2026"
      toc={[
        { href: "#co-su-cookies", label: "Čo sú cookies" },
        { href: "#ake-cookies-pouzivame", label: "Aké cookies používame" },
        {
          href: "#sprava-a-odvolanie-suhlasu",
          label: "Správa a odvolanie súhlasu",
        },
        { href: "#cookies-tretich-stran", label: "Cookies tretích strán" },
        { href: "#kontakt", label: "Kontakt" },
      ]}
      footerLinks={[
        { href: "/rules", label: "Prevádzkový poriadok", direction: "left" },
      ]}
    >
      <section id="co-su-cookies" className="scroll-mt-32">
        <h2>1. Čo sú cookies</h2>
        <p>
          Cookies sú malé textové súbory, ktoré sa ukladajú do vášho zariadenia
          (počítač, tablet, telefón) pri návšteve webovej stránky tap-it.sk.
          Umožňujú stránke zapamätať si vaše nastavenia, preferencie a zlepšiť
          váš zážitok z používania.
        </p>
      </section>

      <section id="ake-cookies-pouzivame" className="scroll-mt-32">
        <h2>2. Aké cookies používame</h2>
        <p>2.1. Nevyhnutné cookies</p>
        <p>
          Tieto cookies sú potrebné pre základné fungovanie webu. Bez nich by
          stránka nefungovala správne. Tieto cookies nemožno vypnúť.
        </p>
        <p>
          Príklady: prihlásenie do účtu, uchovanie obsahu košíka, bezpečnostné
          tokeny.
        </p>
        <p>2.2. Analytické cookies</p>
        <p>
          Pomáhajú nám pochopiť, ako návštevníci používajú naše stránky – ktoré
          sekcie navštevujú, ako dlho sa zdržia a odkiaľ prichádzajú. Tieto
          údaje sú anonymizované.
        </p>
        <p>Používame: Google Analytics</p>
        <p>2.3. Funkčné cookies</p>
        <p>
          Umožňujú stránke zapamätať si vaše preferencie (napr. jazyk, región)
          pre pohodlnejšie používanie.
        </p>
        <p>2.4. Marketingové cookies</p>
        <p>
          Slúžia na zobrazovanie relevantných reklám. Tieto cookies môžu byť
          nastavené partnermi tretích strán.
        </p>
      </section>

      <section id="sprava-a-odvolanie-suhlasu" className="scroll-mt-32">
        <h2>3. Správa a odvolanie súhlasu</h2>
        <p>
          3.1. Pri prvej návšteve webu vám zobrazíme lištu s možnosťou súhlasiť
          s jednotlivými kategóriami cookies.
        </p>
        <p>
          3.2. Svoj súhlas môžete kedykoľvek zmeniť alebo odvolať
          prostredníctvom nastavení cookies v päte stránky.
        </p>
        <p>
          3.3. Cookies môžete tiež spravovať priamo v nastaveniach vášho
          prehliadača:
        </p>
        <p>
          Chrome: Nastavenia → Ochrana súkromia a zabezpečenie → Súbory cookie
        </p>
        <p>Firefox: Nastavenia → Súkromie a zabezpečenie</p>
        <p>Safari: Nastavenia → Súkromie</p>
        <p>
          3.4. Upozorňujeme, že vypnutie niektorých cookies môže obmedziť
          funkcionalitu webovej stránky.
        </p>
      </section>

      <section id="cookies-tretich-stran" className="scroll-mt-32">
        <h2>4. Cookies tretích strán</h2>
        <p>
          Naša stránka môže obsahovať obsah alebo nástroje tretích strán (napr.
          Google Analytics, Meta Pixel), ktoré môžu nastaviť vlastné cookies. Na
          tieto cookies sa vzťahujú zásady ochrany súkromia príslušných
          spoločností.
        </p>
      </section>

      <section id="kontakt" className="scroll-mt-32">
        <h2>5. Kontakt</h2>
        <p>
          Ak máte otázky týkajúce sa používania cookies, kontaktujte nás na:
        </p>
        <p>info@premiumgyms.com</p>
      </section>
    </LegalDocumentPage>
  );
}
