"use client";

import { useState } from "react";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingItem {
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
}

interface AdminCalendarViewProps {
  initialBookings: BookingItem[];
}

export default function AdminCalendarView({ initialBookings }: AdminCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Ponedelok first
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white capitalize">
          {format(currentDate, dateFormat)}
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-2 rounded hover:bg-white/10 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 rounded hover:bg-white/10 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Week days labels */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
        {weekDays.map((day, i) => (
          <div key={i} className="py-2 text-center text-xs font-semibold text-white/50">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const isSelectedMonth = isSameMonth(day, monthStart);
          
          // Získanie rezervácií pre daný deň
          const dayBookings = initialBookings.filter(b => 
            isSameDay(new Date(b.start_time), day)
          );

          return (
            <div 
              key={day.toString()} 
              className={`min-h-[120px] p-2 border-r border-b border-white/5 ${
                !isSelectedMonth ? "bg-white/[0.01] text-white/30" : "bg-[#1a1a1a] text-white/80"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday(day) ? "bg-red-600 text-white" : ""
                }`}>
                  {format(day, "d")}
                </span>
              </div>
              
              <div className="space-y-1">
                {dayBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    className={`text-xs p-1.5 rounded transition-colors cursor-pointer truncate border ${
                      booking.status === 'paid' 
                        ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20' 
                        : booking.status === 'pending'
                        ? 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    title={`${booking.bookable_services?.name || "Booking"} - ${booking.profiles?.full_name || ""}`}
                  >
                    <div className="font-semibold text-white">{format(new Date(booking.start_time), "HH:mm")}</div>
                    <div className="text-white/70 truncate">{booking.bookable_services?.name}</div>
                    <div className="text-white/50 truncate">{booking.profiles?.full_name || ""}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}