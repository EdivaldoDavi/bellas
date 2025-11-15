import { useState, useEffect } from "react";
import styles from "../css/ModalNewUser.module.css"; // 💥 use um CSS específico!
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewUserProps {
  tenantId?: string;
  show: boolean;
  onClose: () => void;
}

export default function ModalNewUser({ tenantId, show, onClose }: ModalNewUserProps) {
  const [search, setSearch] = useState("");
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  /** Carrega profissionais apenas quando modal abre E quando tenantId já existe */
  useEffect(() => {
    if (show && tenantId) {
      setSelected(null);
      setSearch("");
      loadProfessionals();
    }
  }, [show, tenantId]);

  /** Carregar profissionais sem duplicação */
  async function loadProfessionals() {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("user_id", null); // apenas profissionais sem usuário

    if (error) {
      console.error("Erro loadProfessionals:", error);
      toast.error("Erro ao buscar profissionais");
      return;
    }

    setProfessionals(data || []);
  }

  function gerarSenha() {
    return Math.random().toString(36).slice(-8) + "!Aa1";
  }

  async function gerarAcesso() {
    if (!selected) return toast.warn("Selecione um profissional");

    if (!selected.email) {
      return toast.error("Este profissional não tem e-mail cadastrado!");
    }

    setLoading(true);

    try {
      const tempPassword = gerarSenha();

      // 1️⃣ Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
  email: selected.email,
  password: tempPassword,
  options: {
    emailRedirectTo: `${window.location.origin}/force-reset`,
    data: {
      role: "professional",
      tenant_id: tenantId,
      full_name: selected.name
    }
  }
});

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Erro ao criar usuário.");
      }

      const userId = authData.user.id;

      // 2️⃣ Vincular profissional ao userId
      const { error: linkErr } = await supabase
        .from("professionals")
        .update({ user_id: userId })
        .eq("id", selected.id);

      if (linkErr) throw linkErr;

      // 3️⃣ Gerar link de convite
      const inviteUrl = `${window.location.origin}/convite?email=${encodeURIComponent(
        selected.email
      )}&tenant=${tenantId}`;

      console.log("Convite:", inviteUrl);

      toast.success("Acesso criado com sucesso! Envie o link ao profissional.");
      onClose();

    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  }

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <h3>Dar acesso ao sistema</h3>

        <input
          className={styles.input}
          placeholder="Buscar profissional..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.resultsContainer}>
          {professionals
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <div
                key={p.id}
                className={`${styles.item} ${
                  selected?.id === p.id ? styles.selected : ""
                }`}
                onClick={() => setSelected(p)}
              >
                <strong>{p.name}</strong>
                <span>{p.email || "sem e-mail"}</span>
              </div>
            ))}
        </div>

        <button
          className={styles.saveBtn}
          disabled={!selected || loading}
          onClick={gerarAcesso}
        >
          {loading ? "Criando..." : "Gerar acesso"}
        </button>
      </div>
    </div>
  );
}
