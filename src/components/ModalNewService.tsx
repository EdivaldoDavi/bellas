import { useState, useEffect } from "react";
import styles from "../css/ModalNewService.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewServiceProps {
  tenantId?: string;
  show: boolean;
  mode: "agenda" | "cadastro";
  onClose: () => void;
  onSuccess?: (id: string, name: string, duration: number) => void;
}

interface Professional {
  id: string;
  name: string;
}

export default function ModalNewService({
  tenantId,
  show,
  mode,
  onClose,
  onSuccess
}: ModalNewServiceProps) 
{
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  /* ---------------------------
     Load Professionals
  -----------------------------*/
  useEffect(() => {
    if (!tenantId || !show) return;

    async function loadProfessionals() {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        toast.error("Erro ao carregar profissionais");
        return;
      }

      setProfessionals(data || []);
    }

    loadProfessionals();
  }, [tenantId, show]);

  /* ---------------------------
     Reset form
  -----------------------------*/
  function resetForm() {
    setName("");
    setPrice("");
    setDuration("");
    setSelectedProfessionals([]);
  }

  /* ---------------------------
     Toggle checkbox
  -----------------------------*/
  function toggleProfessional(id: string) {
    setSelectedProfessionals((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  /* ---------------------------
     SAVE SERVICE
  -----------------------------*/
  async function handleSave() {
    const serviceName = name.trim();
    const serviceDuration = Number(duration);
    const priceCents = Number(price) > 0 ? Number(price) * 100 : 0;

    if (!serviceName || !serviceDuration) {
      toast.warn("Preencha nome e duração");
      return;
    }

    // 🚀 NOVA REGRA → se NÃO houver profissionais cadastrados, permitir cadastro SEM vínculo
    const mustLinkProfessionals = professionals.length > 0;

    if (mustLinkProfessionals && selectedProfessionals.length === 0) {
      toast.warn("Selecione pelo menos um profissional");
      return;
    }

    setLoading(true);

    // --- Cadastrar serviço ---
    const { data: service, error: srvErr } = await supabase
      .from("services")
      .insert([
        {
          tenant_id: tenantId,
          name: serviceName,
          price_cents: priceCents,
          duration_min: serviceDuration
        }
      ])
      .select()
      .single();

    if (srvErr) {
      toast.error("Erro ao cadastrar serviço");
      setLoading(false);
      return;
    }

    const serviceId = service.id;

    // --- Vincular profissionais SE existirem ---
    if (mustLinkProfessionals && selectedProfessionals.length > 0) {
      const rows = selectedProfessionals.map((pid) => ({
        tenant_id: tenantId,
        professional_id: pid,
        service_id: serviceId
      }));

      const { error: linkErr } = await supabase
        .from("professional_services")
        .insert(rows);

      if (linkErr) {
        toast.error("Serviço criado, mas erro ao vincular profissionais");
      } else {
        toast.success("Serviço cadastrado!");
      }
    } else {
      // 🚀 Cadastrar SEM profissionais
      toast.success("Serviço cadastrado! Vincule profissionais depois.");
    }

    setLoading(false);

    // Callback para agenda
    onSuccess?.(serviceId, serviceName, serviceDuration);

    if (mode === "agenda") {
      onClose();
    } else {
      resetForm();
    }
  }

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <button onClick={onClose} className={styles.closeBtn}>
          <X size={20} />
        </button>

        <h3>Novo Serviço</h3>

        <input
          className={styles.input}
          placeholder="Nome do serviço"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Preço (R$ opcional)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Duração (min)"
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <h4 style={{ marginTop: 12 }}>Profissionais</h4>

        {professionals.length === 0 ? (
          <p className={styles.emptyText}>
            Nenhum profissional cadastrado ainda.<br />
            Você poderá vincular depois.
          </p>
        ) : (
          <div className={styles.checkList}>
            {professionals.map((p) => (
              <label key={p.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedProfessionals.includes(p.id)}
                  onChange={() => toggleProfessional(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}

        <button
          className={styles.saveButton}
          disabled={loading}
          onClick={handleSave}
        >
          {loading ? "Salvando..." :
            mode === "cadastro" ? "Salvar e continuar" : "Salvar Serviço"}
        </button>

      </div>
    </div>
  );
}
