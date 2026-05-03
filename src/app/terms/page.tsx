import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";

export const metadata: Metadata = {
  title: "Všeobecné obchodné podmienky | Premium Gyms",
  description:
    "Všeobecné obchodné podmienky Premium Gyms – Powered by Tap-it platné od 1. januára 2026.",
};

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="VŠEOBECNÉ OBCHODNÉ PODMIENKY"
      subtitle="Premium Gyms – Powered by Tap-it"
      effectiveDate="1. januára 2026"
      toc={[
        { href: "#zakladne-ustanovenia", label: "Základné ustanovenia" },
        { href: "#clenstvo-a-vstup", label: "Členstvo a vstup" },
        { href: "#platobne-podmienky", label: "Platobné podmienky" },
        {
          href: "#zrusenie-a-pozastavenie-clenstva",
          label: "Zrušenie a pozastavenie členstva",
        },
        {
          href: "#zodpovednost",
          label: "Zodpovednosť a odmietnutie zodpovednosti",
        },
        { href: "#zaverecne-ustanovenia", label: "Záverečné ustanovenia" },
      ]}
      footerLinks={[
        {
          href: "/privacy",
          label: "Ochrana osobných údajov",
          direction: "right",
        },
      ]}
    >
      <section id="zakladne-ustanovenia" className="scroll-mt-32">
        <h2>1. Základné ustanovenia</h2>
        <p>
          1.1. Tieto Všeobecné obchodné podmienky (ďalej len „VOP") upravujú
          vzájomné práva a povinnosti medzi prevádzkovateľom fitnescentier
          Premium Gyms (ďalej len „Prevádzkovateľ") a fyzickými osobami (ďalej
          len „Člen" alebo „Návštevník") pri využívaní služieb fitnescentier.
        </p>
        <p>
          1.2. Prevádzkovateľom je spoločnosť prevádzkujúca fitnescentrá pod
          značkou Premium Gyms na adresách:
        </p>
        <p>OC Tehelko, Bajkalská 2i, Bratislava</p>
        <p>ePORT Mall, Ivanská cesta 26, Bratislava</p>
        <p>
          1.3. Vstup do fitnescentra a využívanie jeho služieb je podmienené
          súhlasom s týmito VOP a Prevádzkovým poriadkom.
        </p>
      </section>

      <section id="clenstvo-a-vstup" className="scroll-mt-32">
        <h2>2. Členstvo a vstup</h2>
        <p>2.1. Fitnescentrum Premium Gyms ponúka nasledovné formy vstupu:</p>
        <p>Jednorazový vstup – 14 € / 1 vstup</p>
        <p>Mesačná permanentka – 39 € / mesiac (neobmedzený vstup)</p>
        <p>
          Ročná permanentka – 29 € / mesiac (neobmedzený vstup, fakturovaná
          ročne)
        </p>
        <p>
          2.2. Vstup do fitnescentra je umožnený výhradne prostredníctvom
          technológie Tap-it – mobilnou aplikáciou a NFC čipom pri vstupnom
          termináli.
        </p>
        <p>
          2.3. Permanentka je neprenosná a viazaná na konkrétnu osobu. Jej
          požičanie alebo zdieľanie je zakázané.
        </p>
        <p>2.4. Akceptované sú aj vstupy cez MultiSport kartu a UpBalansea.</p>
        <p>
          2.5. Skupinové tréningy sú zahrnuté v cene jednorazového vstupu aj
          permanentky.
        </p>
      </section>

      <section id="platobne-podmienky" className="scroll-mt-32">
        <h2>3. Platobné podmienky</h2>
        <p>
          3.1. Platba za jednorazový vstup sa realizuje vopred, pri zakúpení cez
          aplikáciu alebo na recepcii.
        </p>
        <p>
          3.2. Mesačné permanentky sú splatné vždy na začiatku každého
          kalendárneho mesiaca.
        </p>
        <p>
          3.3. Ročné permanentky sú hradené jednorazovo vopred alebo podľa
          dohody.
        </p>
        <p>
          3.4. Prevádzkovateľ si vyhradzuje právo zmeniť cenník. O zmene bude
          Člen informovaný minimálne 30 dní vopred.
        </p>
        <p>
          3.5. Zakúpené vstupy a permanentky nie sú refundovateľné, okrem
          prípadov vyšších moci alebo preukázaného zdravotného dôvodu.
        </p>
      </section>

      <section id="zrusenie-a-pozastavenie-clenstva" className="scroll-mt-32">
        <h2>4. Zrušenie a pozastavenie členstva</h2>
        <p>
          4.1. Člen môže požiadať o zrušenie mesačnej permanentky s výpovednou
          lehotou 30 dní, a to písomne na emailovú adresu prevádzkovateľa.
        </p>
        <p>
          4.2. Ročnú permanentku nie je možné predčasne zrušiť s nárokom na
          vrátenie nevyčerpanej časti, s výnimkou zdravotných dôvodov doložených
          lekárskym potvrdením.
        </p>
        <p>
          4.3. Prevádzkovateľ si vyhradzuje právo okamžite ukončiť členstvo pri
          hrubom porušení VOP alebo Prevádzkového poriadku, bez nároku na
          vrátenie poplatku.
        </p>
      </section>

      <section id="zodpovednost" className="scroll-mt-32">
        <h2>5. Zodpovednosť a odmietnutie zodpovednosti</h2>
        <p>
          5.1. Prevádzkovateľ nezodpovedá za zranenia vzniknuté nedodržaním
          Prevádzkového poriadku, nesprávnym cvičením alebo ignorovaním pokynov
          personálu.
        </p>
        <p>
          5.2. Prevádzkovateľ nezodpovedá za odcudzenie ani poškodenie osobných
          vecí návštevníkov vo fitnescentre.
        </p>
        <p>
          5.3. Každý Návštevník vstupuje do priestorov na vlastnú zodpovednosť a
          potvrdzuje, že jeho zdravotný stav mu dovoľuje fyzickú aktivitu.
        </p>
        <p>
          5.4. Prevádzkovateľ odporúča pred začatím cvičenia absolvovať lekársku
          prehliadku.
        </p>
      </section>

      <section id="zaverecne-ustanovenia" className="scroll-mt-32">
        <h2>6. Záverečné ustanovenia</h2>
        <p>6.1. Tieto VOP sa riadia právnym poriadkom Slovenskej republiky.</p>
        <p>
          6.2. Prevádzkovateľ si vyhradzuje právo VOP kedykoľvek zmeniť.
          Aktuálna verzia je vždy dostupná na webovej stránke tap-it.sk.
        </p>
        <p>
          6.3. V prípade sporov sa zmluvné strany zaväzujú riešiť ich prednostne
          mimosúdnou cestou.
        </p>
      </section>
    </LegalDocumentPage>
  );
}
