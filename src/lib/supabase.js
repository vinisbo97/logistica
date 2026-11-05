import { createClient } from '@supabase/supabase-js';

// Força a conexão prioritária com o projeto oficial ativo onde os usuários e dados estão cadastrados
const OFFICIAL_SUPABASE_URL = 'https://gurxvvvlhywwdgznvrqc.supabase.co';
const OFFICIAL_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cnh2dnZsaHl3d2Rnem52cnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODY3NzYsImV4cCI6MjEwODE2Mjc3Nn0.6isigbOeolMe39u2GCKgwT2l73yXGECN19SnFmRO1ac';

const supabaseUrl =
  process.env.NEXT_PUBLIC_PSLOG_SUPABASE_URL ||
  OFFICIAL_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_PSLOG_SUPABASE_ANON_KEY ||
  OFFICIAL_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
