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

  /* =====================================================
     LOAD PROFESSIONALS
  =======================================================*/
  useEffect(() => {
    if (!tenantId || !show) return;

    async function load() {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar profissionais");
        return;
      }

      setProfessionals(data ?? []);
    }

    load();
  }, [tenantId, show]);

  /* =====================================================
     FORM RESET
  =======================================================*/
  function resetForm() {
    setName("");
    setPrice("");
    setDuration("");
    setSelectedProfessionals([]);
  }

  /* =====================================================
     CHECKBOX HANDLER
  =======================================================*/
  function toggleProfessional(id: string) {
    setSelectedProfessionals(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }

  /* =====================================================
     SAVE SERVICE (MAIN LOGIC)
  =======================================================*/
  async function handleSave() {
    if (!tenantId) {
      toast.error("Tenant não encontrado.");
      return;
    }

    const serviceName = name.trim();
    const serviceDuration = Number(duration);
    const priceCents = Number(price) > 0 ? Number(price) * 100 : 0;

    if (!serviceName || !serviceDuration) {
      toast.warn("Preencha nome e duração");
      return;
    }

    // Regra: se há profissionais cadastrados → obrigar vínculo
    const mustLinkProfessionals = professionals.length > 0;

    if (mustLinkProfessionals && selectedProfessionals.length === 0) {
      toast.warn("Selecione pelo menos um profissional");
      return;
    }

    setLoading(true);

    try {
      /* =====================================================
         1) CRIAR SERVIÇO
      =======================================================*/
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
        console.error(srvErr);
        toast.error("Erro ao cadastrar serviço");
        setLoading(false);
        return;
      }

      const serviceId = service.id;

      /* =====================================================
         2) VINCULAR PROFISSIONAIS (SE EXISTIREM)
      =======================================================*/
      if (mustLinkProfessionals && selectedProfessionals.length > 0) {
        const rows = selectedProfessionals.map(pid => ({
          tenant_id: tenantId,
          professional_id: pid,
          service_id: serviceId
        }));

        const { error: linkErr } = await supabase
          .from("professional_services")
          .insert(rows);

        if (linkErr) {
          console.error(linkErr);
          toast.error("Erro ao vincular profissionais");
        } else {
          toast.success("Serviço cadastrado com sucesso!");
        }
      } else {
        toast.success("Serviço cadastrado! Você pode vincular profissionais depois.");
      }

      /* =====================================================
         3) CALLBACK PARA AGENDA
      =======================================================*/
      onSuccess?.(serviceId, serviceName, serviceDuration);

      /* =====================================================
         4) FECHAR OU RESETAR
      =======================================================*/
      if (mode === "agenda") {
        onClose();
      } else {
        resetForm();
      }

    } catch (err: any) {
      console.error("Erro inesperado:", err);
      toast.error("Erro inesperado ao cadastrar.");
    }

    setLoading(false);
  }

  /* =====================================================
     UI
  =======================================================*/
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
          {loading
            ? "Salvando..."
            : mode === "cadastro"
            ? "Salvar e continuar"
            : "Salvar Serviço"}
        </button>

      </div>
    </div>
  );
}
