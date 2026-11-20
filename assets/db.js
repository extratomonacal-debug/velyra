import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
export const configured = /^https:\/\/[-a-z0-9]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY.length > 10;
export const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true } }) : null;
