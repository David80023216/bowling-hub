const SUPABASE_URL = 'https://owmxuipqvwjfbnhxghra.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IPXRvF_-g_EVPCm3ouKSSw_Cc1twGd3';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.sb = supabaseClient;
