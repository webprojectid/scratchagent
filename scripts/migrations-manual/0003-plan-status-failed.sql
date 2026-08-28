-- ALTER enum plan_status: tambah nilai 'failed' (fix Misi gagal: background generate bisa gagal)
ALTER TYPE plan_status ADD VALUE IF NOT EXISTS 'failed';
