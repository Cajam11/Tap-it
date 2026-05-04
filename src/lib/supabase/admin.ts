import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
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
        };
        Update: {
          user_id?: string;
          membership_id?: string;
          start_date?: string;
          end_date?: string | null;
          entries_remaining?: number | null;
          status?: string | null;
          activated_by_admin?: boolean | null;
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

export function createAdminClient() {
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

  return adminClient;
}
