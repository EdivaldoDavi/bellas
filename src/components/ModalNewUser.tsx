import { useState, useEffect } from "react";
import styles from "../css/ModalNewUser.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewUserProps {
  tenantId?: string;
  show: boolean;
  onClose: () => void;
}

export default function ModalNewUser({ tenantId, show, onClose }: ModalNewUserProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "professional">("professional");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setEmail("");
      setFullName("");
      setRole("professional");
    }
  }, [show]);

  if (!show) return null;

  /* -------------------------------------------------------------
     🔐 Função geradora de senha segura
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

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  /* -------------------------------------------------------------
     📨 Enviar convite
  ------------------------------------------------------------- */
  async function handleInviteUser() {
    console.group("📨 INVITE USER DEBUG");

    try {
      if (!tenantId) {
        toast.error("Tenant não encontrado.");
        return;
      }

      if (!fullName.trim()) {
        toast.warn("Nome obrigatório.");
        return;
      }

      if (!email.trim() || !isValidEmail(email.trim())) {
        toast.warn("Informe um email válido.");
        return;
      }

      setLoading(true);

      const tempPassword = gerarSenhaTemporaria();
      const redirectUrl = `${window.location.origin}/force-reset`;

      console.log("➡️ Dados enviados ao Supabase:");
      console.log({
        email,
        fullName,
        role,
        tenantId,
        tempPassword,
        redirectUrl,
      });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: redirectUrl,

          // IMPORTANTÍSSIMO: usar "data"
          data: {
            full_name: fullName.trim(),
            tenant_id: tenantId,
            role: role,
          },
        },
      });

      console.log("🔍 RESPOSTA SIGNUP (user/session/error):", data, error);

      if (error) {
        console.error("❌ SIGNUP ERROR:", error);

        if (error.message.includes("Database error saving new user")) {
          toast.error(
            "Erro no banco ao criar usuário. Verifique a trigger ou policies."
          );
        } else if (error.message.includes("invalid email") || error.message.includes("Unable to validate email")) {
          toast.error("Email inválido.");
        } else {
          toast.error(error.message);
        }

        return;
      }

      if (!data.user) {
        console.error("❌ Supabase não retornou 'user'");
        toast.error(
          "Erro ao criar usuário. Pode ser redirect inválido ou trigger."
        );
        return;
      }

      toast.success("Convite enviado! O usuário deve verificar o e-mail.");
      onClose();

    } catch (err: any) {
      console.error("💥 ERRO GERAL NO INVITE:", err);
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <h3>Convidar Novo Usuário</h3>

        <input
          className={styles.input}
          type="text"
          placeholder="Nome Completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />

        <input
          className={styles.input}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <select
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          disabled={loading}
        >
          <option value="manager">Gerente</option>
          <option value="professional">Profissional</option>
        </select>

        <button
          className={styles.saveBtn}
          disabled={loading}
          onClick={handleInviteUser}
        >
          {loading ? "Enviando..." : "Convidar Usuário"}
        </button>
      </div>
    </div>
  );
}
