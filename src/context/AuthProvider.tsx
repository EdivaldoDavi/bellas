// src/context/AuthProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabaseCleint";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    meta?: Record<string, any>
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     Função segura para atualizar sessão/usuário
     ============================================================ */
  const applySession = (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
  };

  /* ============================================================
     Carregar sessão inicial
     ============================================================ */
  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) return;
      if (error) console.error("Erro getSession:", error);

      applySession(data.session ?? null);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  /* ============================================================
     Listener de mudanças de autenticação
     (com correção do bug de reload ao trocar de aba)
     ============================================================ */

  // Evita múltiplos eventos simultâneos
  let lastAuthEvent = 0;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);

      // 1) Ignora triggers quando o usuário apenas voltou da aba
      if (document.visibilityState === "hidden") {
        return;
      }

      // 2) Debounce: evita múltiplos SIGNED_IN seguidos
      const now = Date.now();
      if (now - lastAuthEvent < 1200) {
        return;
      }
      lastAuthEvent = now;

      /* ===== EVENTOS ===== */

      // Logout real
      if (event === "SIGNED_OUT") {
        applySession(null);
        return;
      }

      // Sessão inicial após logout → não forçar re-login
      if (event === "INITIAL_SESSION" && !session) {
        applySession(null);
        return;
      }

      // Login, force-reset, email-redirect etc.
      applySession(session);
    });

    /* Listener manual de logout forçado */
    const handler = () => applySession(null);
    window.addEventListener("supabase-signout", handler);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("supabase-signout", handler);
    };
  }, []);

  /* ============================================================
     MÉTODOS DE AUTENTICAÇÃO
     ============================================================ */

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    meta?: Record<string, any>
  ) => {
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta ?? {},
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      },
    });

    setLoading(false);
    if (error) throw error;
  };

  const signOut = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signOut({ scope: "local" });

    setLoading(false);
    if (error) throw error;

    // Notifica listeners
    window.dispatchEvent(new Event("supabase-signout"));
  };

  /* ============================================================
     PROVIDER
     ============================================================ */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
