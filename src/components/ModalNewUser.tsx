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

  /** Resetar campos quando o modal abre */
  useEffect(() => {
    if (show) {
      setEmail("");
      setFullName("");
      setRole("professional");
    }
  }, [show]);

  if (!show) return null;

  function gerarSenhaTemporaria() {
    // Gera uma senha forte e aleatória
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async function handleInviteUser() {
    if (!tenantId) {
      toast.error("Tenant não encontrado.");
      return;
    }
    if (!email.trim() || !fullName.trim()) {
      toast.warn("Preencha o e-mail e o nome completo.");
      return;
    }

    setLoading(true);

    try {
      // --- NOVA VERIFICAÇÃO: Impedir que o usuário logado convide a si mesmo ---
      const { data: currentUserData } = await supabase.auth.getUser();
      if (currentUserData.user && currentUserData.user.email?.toLowerCase() === email.trim().toLowerCase()) {
        throw new Error("Você não pode convidar a si mesmo como um novo usuário. Se deseja alterar seu papel, use a tela 'Gerenciar Acessos'.");
      }
      // --- FIM DA NOVA VERIFICAÇÃO ---

      const tempPassword = gerarSenhaTemporaria();

      // 1️⃣ Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/force-reset`, // Redireciona para forçar reset de senha
          data: {
            role: role,
            tenant_id: tenantId,
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        // Erro específico do Supabase Auth para e-mail já registrado
        if (authError.message.includes("User already registered")) {
          throw new Error("Este e-mail já está registrado no sistema. Por favor, faça login ou use outro e-mail.");
        }
        throw new Error(authError.message);
      }

      // Se authData.user é nulo, significa que o e-mail já existe e a confirmação está habilitada.
      // Supabase retorna user nulo sem erro para evitar enumeração de e-mails.
      if (!authData.user) {
        throw new Error("Este e-mail já está registrado no sistema. Por favor, use outro e-mail ou gerencie o usuário existente.");
      }

      const userId = authData.user.id;

      // 2️⃣ Se o papel for 'professional', criar um registro na tabela 'professionals'
      if (role === "professional") {
        const { error: profError } = await supabase
          .from("professionals")
          .insert({
            tenant_id: tenantId,
            user_id: userId,
            name: fullName.trim(),
            email: email.trim(),
            phone: null, // Pode ser adicionado depois
            is_active: true,
          });

        if (profError) {
          console.log("DEBUG: profError object:", profError); // Log para depuração
          
          // Verifica se é uma violação de chave única (código '23505')
          // Isso ocorre se o user_id já estiver na tabela 'professionals'
          if (profError.code === '23505') {
            throw new Error("Este usuário já possui um perfil de profissional. Você pode alterar o papel dele na tela de 'Gerenciar Acessos'.");
          }
          // Fallback para outros erros de duplicidade ou FK (menos provável de ser o caso principal aqui)
          throw new Error(profError.message || "Ocorreu um erro desconhecido ao adicionar o profissional.");
        }
      }

      // Mensagem de sucesso aprimorada
      toast.success("Convite enviado com sucesso! O usuário receberá um e-mail para definir a senha. Por favor, peça para ele verificar a caixa de entrada e a pasta de spam.");
      onClose();
    } catch (err: any) {
      console.error("Erro ao convidar usuário:", err);
      toast.error(err.message || "Ocorreu um erro inesperado.");
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

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Papel</label>
          <select
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value as "manager" | "professional")}
            disabled={loading}
          >
            <option value="manager">Gerente</option>
            <option value="professional">Profissional</option>
          </select>
        </div>

        <button
          className={styles.saveBtn}
          disabled={loading || !email.trim() || !fullName.trim()}
          onClick={handleInviteUser}
        >
          {loading ? "Enviando convite..." : "Convidar Usuário"}
        </button>
      </div>
    </div>
  );
}