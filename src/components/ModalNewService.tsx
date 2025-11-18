// src/components/ModalNewService.tsx
import { useState, useEffect, useCallback } from "react";
import styles from "../css/ModalNewService.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

/* ============================================
   TYPES
============================================ */
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

/* ============================================
   COMPONENT
============================================ */
export default function ModalNewService({
  tenantId,
  show,
  mode,
  service,
  onClose,
  onSuccess,
}: ModalNewServiceProps) {
  /* ============================================
     FORM STATES
  ============================================ */
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  /* ============================================
     RESET FORM
  ============================================ */
  const resetForm = useCallback(() => {
    setName("");
    setPrice("");
    setDuration("");
    setSelectedProfessionals([]);
  }, []);

  /* ============================================
     LOAD PROFESSIONALS
  ============================================ */
  useEffect(() => {
    if (!show || !tenantId) return;

    async function load() {
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

    load();
  }, [show, tenantId]);

  /* ============================================
     LOAD SERVICE DATA WHEN EDITING
  ============================================ */
  useEffect(() => {
    if (!show) return;

    if (mode === "edit" && service) {
      setName(service.name);
      setDuration(String(service.duration_min ?? 60));
      setPrice(
        service.price_cents ? String(service.price_cents / 100) : ""
      );
    } else {
      resetForm();
    }
  }, [show, mode, service, resetForm]);

  /* ============================================
     SAVE (CREATE / UPDATE)
  ============================================ */
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant não encontrado.");

    const serviceName = name.trim();
    const dur = Number(duration);
    const priceCents =
      Number(price) > 0 ? Math.round(Number(price) * 100) : null;

    if (!serviceName || !dur) {
      toast.warn("Preencha nome e duração");
      return;
    }

    setLoading(true);

    try {
      const isEdit = mode === "edit" && service;

      /* ============================================
         UPDATE (EDITAR)
      ============================================ */
      if (isEdit) {
        const { error } = await supabase
          .from("services")
          .update({
            name: serviceName,
            duration_min: dur,
            price_cents: priceCents,
          })
          .eq("id", service.id)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        toast.success("Serviço atualizado!");
        onClose();
        return;
      }

      /* ============================================
         CREATE (CADASTRAR)
      ============================================ */
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

      toast.success("Serviço cadastrado!");

      onSuccess?.(data.id, serviceName, dur);

      if (mode === "agenda") {
        onClose();
        return;
      }

      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  }

  /* ============================================
     UI
  ============================================ */
  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* CLOSE BUTTON */}
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        {/* TITLE */}
        <h3>{mode === "edit" ? "Editar Serviço" : "Novo Serviço"}</h3>

        {/* INPUTS */}
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

        {/* PROFESSIONALS */}
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
                      setSelectedProfessionals((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id]
                      )
                    }
                  />

                  <span className={styles.profName}>{p.name}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* SAVE BUTTON */}
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
