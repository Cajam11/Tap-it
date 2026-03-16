import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const onboardingCompleted = user.user_metadata?.onboarding_completed === true;
  if (onboardingCompleted) {
    redirect("/");
  }

  const initialFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] ?? "";

  const initialAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return (
    <main className="relative min-h-screen bg-black flex flex-col justify-center items-center px-4 py-10 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-900/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
        
        {/* Left side text / Branding */}
        <div className="flex-1 w-full max-w-xl text-center lg:text-left space-y-8">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/80 font-medium">
            Vitaj v Premium<span className="text-red-500 ml-1">Gyms</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-extrabold text-white tracking-tight leading-[1.1]">
            Tvoja cesta začína<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">
              práve tu.
            </span>
          </h1>
          
          <p className="text-lg text-white/60 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Prispôsob si profil podľa seba a získaj tréningový zážitok šitý presne na mieru tvojim cieľom.
          </p>
          
          <div className="hidden lg:grid grid-cols-2 gap-5 pt-4 max-w-md">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <span className="text-2xl">🔥</span>
              <h3 className="text-white font-semibold">Personalizácia</h3>
              <p className="text-sm text-white/50 leading-relaxed">Tréningy presne podľa tvojich cieľov a skúseností.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2">
              <span className="text-2xl">🏆</span>
              <h3 className="text-white font-semibold">Progres</h3>
              <p className="text-sm text-white/50 leading-relaxed">Sleduj svoje zlepšenie a udrž si motiváciu.</p>
            </div>
          </div>
        </div>

        {/* Right side Wizard */}
        <div className="w-full max-w-xl lg:max-w-2xl flex-shrink-0">
          <OnboardingWizard
            initialFullName={initialFullName}
            initialAvatarUrl={initialAvatarUrl}
          />
        </div>

      </div>
    </main>
  );
}
