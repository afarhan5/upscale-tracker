-- Trigger to automatically create a User profile when a user signs up on Supabase Auth
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
as $$
begin
  insert into public."User" (id, name, email, role, plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    new.email,
    'user',
    'free'
  );
  return new;
end;
$$ language plpgsql;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
