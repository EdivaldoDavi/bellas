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

  async function handleInviteUser() {
    console.clear();
    console.log("🔥 Iniciando invite...");
    console.log("tenantId:", tenantId);

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

    try {
      const tempPassword = gerarSenhaTemporaria();

      console.log("📤 Enviando signup:", {
        email,
        fullName,
        role,
        tenantId,
        tempPassword,
      });

      const redirectUrl = `${window.location.origin}/force-reset`;

      console.log("🔗 Redirect URL:", redirectUrl);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
            tenant_id: tenantId,
            role: role,
          },
        },
      });

      console.log("🔍 RESPOSTA SIGNUP:", data, error);

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error("Supabase não criou o usuário. Verifique os Redirect URLs.");
      }

      toast.success("Convite enviado! O usuário deve verificar o email.");
      onClose();
    } catch (err: any) {
      console.error("❌ Erro ao convidar usuário:", err);
      toast.error(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
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
