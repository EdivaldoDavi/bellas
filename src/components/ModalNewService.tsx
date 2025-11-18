// src/components/ModalNewService.tsx
import { useState, useEffect } from "react";
import styles from "../css/ModalNewService.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface Service {
  id: string;
  name: string;
  duration_min: number | null;
  price_cents?: number | null;
}

interface Professional {
  id: string;
  name: string;
}

interface ModalNewServiceProps {
  tenantId?: string;
  show: boolean;
  mode: "agenda" | "cadastro" | "edit";
  service?: Service;
  onClose: () => void;
  onSuccess?: (id: string, name: string, duration: number) => void;
}

export default function ModalNewService({
  tenantId,
  show,
  mode,
  service,
  onClose,
  onSuccess
}: ModalNewServiceProps) {

  // ---------------------------- STATES ----------------------------
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  // ---------------------------- RESET FORM ----------------------------
  function resetForm() {
    setName("");
    setPrice("");
    setDuration("");
    setSelectedProfessionals([]);
  }

  // ---------------------------- LOAD PROFESSIONALS ----------------------------
  useEffect(() => {
    if (!show || !tenantId) return;
    loadProfessionals();
  }, [show, tenantId]);

  async function loadProfessionals() {
    const { data, error } = await supabase
      .from("professionals")
      .select("id,name")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar profissionais");
      return;
    }

    setProfessionals(data ?? []);
  }

  // ---------------------------- LOAD SERVICE WHEN EDIT ----------------------------
  useEffect(() => {
    if (!show) return;

    if (mode === "edit" && service) {
      setName(service.name);
      setDuration(String(service.duration_min ?? 60));
      setPrice(service.price_cents ? String(service.price_cents / 100) : "");
    } else {
      resetForm();
    }
  }, [show, mode, service]);

  // ---------------------------- SAVE ----------------------------
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant não encontrado.");

    const serviceName = name.trim();
    const dur = Number(duration);
    const priceCents = Number(price) > 0 ? Math.round(Number(price) * 100) : null;

    if (!serviceName || !dur) {
      toast.warn("Preencha nome e duração");
      return;
    }

    setLoading(true);

    try {
      let serviceId = service?.id ?? "";

      // EDITAR
      if (mode === "edit" && service) {
        const { error } = await supabase
          .from("services")
          .update({
            name: serviceName,
            duration_min: dur,
            price_cents: priceCents,
          })
          .eq("id", serviceId)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        toast.success("Serviço atualizado!");
        onClose();
        return;
      }

      // CRIAR
      const { data, error } = await supabase
        .from("services")
        .insert([
          {
            tenant_id: tenantId,
            name: serviceName,
            duration_min: dur,
            price_cents: priceCents,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      serviceId = data.id;

      toast.success("Serviço cadastrado!");

      onSuccess?.(serviceId, serviceName, dur);

      if (mode === "agenda") return onClose();

      resetForm();

    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------- UI ----------------------------
  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <h3>{mode === "edit" ? "Editar Serviço" : "Novo Serviço"}</h3>

        <input
          className={styles.input}
          placeholder="Nome do serviço"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className={styles.input}
          placeholder="Preço (opcional)"
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

        {professionals.length > 0 && (
          <>
            <h4 className={styles.subtitle}>Profissionais</h4>

            <div className={styles.checkList}>
              {professionals.map((p) => (
                <label key={p.id} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={selectedProfessionals.includes(p.id)}
                    onChange={() =>
                      setSelectedProfessionals((old) =>
                        old.includes(p.id)
                          ? old.filter((x) => x !== p.id)
                          : [...old, p.id]
                      )
                    }
                  />
                  <span className={styles.profName}>{p.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        <button
          className={styles.saveButton}
          disabled={loading}
          onClick={handleSave}
        >
          {loading
            ? "Salvando..."
            : mode === "edit"
            ? "Salvar alterações"
            : mode === "agenda"
            ? "Salvar e usar"
            : "Salvar"}
        </button>
      </div>
    </div>
  );
}
