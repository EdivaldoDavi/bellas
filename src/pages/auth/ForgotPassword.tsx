import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseCleint";
import { Link } from "react-router-dom";

import { useTheme } from "../../hooks/useTheme";
import { useBrandColor } from "../../hooks/useBrandColor";
import styles from "../../css/ForgotPassword.module.css";

export default function ForgotPassword() {
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const { theme } = useTheme();
  const { brandColor } = useBrandColor();

  // Aplicar tema e brand color no HTML
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);

  async function handleReset() {
    setMessage("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/force-reset`,
    });

    setLoading(false);

    if (error) return setMessage(error.message);

    setMessage("Enviamos um link para redefinir sua senha. Verifique seu e-mail!");
  }

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>
        <h2 className={styles.title}>Redefinir Senha</h2>

        {message && <p className={styles.message}>{message}</p>}

        <input
          type="email"
          placeholder="Digite seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button disabled={!email || loading} onClick={handleReset}>
          {loading ? "Enviando..." : "Enviar link de redefinição"}
        </button>

        <p className={styles.back}>
          <Link to="/login">Voltar ao login</Link>
        </p>
      </div>
    </div>
  );
}
