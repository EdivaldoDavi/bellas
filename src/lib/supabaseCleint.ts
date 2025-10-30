import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ⚠️ Verificação de variáveis obrigatórias
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ ERRO: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY estão ausentes no .env'
  );
}

// ✅ Exporta o client pronto para uso
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,         // mantém o login ao recarregar a página
    autoRefreshToken: true,       // renova tokens automaticamente
    detectSessionInUrl: true,     // necessário se usar redirecionamento OAuth
  },
});

// ✅ Helper opcional: obter usuário logado
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ✅ Helper opcional: obter perfil do usuário (da tabela profiles)
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle(); // <-- troca single() por maybeSingle() para evitar erro interno

  if (error) {
    console.error('Erro ao buscar profile:', error);
    return null;
  }

  return data;
}
