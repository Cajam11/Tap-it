import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import Link from "next/link";
import NavBarAuth from "@/components/NavBarAuth";
import LegalPdfButton from "@/components/legal/LegalPdfButton";
import LegalSidebarToc from "@/components/legal/LegalSidebarToc";
import type { ReactNode } from "react";

type LegalDocumentPageProps = {
  title: string;
  subtitle: string;
  effectiveDate: string;
  toc: Array<{ href: string; label: string }>;
  footerLinks: Array<{
    href: string;
    label: string;
    direction?: "left" | "right";
  }>;
  children: ReactNode;
};

export default async function LegalDocumentPage({
  title,
  subtitle,
  effectiveDate,
  toc,
  footerLinks,
  children,
}: LegalDocumentPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let navUser = null;
  let navProfile = null;
  let isAdmin = false;

  if (user) {
    const [profileResponse, adminContext] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, role")
        .eq("id", user.id)
        .maybeSingle(),
      getCurrentAdminContext(supabase),
    ]);

    const { data: profile } = profileResponse;
    isAdmin = adminContext.isAdmin;

    navUser = {
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

    navProfile = {
      full_name:
        typeof profile?.full_name === "string" ? profile.full_name : null,
      avatar_url:
        typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
    };
  }

  return (
    <>
      <NavBarAuth
        navLinks={[]}
        initialUser={navUser}
        initialProfile={navProfile}
        isAdmin={isAdmin}
      />
      <main className="relative h-[100dvh] flex flex-col overflow-hidden bg-[#080808] text-white">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[150px]" />
        <div className="pointer-events-none absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative mx-auto w-full max-w-6xl flex-1 flex flex-col min-h-0 pt-28 px-4 sm:px-6 lg:px-8">
          <header className="shrink-0 mb-8 border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500/90 mb-3">
                Informácie
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
                {title}
              </h1>
              <p className="text-lg font-medium text-white/60">
                {subtitle}
              </p>
            </div>
            <div className="text-left md:text-right shrink-0 pb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/30 mb-1">
                Posledná aktualizácia
              </p>
              <p className="text-sm font-medium text-white/50">{effectiveDate}</p>
            </div>
          </header>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 flex-1 min-h-0">
            <aside className="w-full lg:w-72 shrink-0 overflow-y-auto pr-4 flex flex-col gap-8 pb-8 pt-2">
              <div className="space-y-5">
                <p className="text-xs font-bold tracking-wider text-white/30 uppercase">
                  Obsah dokumentu
                </p>
                <LegalSidebarToc toc={toc} />
              </div>

              <div className="pt-8 border-t border-white/10 flex flex-col gap-6 mt-4">
                <div>
                  <LegalPdfButton />
                </div>
                <div className="flex flex-col gap-3 text-sm font-medium text-white/50">
                  {footerLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="hover:text-red-400 transition-colors inline-flex items-center gap-2 group"
                    >
                      {item.direction === "left" && <span className="group-hover:-translate-x-1 transition-transform">←</span>}
                      {item.label}
                      {item.direction === "right" && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>

            <div id="document-scroll-container" className="flex-1 overflow-y-auto pr-4 pb-20 pt-2">
              <div
                className="max-w-3xl space-y-12 text-[1.05rem] leading-relaxed text-white/80 
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:tracking-tight [&_h2]:mb-6 [&_h2]:mt-0 
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white/90 [&_h3]:mt-8 [&_h3]:mb-4
                [&_section]:scroll-mt-36 [&_section]:pb-10 [&_section]:border-b [&_section]:border-white/5 [&_section:last-child]:border-0
                [&_p]:mb-5 [&_p:last-child]:mb-0
                [&_a]:text-red-400 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-red-300 transition-colors"
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
