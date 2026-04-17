export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: "strength" | "fitness" | "fat_loss" | "mobility" | "mixed" | null;
  experience_level: "beginner" | "intermediate" | "advanced" | null;
  sessions_per_week: number | null;
  session_length_min: number | null;
  equipment_level: "none" | "basic" | "full_gym" | null;
  show_in_gym_list: boolean;
  show_name_in_gym_list: boolean;
  show_avatar_in_gym_list: boolean;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  role: UserRole;
  gdpr_consent_at: string;
  created_at: string;
}

export interface Membership {
  id: string;
  name: string;
  billing_cycle: "entries" | "monthly" | "yearly";
  entry_count: number | null;
  duration_days: number | null;
  is_single_entry: boolean;
  price: number;
  created_at: string;
}

export interface UserMembership {
  id: string;
  user_id: string;
  membership_id: string;
  start_date: string;
  end_date: string | null;
  entries_remaining: number | null;
  status: "active" | "expired" | "cancelled" | "suspended";
  activated_by_admin: boolean;
  created_at: string;
  membership?: Membership;
}

export interface Entry {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  duration_min: number | null;
  is_valid: boolean;
}

export type QrTokenStatus = "active" | "checked_in" | "used" | "expired";

export interface QrToken {
  id: string;
  user_id: string;
  token: string;
  hmac_signature: string;
  status: QrTokenStatus;
  created_at: string;
  expires_at: string;
  checked_in_at: string | null;
  used_at: string | null;
}

export interface GymSettings {
  id: string;
  gym_name: string;
  max_capacity: number;
  max_entries_per_day: number;
  updated_at: string;
}

export interface PopularHoursCache {
  hour_of_day: number;
  day_of_week: number;
  avg_visits: number;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: "visit_count" | "streak" | "duration";
  condition_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  created_at: string;
}
