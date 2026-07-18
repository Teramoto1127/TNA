import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Supabaseの環境変数が設定されていません。.env.example を参考に .env を作成してください。'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);