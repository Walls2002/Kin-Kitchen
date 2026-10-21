export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Demo mode runs on in-memory sample data whenever Supabase is not configured. */
export const isDemo = !supabaseUrl || !supabaseAnonKey;
