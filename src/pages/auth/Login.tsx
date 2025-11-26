// src/pages/auth/Login.tsx

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { useTheme } from "../../hooks/useTheme";
// import { useBrandColor } from "../../hooks/useBrandColor"; // REMOVED

import styles from "./Auth.module.css";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();

  const { theme, toggleTheme } = useTheme();
  // const { brandColor } = useBrandColor(); // REMOVED

  /* ============================================================
     🎨 Tema (rely on useTheme for data-theme attribute)
  ============================================================ */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  // REMOVED: useEffect for brandColor, now handled by applyTenantTheme or default CSS
  /*
  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);
  */

  /* ============================================================
     URL Messages
  ============================================================ */
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

  /* ============================================================
     Redirecionar se logado
  ============================================================ */
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  /* ============================================================
     Login
  ============================================================ */
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

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>
        <h2 className={styles.loginTitle}>LOGIN</h2>
          {/* MENSAGEM AMIGÁVEL (pré-onboarding) */}
          <div className={styles.welcomeBox}>
            <p className={styles.welcomeText}>
              👋 <strong>Bem-vindo!</strong>  
              Se ainda não tem uma conta, clique em <strong>Registrar</strong> para começar a usar o sistema e configurar seu salão em poucos minutos.
            </p>
          </div>

        <form onSubmit={handleSubmit}>
          {error && <p className={styles.errorMessage}>{error}</p>}

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* SENHA + OLHO */}
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              className={styles.passwordInput}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />

            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* LINK "ESQUECEU A SENHA?" — fora do WRAPPER */}
          <button
            type="button"
            className={styles.forgotPassword}
            onClick={() => navigate("/forgot-password")}
          >
            Esqueceu a senha?
          </button>

          {/* BOTÃO ENTRAR */}
          <button type="submit" disabled={!email || !senha || loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* CADASTRE-SE */}
        <p className={styles.linkText}>
          Ainda não tem conta? <Link to="/register">Registrar</Link>
        </p>

        {/* THEME BUTTON */}
        <div className={styles.themeToggleWrapper}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "🌞 Light Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}