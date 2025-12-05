import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";

import ManageRoles from "../components/ManageRoles";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/UsuariosPage.module.css";

interface ProfessionalOption {
  id: string;
  name: string;
  user_id: string | null; // Para saber se já está vinculado
}

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

export default function UsuariosPage() {
  const { tenant, profile } = useUserAndTenant();
  const tenantId = tenant?.id;
  const loggedInUserId = profile?.user_id;

  // States para o formulário de convite (movidos do ModalNewUser)
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "professional">("professional");
  const [loadingInvite, setLoadingInvite] = useState(false); // Renomeado para evitar conflito
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // State para a busca de usuários no ManageRoles (mantido)
  const [searchManageRoles, setSearchManageRoles] = useState(""); // Novo estado para a busca do ManageRoles

  // Carregar profissionais ao montar a página ou quando o tenantId mudar
  useEffect(() => {
    if (tenantId) fetchProfessionals(tenantId);
  }, [tenantId]);

  const fetchProfessionals = useCallback(async (currentTenantId: string) => {
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
  }, []);

  /* -------------------------------------------------------------
     📨 Enviar convite (movido do ModalNewUser)
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

      setLoadingInvite(true);

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
      // Resetar formulário após sucesso
      setEmail("");
      setFullName("");
      setRole("professional");
      setSelectedProfessionalId(null);
      // Recarregar a lista de profissionais para atualizar o status de vinculação
      fetchProfessionals(tenantId);

    } catch (err: any) {
      console.error("💥 ERRO GERAL NO INVITE:", err);
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setLoadingInvite(false);
      console.groupEnd();
    }
  }

  if (!loggedInUserId || !tenantId) {
    return <p className={styles.description} style={{ padding: 20, textAlign: "center" }}>Carregando...</p>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gerenciar Usuários</h2>
      <p className={styles.description}>
        Convide novos usuários para o seu Studio e defina suas permissões.
      </p>

      {/* Seção de Convidar Novo Usuário */}
      <div className={styles.inviteUserSection}>
        <h3 className={styles.sectionTitle}>Convidar Novo Usuário</h3>
        <p className={styles.sectionDescription}>
          Preencha os dados para enviar um convite por e-mail.
        </p>
        <input
          className={styles.input}
          type="text"
          placeholder="Nome Completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loadingInvite}
        />

        <input
          className={styles.input}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loadingInvite}
        />

        <select
          className={styles.input}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as "manager" | "professional");
            setSelectedProfessionalId(null); // Reset professional selection on role change
          }}
          disabled={loadingInvite}
        >
          <option value="manager">Gerente</option>
          <option value="professional">Profissional</option>
        </select>

        {role === "professional" && (
          <select
            className={styles.input}
            value={selectedProfessionalId || ""}
            onChange={(e) => setSelectedProfessionalId(e.target.value || null)}
            disabled={loadingInvite}
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
          className={styles.inviteButton} // Usar um novo estilo para este botão
          disabled={loadingInvite || !fullName.trim() || !email.trim() || !isValidEmail(email.trim())}
          onClick={handleInviteUser}
        >
          {loadingInvite ? "Enviando..." : "Convidar Usuário"}
        </button>
      </div>

      {/* Seção de Gerenciar Permissões (existente) */}
      <div className={styles.manageRolesSection}>
        <ManageRoles tenantId={tenantId} loggedInUserId={loggedInUserId} />
      </div>
    </div>
  );
}