-- Keamanan: nyalakan Row Level Security (RLS) untuk SEMUA tabel public.
--
-- Konteks: anon key Supabase (NEXT_PUBLIC, ada di bundle browser) sebelumnya
-- punya akses penuh baca/tulis karena RLS mati. App sendiri mengakses data
-- via DATABASE_URL (role postgres = table owner) yang BYPASS RLS otomatis,
-- jadi fitur app tidak terpengaruh. Tanpa policy apapun, RLS enabled =
-- deny-all untuk role non-owner (anon/authenticated) -> celah tertutup.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sub_features" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "blocked_ips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "llm_settings" ENABLE ROW LEVEL SECURITY;
