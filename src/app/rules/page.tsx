import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Prevádzkový poriadok | Premium Gyms",
  description:
    "Prevádzkový poriadok Premium Gyms – Powered by Tap-it platný od 1. januára 2026.",
};

export default function RulesPage() {
  return (
    <LegalDocumentPage
      title="PREVÁDZKOVÝ PORIADOK"
      subtitle="Premium Gyms – Powered by Tap-it"
      effectiveDate="1. januára 2026"
      toc={[
        { href: "#vstup-do-fitnescentra", label: "Vstup do fitnescentra" },
        { href: "#oblecenie-a-vybavenie", label: "Oblečenie a vybavenie" },
        {
          href: "#spravanie-sa-v-priestoroch",
          label: "Správanie sa v priestoroch",
        },
        {
          href: "#pouzivanie-zariadeni-a-sauny",
          label: "Používanie zariadení a sauny",
        },
        {
          href: "#satne-a-uschovne-priestory",
          label: "Šatne a úschovné priestory",
        },
        { href: "#prevadzkove-hodiny", label: "Prevádzkové hodiny" },
        {
          href: "#porusenie-prevadzkoveho-poriadku",
          label: "Porušenie prevádzkového poriadku",
        },
      ]}
      footerLinks={[
        {
          href: "/privacy",
          label: "Ochrana osobných údajov",
          direction: "left",
        },
        { href: "/cookies", label: "Cookies", direction: "right" },
      ]}
    >
      <section id="vstup-do-fitnescentra" className="scroll-mt-32">
        <h2>1. Vstup do fitnescentra</h2>
        <p>
          1.1. Vstup do fitnescentra je umožnený výhradne cez aplikáciu Tap-it
          pomocou NFC terminálu pri vstupe. Každý návštevník je povinný sa pri
          vstupe riadne prihlásiť.
        </p>
        <p>
          1.2. Do fitnescentra nie je dovolené vstupovať osobám pod vplyvom
          alkoholu, omamných alebo psychotropných látok.
        </p>
        <p>
          1.3. Vstup osobám mladším ako 15 rokov je povolený len v sprievode
          zákonného zástupcu.
        </p>
        <p>1.4. Osobám s infekčným ochorením je vstup zakázaný.</p>
        <p>
          1.5. Prevádzkovateľ si vyhradzuje právo odmietnuť vstup bez udania
          dôvodu.
        </p>
      </section>

      <section id="oblecenie-a-vybavenie" className="scroll-mt-32">
        <h2>2. Oblečenie a vybavenie</h2>
        <p>
          2.1. Návštevníci sú povinní cvičiť vo vhodnom športovom oblečení a
          čistej športovej obuvi s nevyfarbujúcou podrážkou.
        </p>
        <p>2.2. Na kardio zóne sa odporúča používanie uteráka na strojoch.</p>
        <p>2.3. Do sauny vstupujte výhradne s uterákom.</p>
        <p>2.4. Vonkajšia obuv musí byť odložená v šatni.</p>
      </section>

      <section id="spravanie-sa-v-priestoroch" className="scroll-mt-32">
        <h2>3. Správanie sa v priestoroch</h2>
        <p>
          3.1. Každý návštevník je povinný správať sa ohľaduplne voči ostatným a
          rešpektovať pokyny personálu.
        </p>
        <p>
          3.2. Po použití zariadenia je každý návštevník povinný stroj utrieť a
          náradie vrátiť na pôvodné miesto.
        </p>
        <p>3.3. V priestoroch fitnescentra je zakázané:</p>
        <p>Fajčiť a používať elektronické cigarety</p>
        <p>Konzumovať alkohol alebo iné omamné látky</p>
        <p>Používať vulgarizmy a správať sa agresívne</p>
        <p>Vykonávať akékoľvek obchodné aktivity bez súhlasu prevádzkovateľa</p>
        <p>Fotografovať alebo nahrávať iných návštevníkov bez ich súhlasu</p>
        <p>
          3.4. Používanie mobilného telefónu počas cvičenia je povolené, nesmie
          však obťažovať ostatných návštevníkov.
        </p>
      </section>

      <section id="pouzivanie-zariadeni-a-sauny" className="scroll-mt-32">
        <h2>4. Používanie zariadení a sauny</h2>
        <p>
          4.1. Návštevníci sú povinní používať zariadenia len na určený účel a
          podľa návodu.
        </p>
        <p>
          4.2. Poškodenie zariadenia z nedbalosti je návštevník povinný
          bezodkladne nahlásiť personálu a uhradiť škodu.
        </p>
        <p>
          4.3. Sauna je súčasťou členstva a jednorazového vstupu. V saune platia
          hygienické pravidlá – povinný uterák, zákaz vstupu v plavkách
          znečistených od krému.
        </p>
        <p>
          4.4. Kapacita skupinových hodín je obmedzená. Odporúčame rezerváciu
          vopred.
        </p>
      </section>

      <section id="satne-a-uschovne-priestory" className="scroll-mt-32">
        <h2>5. Šatne a úschovné priestory</h2>
        <p>
          5.1. Cennosti odporúčame ukladať do uzamykateľných skriniek v šatni.
        </p>
        <p>
          5.2. Prevádzkovateľ nezodpovedá za stratu alebo odcudzenie vecí
          ponechaných v šatni.
        </p>
        <p>
          5.3. Skrinky sú určené výhradne na dobu návštevy. Prevádzkovateľ si
          vyhradzuje právo vyprázdniť skrinky po zatváracom čase.
        </p>
      </section>

      <section id="prevadzkove-hodiny" className="scroll-mt-32">
        <h2>6. Prevádzkové hodiny</h2>
        <p>OC Tehelko (Bajkalská 2i):</p>
        <p>Pondelok – Piatok: 5:30 – 22:00</p>
        <p>Sobota – Nedeľa: 7:00 – 22:00</p>
        <p>ePORT Mall (Ivanská cesta 26):</p>
        <p>Pondelok – Piatok: 5:30 – 22:00</p>
        <p>Sobota – Nedeľa: 7:00 – 22:00</p>
        <p>24/7 prístup pre schválených členov</p>
      </section>

      <section id="porusenie-prevadzkoveho-poriadku" className="scroll-mt-32">
        <h2>7. Porušenie prevádzkového poriadku</h2>
        <p>
          7.1. Porušenie prevádzkového poriadku môže viesť k okamžitému
          vykázaniu z priestorov bez nároku na vrátenie vstupného.
        </p>
        <p>
          7.2. Opakované alebo závažné porušenie môže viesť k trvalému zákazu
          vstupu a zrušeniu členstva.
        </p>
      </section>
    </LegalDocumentPage>
  );
}
