import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import Link from "next/link";
import NavBarAuth from "@/components/NavBarAuth";
import LegalPdfButton from "@/components/legal/LegalPdfButton";
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
      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-20 pt-32 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[600px] w-[600px] rounded-full bg-red-600/10 blur-[150px]" />
        <div className="pointer-events-none absolute right-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative mx-auto w-full max-w-5xl">
          <header className="mb-12 border-b border-white/10 pb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500/80">
              Informácie
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-white/60">
              {subtitle}
            </p>
            <p className="mt-1 text-sm text-white/40">
              Posledná aktualizácia: {effectiveDate}
            </p>
          </header>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
            <aside className="w-full lg:w-64 shrink-0">
              <div className="sticky top-32 space-y-4">
                <p className="text-xs font-semibold tracking-wider text-white/30 uppercase">
                  Obsah dokumentu
                </p>
                <nav
                  aria-label="Obsah dokumentu"
                  className="flex flex-col gap-2 relative"
                >
                  {/* Subtle left border for TOC */}
                  <div className="absolute left-0 top-1 bottom-1 w-px bg-white/5" />

                  {toc.map((item, index) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="group flex items-start gap-3 text-sm text-white/50 hover:text-white transition-colors pl-4 relative"
                    >
                      <span className="font-semibold text-white/70 group-hover:text-red-400 transition-colors">
                        {index + 1}.
                      </span>
                      <span className="leading-snug">{item.label}</span>
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <div className="flex-1">
              <div
                className="space-y-12 text-base leading-relaxed text-white/75 
                [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:tracking-tight [&_h2]:mb-4 [&_h2]:mt-0 
                [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white/90 [&_h3]:mt-8 [&_h3]:mb-3
                [&_section]:scroll-mt-36 [&_section]:pb-8 [&_section]:border-b [&_section]:border-white/5 [&_section:last-child]:border-0
                [&_p]:mb-4 [&_p:last-child]:mb-0
                [&_a]:text-red-400 [&_a]:transition-colors hover:[&_a]:text-red-300"
              >
                {children}
              </div>

              <div className="mt-16 flex items-center justify-between border-t border-white/10 pt-8 text-sm text-white/50">
                <div className="flex gap-8">
                  {footerLinks.map((item) => (
                    <span
                      key={item.href}
                      className="inline-flex items-center gap-2"
                    >
                      {item.direction === "left" ? "←" : ""}
                      <Link
                        href={item.href}
                        className="hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                      {item.direction === "right" ? "→" : ""}
                    </span>
                  ))}
                </div>
                <div className="shrink-0">
                  <LegalPdfButton />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
