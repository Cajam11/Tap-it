import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";
export const metadata = {
  title: "Transakcie | Tap-it",
  description: "História vašich nákupov a transakcií",
};

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const NAV_LINKS: [string, string][] = [];

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  // Získame transakcie s detailmi o členstve a tiež profil
  const [profileRes, { data: transactions, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("transactions")
    .select(
      `
      id,
      amount,
      currency,
      type,
      status,
      created_at,
      metadata,
      memberships (
        name
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }),
  ]);

  if (error) {
    console.error("Chyba pri načítaní transakcií:", error);
  }

  type Transaction = NonNullable<typeof transactions>[number];

  const navProfile = {
    full_name: typeof profileRes.data?.full_name === "string" ? profileRes.data.full_name : null,
    avatar_url: typeof profileRes.data?.avatar_url === "string" ? profileRes.data.avatar_url : null,
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "purchase":
        return "bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 cursor-default";
      case "refund":
        return "bg-orange-500/10 text-orange-400 ring-1 ring-inset ring-orange-500/20";
      default:
        return "bg-white/5 text-white/60";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-400 font-medium";
      case "pending":
        return "text-yellow-400 font-medium";
      case "failed":
        return "text-red-400 font-medium";
      default:
        return "text-white/60";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("sk-SK", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getMetadataObject = (metadata: Transaction["metadata"]) => {
    return metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  };

  const getTransactionReason = (tx: Transaction) => {
    const metadata = getMetadataObject(tx.metadata);
    return typeof metadata.reason === "string" ? metadata.reason : null;
  };

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">História transakcií</h1>
            <p className="text-white/60">Prehľad vašich nákupov, vrátení platieb a prihlásených členstiev.</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {(!transactions || transactions.length === 0) ? (
              <div className="p-12 text-center text-white/50">
                <p>Zatiaľ nemáte žiadne transakcie.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-xs text-white/60 uppercase tracking-wider border-b border-white/10">
                      <th className="px-6 py-5 font-medium">Dátum</th>
                      <th className="px-6 py-5 font-medium">Popis</th>
                      <th className="px-6 py-5 font-medium">Typ</th>
                      <th className="px-6 py-5 font-medium">Stav</th>
                      <th className="px-6 py-5 font-medium text-right">Suma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const reason = getTransactionReason(tx);
                      return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] border-b border-white/5 last:border-0 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                          {new Intl.DateTimeFormat("sk-SK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(tx.created_at))}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-white/90">
                              {(Array.isArray(tx.memberships) ? tx.memberships[0]?.name : (tx.memberships as { name: string })?.name) || "—"}
                            </span>
                            {reason && (
                              <span className="text-xs text-white/50 italic">
                                Dôvod: {reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyle(tx.type)}`}>
                            {(() => {
                              const metadata = typeof tx.metadata === 'object' ? tx.metadata : {};
                              const action = metadata?.action === 'cancel' ? 'cancel' : tx.type;
                              
                              const actionLabel: Record<string, string> = {
                                'cancel': 'Zrušenie',
                                'purchase': 'Nákup',
                                'refund': 'Vrátenie',
                                'manual': 'Manuálne',
                              };
                              
                              return actionLabel[action] || action;
                            })()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={getStatusStyle(tx.status)}>
                            {tx.status === "completed" ? "Dokončené" : tx.status === "pending" ? "Spracováva sa" : "Zlyhalo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-white/90">
                          {tx.type === "refund" ? "+" : "-"}{formatCurrency(tx.amount, tx.currency)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
