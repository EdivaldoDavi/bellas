// src/pages/auth/Login.tsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { useTheme } from "../../hooks/useTheme";
import { useBrandColor } from "../../hooks/useBrandColor";
import styles from "./Auth.module.css";
import { toast } from "react-toastify";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  // 🎨 Tema + BrandColor
  const { theme, toggleTheme } = useTheme();
  const { brandColor } = useBrandColor();

  /* ============================================================
     🔥 Aplicar tema e cor primária no HTML
  ============================================================ */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);

  /* ============================================================
     🔄 Mensagens
  ============================================================ */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("logged_out") === "1") {
      toast.success("Sessão encerrada com sucesso! 👋");
      params.delete("logged_out");
      window.history.replaceState({}, "", "/login");
    }

    if (params.get("checkEmail") === "1") {
      toast.info("Enviamos um email de confirmação! Verifique sua caixa de entrada.");
    }

    if (params.get("confirmed") === "1") {
      toast.success("Email confirmado! Faça login para continuar.");
    }
  }, []);

  /* ============================================================
     🔁 Redirecionar se já estiver logado
  ============================================================ */
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  /* ============================================================
     🚪 Login
  ============================================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signIn(email.trim(), senha);
    } catch (err: any) {
      console.error("Erro no login:", err);
      if (err?.message?.includes("Invalid login credentials")) {
        setError("Credenciais inválidas. Verifique email e senha.");
      } else {
        setError(err?.message || "Erro ao fazer login.");
      }
    }
  };

  /* ============================================================
     JSX
  ============================================================ */
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
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
          />

          <button type="submit" disabled={!email || !senha || loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className={styles.linkText}>
          Ainda não tem conta? <Link to="/register">Registrar</Link>
        </p>

        {/* Alternador de tema dentro da tela de login */}
        <div className={styles.themeToggleWrapper}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "🌞 Light Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}
