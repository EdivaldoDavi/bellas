import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTheme } from "../hooks/useTheme";
import { useBrandColor } from "../hooks/useBrandColor";

import styles from "../css/ForceReset.module.css";

export default function ForcePasswordReset() {
  const navigate = useNavigate();

  const { theme } = useTheme();
  const { brandColor } = useBrandColor();

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  /* ============================================================
     🔥 1) Validar token enviado pelo email do Supabase
  ============================================================ */
  useEffect(() => {
    async function validateMagicLink() {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) {
        toast.error("Link inválido ou expirado.");
        return navigate("/login");
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        toast.error("Token inválido.");
        return navigate("/login");
      }

      // ⚠️ Estabelece sessão temporária para permitir alterar senha
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error || !data.session) {
        toast.error("Não foi possível autenticar o link.");
        return navigate("/login");
      }

      // ❇️ Remove hash da URL
      window.history.replaceState({}, "", "/force-reset");

      setSessionLoaded(true);
    }

    validateMagicLink();
  }, [navigate]);

  /* ============================================================
     🔐 2) Atualizar senha
  ============================================================ */
  async function handleSave() {
    if (password.length < 6) {
      toast.warning("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.warning("As senhas não coincidem.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha alterada com sucesso! 🎉");

    // Redireciona para Login
    navigate("/login?reset=1", { replace: true });
  }

  /* ============================================================
     UI - Tela de carregamento
  ============================================================ */
  if (!sessionLoaded) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.loadingCard}>
          <p>Validando link...</p>
        </div>
      </div>
    );
  }

  /* ============================================================
     UI - Tela principal
  ============================================================ */
  return (
    <div
      className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}
      style={{ "--primary": brandColor || "#ff1493" } as React.CSSProperties}
    >
      <div className={styles.card}>
        <h2 className={styles.title}>Redefinir Senha</h2>

        <p className={styles.subtitle}>
          Digite sua nova senha para concluir o processo.
        </p>

        <input
          type="password"
          className={styles.input}
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          className={styles.input}
          placeholder="Confirmar nova senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          className={styles.button}
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Salvando..." : "Salvar nova senha"}
        </button>
      </div>
    </div>
  );
}
