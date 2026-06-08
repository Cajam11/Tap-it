"use client";

import { useState } from "react";
import { CalendarDays, Plus, Repeat } from "lucide-react";
import AdminCalendarView from "@/components/admin/AdminCalendarView";
import GroupClassRulesManager from "@/components/admin/GroupClassRulesManager";

type BookingItem = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  bookable_services?: {
    name: string;
  };
  profiles?: {
    full_name: string | null;
    email?: string | null;
  };
};

type GroupService = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  capacity: number | null;
  metadata: Record<string, unknown> | null;
};

type TrainerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type RecurringRule = {
  id: string;
  service_id: string;
  trainer_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active_until: string | null;
};

type AdminBookingsWorkspaceProps = {
  bookings: BookingItem[];
  services: GroupService[];
  trainers: TrainerOption[];
  rules: RecurringRule[];
};

export type GroupClassPanelMode = "calendar" | "recurring" | "new";

export default function AdminBookingsWorkspace({
  bookings,
  services,
  trainers,
  rules,
}: AdminBookingsWorkspaceProps) {
  const [panelMode, setPanelMode] = useState<GroupClassPanelMode>("calendar");
  const [newClassVersion, setNewClassVersion] = useState(0);

  const openNewClass = () => {
    setPanelMode("new");
    setNewClassVersion((version) => version + 1);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Bookings & Calendar</h1>
          <p className="text-white/60">
            Manage all bookings, classes, and schedules across the gym.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPanelMode("calendar")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              panelMode === "calendar"
                ? "border-white/20 bg-white/20 text-white"
                : "border-white/10 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setPanelMode("recurring")}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              panelMode === "recurring"
                ? "border-white/20 bg-white/20 text-white"
                : "border-white/10 bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Repeat className="h-4 w-4" />
            Recurring Class
          </button>
          <button
            type="button"
            onClick={openNewClass}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              panelMode === "new" ? "bg-red-500" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            <Plus className="h-4 w-4" />
            New Class
          </button>
        </div>
      </div>

      <div className="md:h-[calc(100vh-12rem)] md:overflow-y-auto md:pr-2">
        {panelMode === "calendar" ? (
          <AdminCalendarView initialBookings={bookings} />
        ) : (
          <GroupClassRulesManager
            mode={panelMode}
            newClassVersion={newClassVersion}
            services={services}
            trainers={trainers}
            rules={rules}
            onModeChange={setPanelMode}
          />
        )}
      </div>
    </div>
  );
}
