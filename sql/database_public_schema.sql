-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone,
  duration_min integer CHECK (duration_min IS NULL OR duration_min >= 0),
  is_valid boolean NOT NULL DEFAULT true,
  CONSTRAINT entries_pkey PRIMARY KEY (id),
  CONSTRAINT entries_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  billing_cycle text NOT NULL CHECK (billing_cycle = ANY (ARRAY['entries'::text, 'monthly'::text, 'yearly'::text])),
  entry_count integer CHECK (entry_count IS NULL OR entry_count > 0),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  is_single_entry boolean NOT NULL DEFAULT false,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  goal text,
  experience_level text,
  sessions_per_week integer,
  session_length_min integer,
  equipment_level text,
  onboarding_completed boolean DEFAULT false,
  onboarding_completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  email text,
  height_cm integer,
  weight_kg numeric,
  show_in_gym_list boolean NOT NULL DEFAULT true,
  show_name_in_gym_list boolean NOT NULL DEFAULT false,
  show_avatar_in_gym_list boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'recepcny'::text, 'manager'::text, 'owner'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  membership_id uuid,
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  currency text NOT NULL DEFAULT 'EUR'::text,
  type text NOT NULL CHECK (type = ANY (ARRAY['purchase'::text, 'refund'::text])),
  status text NOT NULL CHECK (status = ANY (ARRAY['completed'::text, 'pending'::text, 'failed'::text])),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id)
);
CREATE TABLE public.user_memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  entries_remaining integer CHECK (entries_remaining IS NULL OR entries_remaining >= 0),
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text])),
  activated_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_memberships_pkey PRIMARY KEY (id),
  CONSTRAINT user_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_memberships_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id)
);
CREATE TABLE public.weight_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT weight_logs_pkey PRIMARY KEY (id),
  CONSTRAINT weight_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);