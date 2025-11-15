import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Auth.module.css";
import { toast } from "react-toastify";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { signIn, user } = useAuth();
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("logged_out") === "1") {
    toast.success("Sessão encerrada com sucesso! 👋");
    params.delete("logged_out");
    window.history.replaceState({}, "", "/login");
  }
}, []);

  // ✅ Mensagens via query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("checkEmail") === "1") {
      toast.info("Enviamos um email de confirmação! Verifique sua caixa de entrada.");
    }

    if (params.get("confirmed") === "1") {
      toast.success("Email confirmado! Faça login para continuar.");
    }
  }, []);

  // ✅ Se o user já está logado, redireciona automaticamente
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // ==========================
  //   SUBMIT LOGIN
  // ==========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await signIn(email, senha);
      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao fazer login.");
    }
  };

  return (
    <div className={styles.wrap}>
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

          <button type="submit" disabled={!email || !senha}>
            Entrar
          </button>
        </form>

        <p className={styles.linkText}>
          Ainda não tem conta? <Link to="/register">Registrar</Link>
        </p>
      </div>
    </div>
  );
}
