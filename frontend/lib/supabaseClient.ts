import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://grtvvyddeckehqbfxlav.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_fhjloISIZIvkECtzCjWPaQ_ydw6qSG0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);