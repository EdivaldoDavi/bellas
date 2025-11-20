// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// ⚠️ Verificação (somente desenvolvimento)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERRO: SUPABASE_URL ou SUPABASE_ANON_KEY ausentes no .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // mantém sessão no localStorage
    autoRefreshToken: true,    // renova tokens em background
    detectSessionInUrl: true,  // necessário para email de confirmação
  },
});

/* ============================================================
   GET CURRENT SESSION
   ============================================================ */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn("⚠ erro getSession:", error);
    return null;
  }

  return data.session;
}

/* ============================================================
   GET CURRENT USER
   ============================================================ */
export async function getCurrentUser() {
  const session = await getCurrentSession();
  if (!session) return null;
  return session.user;
}

/* ============================================================
   GET CURRENT PROFILE (tabela profiles)
   Segurança: não dá erro se perfil não existir.
   ============================================================ */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null; // ← não está logado

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle(); // ← seguro: não quebra se não existir

  if (error) {
    console.warn("⚠ erro ao buscar profile:", error.message);
    return null;
  }

  return data;
}

/* ============================================================
   MANUAL LOGOUT (SEGURO — sem loop infinito)
   ============================================================ */
export async function logout() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (e) {}

  // 🚨 Limpando cache do AuthProvider
  window.localStorage.removeItem("sb-SESSION"); // ajusta se necessário
  window.localStorage.removeItem("bellas-profile");
  window.localStorage.removeItem("bellas-tenant");

  // Notify context listeners
  window.dispatchEvent(new Event("supabase-signout"));

  window.location.replace("/login?logged_out=1");
}
