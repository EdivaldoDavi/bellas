// src/pages/auth/Register.tsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseCleint";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useBrandColor } from "../../hooks/useBrandColor";
import styles from "../../css/Register.module.css"

export default function Register() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🎨 Tema global
  const { theme, toggleTheme } = useTheme();

  // 🎨 BrandColor global
  const { brandColor } = useBrandColor();

  /* ============================================================
     Aplicar tema no HTML
  ============================================================ */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  /* ============================================================
     Aplicar cor primária
  ============================================================ */
  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);

  /* ============================================================
     Registrar
  ============================================================ */
const handleRegister = async () => {
  setLoading(true);
  setMessage("");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  setLoading(false);

  // ❌ Erro técnico
  if (error) {
    setMessage(error.message);
    return;
  }

  // ❗ Detecta e-mail já registrado (caso existente no Supabase)
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    setMessage("Este e-mail já está cadastrado. Por favor, faça login.");
    return;
  }

  // ❗ Detecta e-mail existente e não confirmado
  if (!data.user) {
    setMessage("Este e-mail já está cadastrado. Por favor, faça login.");
    return;
  }

  // ✔ Novo usuário criado (mesmo que ainda precise confirmar)
  setMessage("Cadastro criado! Verifique seu e-mail para confirmar.");
};

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>

        <h2 className={styles.title}>Criar Conta</h2>

        {message && <p className={styles.message}>{message}</p>}

        <input
          type="text"
          placeholder="Seu nome"
          className={styles.input}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          type="email"
          placeholder="E-mail"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          onClick={handleRegister}
          className={styles.button}
        >
          {loading ? "Registrando..." : "Criar conta"}
        </button>

        <p className={styles.linkText}>
          Já possui conta? <Link to="/login">Entrar</Link>
        </p>

        {/* Botão de alternar tema */}
        <div className={styles.themeToggleWrapper}>
          <button className={styles.themeToggle} onClick={toggleTheme}>
            {theme === "light" ? "🌙 Dark Mode" : "🌞 Light Mode"}
          </button>
        </div>
      </div>
    </div>
  );
}