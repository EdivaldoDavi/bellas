// src/pages/auth/Register.tsx

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseCleint";
import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useBrandColor } from "../../hooks/useBrandColor";
import styles from "../../css/Register.module.css"
import { toast } from "react-toastify"; // Importar toast para mensagens

/* -------------------------------------------------------------
   🔐 Função geradora de senha segura (reutilizada de ModalNewUser)
------------------------------------------------------------- */
function gerarSenhaTemporaria() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  // Senha não é mais pedida ao usuário, será gerada
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

    if (!fullName.trim()) {
      toast.warn("Por favor, insira seu nome completo.");
      setLoading(false);
      return;
    }
    if (!email.trim()) {
      toast.warn("Por favor, insira seu e-mail.");
      setLoading(false);
      return;
    }

    const tempPassword = gerarSenhaTemporaria(); // Gerar senha temporária

    // 🚨 DEBUG: Log dos dados enviados para o Supabase
    console.log("Register: Dados enviados para Supabase.auth.signUp:");
    console.log("  Email:", email.trim());
    console.log("  Full Name:", fullName.trim());
    console.log("  Temporary Password:", tempPassword);
    console.log("  Redirect URL:", `${window.location.origin}/force-reset`);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempPassword, // Usar a senha temporária
      options: {
        emailRedirectTo: `${window.location.origin}/force-reset`, // Redirecionar para force-reset
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);

    // 🚨 DEBUG: Log do erro completo
    if (error) {
      console.error("Register: Erro completo do Supabase.auth.signUp:", error);
      setMessage(error.message);
      toast.error(error.message);
      return;
    }

    // 🚨 DEBUG: Log dos dados de sucesso
    console.log("Register: Sucesso no Supabase.auth.signUp. Data:", data);

    // ❗ Detecta e-mail já registrado (caso existente no Supabase)
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMessage("Este e-mail já está cadastrado. Por favor, faça login.");
      toast.info("Este e-mail já está cadastrado. Por favor, faça login.");
      return;
    }

    // ❗ Detecta e-mail existente e não confirmado
    if (!data.user) {
      setMessage("Este e-mail já está cadastrado. Por favor, faça login.");
      toast.info("Este e-mail já está cadastrado. Por favor, faça login.");
      return;
    }

    // ✔ Novo usuário criado (mesmo que ainda precise confirmar)
    setMessage("Cadastro criado! Verifique seu e-mail para definir sua senha.");
    toast.success("Cadastro criado! Verifique seu e-mail para definir sua senha.");
  };

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>

        <h2 className={styles.title}>Criar Conta</h2>
{/* PRÉ-ONBOARDING — Mensagem amigável na tela de registro */}
      <div className={styles.welcomeBox}>
        <p className={styles.welcomeText}>
          ✨ <strong>Vamos criar seu salão!</strong><br/>
          Preencha as informações abaixo e criaremos automaticamente seu ambiente,
          seu primeiro profissional e seu painel de controle.  
          Depois é só seguir o passo a passo guiado para configurar serviços,
          horários e começar a agendar.
        </p>
      </div>

        {message && <p className={styles.message}>{message}</p>}

        <input
          type="text"
          placeholder="Seu nome"
          className={styles.input}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />

        <input
          type="email"
          placeholder="E-mail"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        {/* O campo de senha foi removido */}

        <button
          disabled={loading || !email.trim() || !fullName.trim()}
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