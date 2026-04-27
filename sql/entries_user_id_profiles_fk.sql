-- Add foreign key from entries.user_id to profiles.id (idempotent)
-- This allows PostgREST to infer the relationship for the 'profiles:user_id' select syntax

ALTER TABLE public.entries DROP CONSTRAINT IF EXISTS entries_user_id_fkey;
ALTER TABLE public.entries ADD CONSTRAINT entries_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create index for join performance
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON public.entries(user_id);
