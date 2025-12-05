import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { useTheme } from "../../hooks/useTheme";
import styles from "./Auth.module.css";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";

import logoBellas from "../../assets/bellaslogotransp.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

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

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

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
    <div className={styles.pageWrapper}>
      <div className={`${styles.loginCard} ${styles.loginCardCompact}`}>
        
        {/* LOGO */}
        <div className={`${styles.logoWrapper} ${styles.logoCompact}`}>
          <img src={logoBellas} alt="Bellas Logo" className={styles.logo} />
        </div>

        {/* REMOVED: título e subtítulo do login conforme solicitação */}

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}

          <label className={styles.label}>Email</label>
          <input
            type="email"
            className={styles.input}
            placeholder="seuemail@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className={styles.label}>Senha</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? "text" : "password"}
              className={styles.input}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="button"
            className={styles.forgot}
            onClick={() => navigate("/forgot-password")}
          >
            Esqueceu sua senha?
          </button>

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className={styles.registerText}>
          Não tem conta?{" "}
          <Link to="/register" className={styles.link}>
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}