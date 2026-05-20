-- Pridanie trainer_id k recurring_rules na viazanie opakovaných pravidiel na konkrétnych trénerov
ALTER TABLE public.recurring_rules
ADD COLUMN trainer_id UUID NULL REFERENCES public.profiles(id) ON DELETE CASCADE;
