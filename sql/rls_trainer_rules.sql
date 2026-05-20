-- Povolíme trénerom čítať, pridávať a mazať ich vlastné recurring_rules a service_schedules
create policy "Trainers can manage their own recurring_rules" 
  on public.recurring_rules 
  for all 
  using (auth.uid() = trainer_id) 
  with check (auth.uid() = trainer_id);

create policy "Trainers can manage their own service_schedules" 
  on public.service_schedules 
  for all 
  using (auth.uid() = trainer_id) 
  with check (auth.uid() = trainer_id);
