import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase, logout } from "../lib/supabaseCleint"; // Importar logout
import type { Session, User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom"; // Import useNavigate

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
  const navigate = useNavigate(); // Initialize useNavigate

  /* ============================================================
     Função segura para atualizar sessão/usuário
     ============================================================ */
  const applySession = (newSession: Session | null) => {
    if (
      session?.access_token === newSession?.access_token &&
      session?.user?.id === newSession?.user?.id
    ) {
      console.log("AuthProvider: applySession - Session content identical, skipping update.");
      return;
    }
    console.log("AuthProvider: applySession - Updating session and user.");
    setSession(newSession);
    setUser(newSession?.user ?? null);
  };

  /* ============================================================
     Carregar sessão inicial
     ============================================================ */
  useEffect(() => {
    let active = true;
    console.log("AuthProvider: Initial load useEffect triggered.");

    const load = async () => {
      console.log("AuthProvider: Calling supabase.auth.getSession().");
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        console.log("AuthProvider: Initial load cancelled (component unmounted).");
        return;
      }
      if (error) console.error("AuthProvider: Erro getSession:", error);

      applySession(data.session ?? null);
      setLoading(false);
      console.log("AuthProvider: Initial load complete. Loading set to false. User:", data.session?.user?.id);
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  /* ============================================================
     Listener de mudanças de autenticação
     ============================================================ */
  let lastAuthEvent = 0;

  useEffect(() => {
    console.log("AuthProvider: onAuthStateChange useEffect triggered.");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("AuthProvider: Auth event:", event, "New Session User:", newSession?.user?.id);

      if (document.visibilityState === "hidden") {
        console.log("AuthProvider: Ignoring auth event (document hidden).");
        return;
      }

      const now = Date.now();
      if (event === "SIGNED_IN" && now - lastAuthEvent < 1200) {
        console.log("AuthProvider: Debouncing SIGNED_IN event.");
        return;
      }
      lastAuthEvent = now;

      /* ===== EVENTOS ===== */
      if (event === "SIGNED_OUT") {
        console.log("AuthProvider: SIGNED_OUT event detected. Navigating to /login.");
        applySession(null);
        navigate("/login?logged_out=1", { replace: true }); // Client-side navigation
        return;
      }

      applySession(newSession);
    });

    // REMOVIDO: Listener manual de logout forçado, pois não será mais disparado pelo supabaseClient.ts
    // const handler = () => {
    //   console.log("AuthProvider: supabase-signout event received.");
    //   applySession(null);
    // };
    // window.addEventListener("supabase-signout", handler);

    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChange subscription.");
      subscription.unsubscribe();
      // REMOVIDO: window.removeEventListener("supabase-signout", handler);
    };
  }, [navigate]); // Add navigate to dependencies

  /* ============================================================
     MÉTODOS DE AUTENTICAÇÃO
     ============================================================ */

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log("AuthProvider: signIn called. Setting loading to true.");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    console.log("AuthProvider: signIn complete. Setting loading to false.");
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    meta?: Record<string, any>
  ) => {
    setLoading(true);
    console.log("AuthProvider: signUp called. Setting loading to true.");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta ?? {},
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
      },
    });

    setLoading(false);
    console.log("AuthProvider: signUp complete. Setting loading to false.");
    if (error) throw error;
  };

  const signOut = async () => {
    setLoading(true);
    console.log("AuthProvider: signOut called. Setting loading to true.");

    // Agora, o signOut do AuthProvider chama o logout do supabaseClient.ts
    // que já não faz o window.location.replace.
    // A navegação será tratada pelo onAuthStateChange.
    await logout(); // Call the modified logout from supabaseClient.ts

    setLoading(false);
    console.log("AuthProvider: signOut complete. Setting loading to false.");
    // No need to dispatch event here, as logout() already handles the Supabase signOut.
    // The onAuthStateChange listener will catch the SIGNED_OUT event.
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