// src/pages/auth/Login.tsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { useTheme } from "../../hooks/useTheme";
import { useBrandColor } from "../../hooks/useBrandColor";
import { supabase } from "../../lib/supabaseCleint";
import styles from "./Auth.module.css";
import { toast } from "react-toastify";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  // 🔹 Estados do reset de senha
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  const { theme, toggleTheme } = useTheme();
  const { brandColor } = useBrandColor();

  /* 🎨 Aplicar tema + cor primária */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);

  /* Mensagens da URL */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("logged_out") === "1") {
      toast.success("Sessão encerrada com sucesso!");
      window.history.replaceState({}, "", "/login");
    }

    if (params.get("checkEmail") === "1") {
      toast.info("Verifique seu email para confirmar o cadastro.");
    }

    if (params.get("confirmed") === "1") {
      toast.success("Email confirmado! Faça login.");
    }
  }, []);

  /* Redireciona se já estiver logado */
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  /* LOGIN */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signIn(email.trim(), senha);
    } catch (err: any) {
      if (err?.message?.includes("Invalid login credentials")) {
        setError("Email ou senha inválidos.");
      } else {
        setError(err?.message || "Erro ao fazer login.");
      }
    }
  };

  /* RESET PASSWORD */
  const handleResetPassword = async () => {
    const targetEmail = resetEmail.trim() || email.trim();

    if (!targetEmail) {
      toast.warn("Informe o email para redefinir a senha.");
      return;
    }

    setResetLoading(true);

    try {
      const redirectTo = `${window.location.origin}/force-reset`;

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo,
      });

      if (error) throw error;

      toast.success("Enviamos um link de redefinição para seu email.");
      setShowReset(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar o link de redefinição.");
    }

    setResetLoading(false);
  };

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>

        <h2 className={styles.loginTitle}>LOGIN</h2>

        <form onSubmit={handleSubmit}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {/* ---------------------- RESET BLOCK ---------------------- */}
          <button
            type="button"
            className={styles.forgotPassword}
            onClick={() => setShowReset((p) => !p)}
          >
            Esqueceu a senha?
          </button>

          {showReset && (
            <div className={styles.resetBox}>
              <input
                type="email"
                placeholder="Seu email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <button
                type="button"
                className={styles.resetButton}
                disabled={resetLoading}
                onClick={handleResetPassword}
              >
                {resetLoading ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </div>
          )}
          {/* ---------------------------------------------------------- */}

          <button type="submit" disabled={!email || !senha || loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className={styles.linkText}>
          Ainda não tem conta? <Link to="/register">Registrar</Link>
        </p>

        <div className={styles.themeToggleWrapper}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "🌞 Light Mode"}
          </button>
        </div>

      </div>
    </div>
  );
}
