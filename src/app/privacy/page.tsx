import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Ochrana osobných údajov | Premium Gyms",
  description:
    "Zásady ochrany osobných údajov Premium Gyms – Powered by Tap-it platné od 1. januára 2026.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="OCHRANA OSOBNÝCH ÚDAJOV"
      subtitle="Premium Gyms – Powered by Tap-it"
      effectiveDate="1. januára 2026"
      toc={[
        {
          href: "#prevadzkovatel-osobnych-udajov",
          label: "Prevádzkovateľ osobných údajov",
        },
        { href: "#ake-udaje-spracuvame", label: "Aké osobné údaje spracúvame" },
        {
          href: "#ucel-a-pravny-zaklad",
          label: "Účel a právny základ spracúvania",
        },
        { href: "#doba-uchovavania", label: "Doba uchovávania" },
        { href: "#prijemcovia-udajov", label: "Príjemcovia osobných údajov" },
        { href: "#vas-prava", label: "Vaše práva" },
        { href: "#bezpecnost-udajov", label: "Bezpečnosť údajov" },
      ]}
      footerLinks={[
        {
          href: "/terms",
          label: "Všeobecné obchodné podmienky",
          direction: "left",
        },
        { href: "/rules", label: "Prevádzkový poriadok", direction: "right" },
      ]}
    >
      <section id="prevadzkovatel-osobnych-udajov" className="scroll-mt-32">
        <h2>1. Prevádzkovateľ osobných údajov</h2>
        <p>
          Prevádzkovateľom osobných údajov je spoločnosť prevádzkujúca
          fitnescentrá Premium Gyms s prevádzkami na adresách OC Tehelko
          (Bajkalská 2i) a ePORT Mall (Ivanská cesta 26) v Bratislave.
        </p>
        <p>Kontakt na zodpovednú osobu: info@premiumgyms.com</p>
      </section>

      <section id="ake-udaje-spracuvame" className="scroll-mt-32">
        <h2>2. Aké osobné údaje spracúvame</h2>
        <p>Spracúvame nasledovné kategórie osobných údajov:</p>
        <p>Identifikačné údaje – meno, priezvisko, dátum narodenia</p>
        <p>Kontaktné údaje – e-mailová adresa, telefónne číslo</p>
        <p>Platobné údaje – informácie o uskutočnených platbách</p>
        <p>Prevádzkové údaje – záznamy o vstupoch (čas, dátum, pobočka)</p>
        <p>Technické údaje – ID zariadenia, údaje z aplikácie Tap-it</p>
      </section>

      <section id="ucel-a-pravny-zaklad" className="scroll-mt-32">
        <h2>3. Účel a právny základ spracúvania</h2>
        <p>Vaše osobné údaje spracúvame za nasledovnými účelmi:</p>
        <p>Plnenie zmluvy – správa členstva, umožnenie vstupu cez Tap-it</p>
        <p>Plnenie zákonných povinností – účtovné a daňové povinnosti</p>
        <p>
          Oprávnený záujem – bezpečnosť prevádzky, prevencia podvodov,
          monitorovanie obsadenosti
        </p>
        <p>Súhlas – zasielanie marketingových správ (iba ak ste súhlasili)</p>
      </section>

      <section id="doba-uchovavania" className="scroll-mt-32">
        <h2>4. Doba uchovávania</h2>
        <p>Osobné údaje uchovávame po dobu trvania členstva a následne:</p>
        <p>5 rokov – pre účtovné a daňové účely (zákonná povinnosť)</p>
        <p>1 rok – prevádzkové záznamy o vstupoch</p>
        <p>Do odvolania súhlasu – marketingové komunikácie</p>
      </section>

      <section id="prijemcovia-udajov" className="scroll-mt-32">
        <h2>5. Príjemcovia osobných údajov</h2>
        <p>Vaše údaje môžu byť zdieľané s:</p>
        <p>Poskytovateľom technológie Tap-it (sprostredkovateľ)</p>
        <p>Poskytovateľmi platobných služieb</p>
        <p>Účtovnými a právnymi poradcami</p>
        <p>Štátnymi orgánmi (na základe zákonnej povinnosti)</p>
        <p>Vaše osobné údaje neodovzdávame do tretích krajín mimo EÚ.</p>
      </section>

      <section id="vas-prava" className="scroll-mt-32">
        <h2>6. Vaše práva</h2>
        <p>
          V súvislosti so spracúvaním osobných údajov máte nasledovné práva:
        </p>
        <p>Právo na prístup – vedieť, aké údaje o vás spracúvame</p>
        <p>Právo na opravu – požiadať o opravu nesprávnych údajov</p>
        <p>Právo na vymazanie – požiadať o vymazanie údajov</p>
        <p>Právo na obmedzenie – obmedziť spracúvanie vašich údajov</p>
        <p>Právo na prenosnosť – získať údaje v strojovo čitateľnom formáte</p>
        <p>Právo namietať – voči spracúvaniu na základe oprávneného záujmu</p>
        <p>
          Právo odvolať súhlas – kedykoľvek odvolať súhlas so zasielaním
          marketingu
        </p>
        <p>Na uplatnenie práv nás kontaktujte na: info@premiumgyms.com</p>
        <p>
          Máte tiež právo podať sťažnosť na Úrad na ochranu osobných údajov SR
          (www.uoou.sk).
        </p>
      </section>

      <section id="bezpecnost-udajov" className="scroll-mt-32">
        <h2>7. Bezpečnosť údajov</h2>
        <p>
          Prijali sme primerané technické a organizačné opatrenia na ochranu
          vašich osobných údajov pred neoprávneným prístupom, zneužitím, stratou
          alebo zničením.
        </p>
      </section>
    </LegalDocumentPage>
  );
}
