-- Local development only. `supabase start` and `supabase db reset` run this after the
-- migrations; `supabase db push` never does, so nothing here reaches the cloud project.

-- The API's local login (matches apps/api's default DATABASE_URL). Cloud passwords are set
-- by hand and live only in Doppler.
alter role myapp_api with password 'myapp_api';
