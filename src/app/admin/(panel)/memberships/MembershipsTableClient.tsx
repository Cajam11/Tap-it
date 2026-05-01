"use client";

import { useState } from "react";
import { AdminMembershipChangeModal } from "@/components/admin/AdminMembershipChangeModal";

interface MembershipsTableClientProps {
  filteredProfiles: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }>;
  membershipsByUserId: Map<
    string,
    {
      start_date: string;
      end_date: string | null;
      status: string | null;
      membership: { name: string } | { name: string }[] | null;
    }
  >;
}

type MembershipRecord = {
  name: string;
} | null;

type MembershipRow = {
  status: string | null;
  end_date: string | null;
};

// Utility functions moved to client component
function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString("sk-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateIso;
  }
}

function getMembershipRecord(
  membership: { name: string } | { name: string }[] | null,
): MembershipRecord {
  if (Array.isArray(membership)) {
    return membership[0] ?? null;
  }
  return membership;
}

function getMembershipPlanKey(membershipRecord: MembershipRecord) {
  if (membershipRecord?.name === "Mesačná") {
    return "monthly";
  }
  if (membershipRecord?.name === "Ročná") {
    return "yearly";
  }
  return "none";
}

function isExpiredMembership(row: MembershipRow | undefined) {
  if (!row || row.status !== "active") {
    return true;
  }
  if (!row.end_date) {
    return false;
  }
  return new Date(row.end_date).getTime() <= Date.now();
}

export function MembershipsTableClient({
  filteredProfiles,
  membershipsByUserId,
}: MembershipsTableClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [flashMessage, setFlashMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleOpenModal = (
    userId: string,
    userName: string,
    plan: string
  ) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName || "Neznámy užívateľ");
    setCurrentPlan(plan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
    setSelectedUserName("");
    setCurrentPlan("");
    // Clear flash message after 3 seconds
    if (flashMessage) {
      setTimeout(() => setFlashMessage(null), 3000);
    }
  };

  const handleSuccess = (message: string) => {
    setFlashMessage({ type: "success", message });
    setTimeout(() => setFlashMessage(null), 3000);
  };

  const handleError = (message: string) => {
    setFlashMessage({ type: "error", message });
  };

  return (
    <>
      {flashMessage && (
        <div className="mb-4">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              flashMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {flashMessage.message}
          </div>
        </div>
      )}

      <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Membership plan</th>
              <th className="px-4 py-3 font-medium">start_date</th>
              <th className="px-4 py-3 font-medium">end_date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Zatial tu nie su ziadne profily.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => {
                const membership = membershipsByUserId.get(profile.id);
                const hasCurrentMembership =
                  membership && !isExpiredMembership(membership);
                const membershipRecord = hasCurrentMembership
                  ? getMembershipRecord(membership?.membership)
                  : null;
                const currentMembershipPlan =
                  getMembershipPlanKey(membershipRecord);

                return (
                  <tr
                    key={profile.id}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-white">
                      {profile.full_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {profile.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {membershipRecord?.name ?? "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership
                        ? formatDate(membership!.start_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership && membership!.end_date
                        ? formatDate(membership!.end_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleOpenModal(
                            profile.id,
                            profile.full_name || "",
                            currentMembershipPlan
                          )
                        }
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10"
                      >
                        Change
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

      {selectedUserId && (
        <AdminMembershipChangeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userId={selectedUserId}
          userName={selectedUserName}
          currentPlan={currentPlan}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </>
  );
}
