export type UserRole = "user" | "trainer" | "recepcny" | "manager" | "owner";

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
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  is_verified: boolean;
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
  description: string;
  benefits: string[];
  display_order: number;
  is_highlighted: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
  created_at: string;
  membership?: Membership;
}

export type BookableServiceType = "group" | "trainer" | "facility";
export type BookingStatus = "pending" | "paid" | "cancelled" | "refunded";

export interface BookableService {
  id: string;
  name: string;
  type: BookableServiceType;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  capacity: number | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ServiceSchedule {
  id: string;
  service_id: string;
  trainer_id: string | null;
  profiles?: Pick<Profile, "full_name" | "avatar_url" | "bio"> | null;
  recurring_rule_id?: string | null;
  booking_status?: BookingStatus | null;
  booking_user_id?: string | null;
  start_time: string;
  end_time: string;
  current_capacity: number | null;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  schedule_id: string | null;
  start_time: string;
  end_time: string;
  total_price: number;
  status: BookingStatus;
  stripe_pi_id: string | null;
  stripe_refund_id: string | null;
  stripe_pi_cancelled_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface GymNews {
  id: string;
  title: string;
  content_html: string;
  image_url: string | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export type StaffShiftStatus = "pending" | "approved" | "rejected" | "cancelled";
export type StaffShiftSeriesStatus = "active" | "cancelled";

export interface StaffShiftCoverageRule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  required_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffShiftSeries {
  id: string;
  assignee_id: string;
  created_by: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  status: StaffShiftSeriesStatus;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface StaffShift {
  id: string;
  assignee_id: string;
  series_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  status: StaffShiftStatus;
  requested_by: string;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}
