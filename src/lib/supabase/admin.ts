import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  StaffShift,
  StaffShiftCoverageRule,
  StaffShiftSeries,
  StaffShiftSeriesStatus,
  StaffShiftStatus,
} from "@/lib/types";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AdminDatabase = {
  public: {
    Tables: {
      memberships: {
        Row: {
          id: string;
          name: string;
          billing_cycle: "entries" | "monthly" | "yearly" | null;
          entry_count: number | null;
          duration_days: number | null;
          is_single_entry: boolean | null;
          price: number | null;
          description: string | null;
          benefits: string[] | null;
          display_order: number | null;
          is_highlighted: boolean | null;
          is_active: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          billing_cycle: "entries" | "monthly" | "yearly";
          entry_count?: number | null;
          duration_days?: number | null;
          is_single_entry?: boolean;
          price: number;
          description?: string;
          benefits?: string[];
          display_order?: number;
          is_highlighted?: boolean;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          billing_cycle?: "entries" | "monthly" | "yearly";
          entry_count?: number | null;
          duration_days?: number | null;
          is_single_entry?: boolean;
          price?: number;
          description?: string;
          benefits?: string[];
          display_order?: number;
          is_highlighted?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: string | null;
          onboarding_completed: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          onboarding_completed?: boolean | null;
          created_at?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string | null;
          onboarding_completed?: boolean | null;
          created_at?: string;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          check_in: string;
          check_out: string | null;
          duration_min: number | null;
          is_valid: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          check_in?: string;
          check_out?: string | null;
          duration_min?: number | null;
          is_valid?: boolean;
        };
        Update: {
          user_id?: string;
          check_in?: string;
          check_out?: string | null;
          duration_min?: number | null;
          is_valid?: boolean;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string | null;
          membership_id: string | null;
          amount: number | null;
          currency: string | null;
          type: string | null;
          status: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          membership_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          type?: string | null;
          status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          membership_id?: string | null;
          amount?: number | null;
          currency?: string | null;
          type?: string | null;
          status?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_memberships: {
        Row: {
          id: string;
          user_id: string;
          membership_id: string;
          start_date: string;
          end_date: string | null;
          entries_remaining: number | null;
          status: string | null;
          activated_by_admin: boolean | null;
          stripe_payment_intent_id: string | null;
          stripe_refund_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          membership_id: string;
          start_date: string;
          end_date?: string | null;
          entries_remaining?: number | null;
          status?: string | null;
          activated_by_admin?: boolean | null;
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
        };
        Update: {
          user_id?: string;
          membership_id?: string;
          start_date?: string;
          end_date?: string | null;
          entries_remaining?: number | null;
          status?: string | null;
          activated_by_admin?: boolean | null;
          stripe_payment_intent_id?: string | null;
          stripe_refund_id?: string | null;
        };
        Relationships: [];
      };
      staff_shift_coverage_rules: {
        Row: StaffShiftCoverageRule;
        Insert: {
          id?: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          required_count?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          required_count?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_shift_series: {
        Row: StaffShiftSeries;
        Insert: {
          id?: string;
          assignee_id: string;
          created_by: string;
          start_date: string;
          end_date: string;
          days_of_week: number[];
          start_time: string;
          end_time: string;
          status?: StaffShiftSeriesStatus;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
        };
        Update: {
          assignee_id?: string;
          created_by?: string;
          start_date?: string;
          end_date?: string;
          days_of_week?: number[];
          start_time?: string;
          end_time?: string;
          status?: StaffShiftSeriesStatus;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
        Relationships: [];
      };
      staff_shifts: {
        Row: StaffShift;
        Insert: {
          id?: string;
          assignee_id: string;
          series_id?: string | null;
          work_date: string;
          start_time: string;
          end_time: string;
          status?: StaffShiftStatus;
          requested_by: string;
          created_by: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assignee_id?: string;
          series_id?: string | null;
          work_date?: string;
          start_time?: string;
          end_time?: string;
          status?: StaffShiftStatus;
          requested_by?: string;
          created_by?: string;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let adminClient: SupabaseClient<AdminDatabase> | null = null;

function requireEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env variable`);
  }

  return value;
}

export function createAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient<AdminDatabase>(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClient as unknown as SupabaseClient;
}
