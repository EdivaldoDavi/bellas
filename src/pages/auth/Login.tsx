import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth"; // ajuste o caminho se diferente
import styles from "./Auth.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, senha);
      navigate("/dashboard");
    } catch (err: any) {
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

          <button type="submit">Entrar</button>
        </form>

        <p className={styles.linkText}>
          Ainda não tem conta? <Link to="/register">Registrar</Link>
        </p>
      </div>
    </div>
  );
}
