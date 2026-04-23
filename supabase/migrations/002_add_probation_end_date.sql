ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS probation_end_date DATE;
