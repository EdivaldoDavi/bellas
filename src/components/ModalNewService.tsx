import { useState, useEffect } from "react";
import styles from "../css/Agenda.module.css";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

interface ModalNewServiceProps {
  tenantId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}

interface Professional {
  id: string;
  name: string;
}

export default function ModalNewService({ tenantId, onClose, onCreated }: ModalNewServiceProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

  // Carregar profissionais
  useEffect(() => {
    async function loadProfessionals() {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar profissionais");
        return;
      }

      setProfessionals(data || []);
    }
    loadProfessionals();
  }, [tenantId]);

  function toggleProfessional(id: string) {
    setSelectedProfessionals((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function selectAllProfessionals() {
    if (selectedProfessionals.length === professionals.length) {
      setSelectedProfessionals([]);
    } else {
      setSelectedProfessionals(professionals.map((p) => p.id));
    }
  }

  async function handleSave() {
    if (!name.trim() || !duration.trim()) {
      toast.warn("Preencha nome e duração");
      return;
    }

    if (selectedProfessionals.length === 0) {
      toast.warn("Selecione ao menos um profissional");
      return;
    }

    const { data: service, error: srvErr } = await supabase
      .from("services")
      .insert([{
        tenant_id: tenantId,
        name,
        price_cents: Number(price || 0) * 100,
        duration_min: Number(duration)
      }])
      .select()
      .single();

    if (srvErr) {
      toast.error("Erro ao cadastrar serviço");
      return;
    }

    const serviceId = service.id;

    const rows = selectedProfessionals.map(pid => ({
      tenant_id: tenantId,
      professional_id: pid,
      service_id: serviceId
    }));

    const { error: linkErr } = await supabase
      .from("professional_services")
      .insert(rows);

    if (linkErr) {
      toast.error("Serviço criado, mas falhou ao vincular profissionais");
      return;
    }

    toast.success("Serviço cadastrado!");
    onCreated(serviceId);
    onClose();
  }

  return (
    <div className={styles.modal}>
      <div className={styles.modalContentSmall}>
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

        <h4 style={{ marginTop: 10 }}>Profissionais do serviço</h4>

        {professionals.length > 0 && (
          <button
            onClick={selectAllProfessionals}
            className={styles.smallBtn}
            style={{ marginBottom: "6px" }}
          >
            {selectedProfessionals.length === professionals.length
              ? "Desmarcar todos"
              : "Selecionar todos"}
          </button>
        )}

        <div className={styles.checkList}>
          {professionals.length === 0 ? (
            <p style={{ fontSize: 13 }}>Nenhum profissional cadastrado.</p>
          ) : (
            professionals.map((p) => (
              <label key={p.id} className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={selectedProfessionals.includes(p.id)}
                  onChange={() => toggleProfessional(p.id)}
                />
                {p.name}
              </label>
            ))
          )}
        </div>

        <button className={styles.saveButton} onClick={handleSave} style={{ marginTop: "10px" }}>
          Salvar Serviço
        </button>
      </div>
    </div>
  );
}
