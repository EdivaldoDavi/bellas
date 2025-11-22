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

interface ProfessionalOption {
  id: string;
  name: string;
  user_id: string | null; // Para saber se já está vinculado
}

export default function ModalNewUser({ tenantId, show, onClose }: ModalNewUserProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "professional">("professional");
  const [loading, setLoading] = useState(false);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setEmail("");
      setFullName("");
      setRole("professional");
      setSelectedProfessionalId(null);
      if (tenantId) fetchProfessionals(tenantId);
    }
  }, [show, tenantId]);

  async function fetchProfessionals(currentTenantId: string) {
    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, user_id")
      .eq("tenant_id", currentTenantId)
      .order("name");

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar lista de profissionais.");
      return;
    }
    setProfessionals(data || []);
  }

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
        selectedProfessionalId,
      });

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

      // 🔥 NOVO: Se o usuário é um profissional, vincula ou cria a entrada na tabela 'professionals'
      if (role === "professional") {
        if (selectedProfessionalId) {
          // Vincular a um profissional existente
          const { error: updateProfError } = await supabase
            .from("professionals")
            .update({ user_id: data.user.id })
            .eq("id", selectedProfessionalId)
            .eq("tenant_id", tenantId);

          if (updateProfError) {
            console.error("❌ ERRO ao vincular profissional existente:", updateProfError);
            toast.error("Erro ao vincular profissional existente.");
            return;
          }
        } else {
          // Criar um novo profissional e vincular
          const { error: createProfError } = await supabase
            .from("professionals")
            .insert([
              {
                tenant_id: tenantId,
                name: fullName.trim(),
                email: email.trim(),
                phone: null, // Pode ser adicionado depois
                is_active: true,
                user_id: data.user.id, // Vincula o user_id ao novo profissional
              },
            ]);

          if (createProfError) {
            console.error("❌ ERRO ao criar novo profissional:", createProfError);
            toast.error("Erro ao criar novo profissional.");
            return;
          }
        }
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

        {role === "professional" && (
          <select
            className={styles.input}
            value={selectedProfessionalId || ""}
            onChange={(e) => setSelectedProfessionalId(e.target.value || null)}
            disabled={loading}
          >
            <option value="">-- Vincular a profissional existente (opcional) --</option>
            {professionals.map((prof) => (
              <option key={prof.id} value={prof.id} disabled={!!prof.user_id}>
                {prof.name} {prof.user_id ? "(Já vinculado)" : ""}
              </option>
            ))}
          </select>
        )}

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