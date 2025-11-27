import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import styles from "../css/ModalNewService.module.css";

type ServiceRow = {
  id: string;
  name: string;
  duration_min: number | null;
  price_cents: number | null;
  is_active: boolean;
};

type ProfessionalRow = {
  id: string;
  name: string;
  is_active: boolean;
};

interface ModalNewServiceProps {
  tenantId?: string;
  show: boolean;
 mode?: "agenda" | "edit" | "cadastro";
  service?: ServiceRow;
  onClose: () => void;
onSuccess?: (id: string, name: string, duration: number) => void;
}

export default function ModalNewService({
  tenantId,
  show,
  mode = "cadastro",
  service,
  onClose,
  onSuccess,
}: ModalNewServiceProps) {
  const isEditing = mode === "edit" && !!service;

  // campos do serviço
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<string>("60");
  const [price, setPrice] = useState<string>("0");
  const [isActive, setIsActive] = useState(true);

  // profissionais
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // -------------------------------------------
  // RESET / CARREGAR DADOS AO ABRIR
  // -------------------------------------------
  useEffect(() => {
    if (!show) return;

    if (!tenantId) {
      toast.error("Tenant inválido.");
      return;
    }

    (async () => {
      try {
        setInitialLoading(true);

        // 1) Carrega profissionais
        const { data: profs, error: profErr } = await supabase
          .from("professionals")
          .select("id,name,is_active")
          .eq("tenant_id", tenantId)
          .order("name");

        if (profErr) throw profErr;

        setProfessionals((profs || []) as ProfessionalRow[]);

        // 2) Se edição, carrega dados do serviço + vínculos
        if (isEditing && service) {
          setName(service.name);
          setDuration(String(service.duration_min ?? 60));
          setPrice(String((service.price_cents ?? 0) / 100));
          setIsActive(service.is_active);

          // vínculos service -> professionals
          const { data: links, error: linksErr } = await supabase
            .from("professional_services")
            .select("professional_id")
            .eq("tenant_id", tenantId)
            .eq("service_id", service.id);

          if (linksErr) throw linksErr;

          setSelectedProfessionalIds(
            (links || []).map((l: any) => l.professional_id)
          );
        } else {
          // novo serviço
          setName("");
          setDuration("60");
          setPrice("0");
          setIsActive(true);
          setSelectedProfessionalIds([]);
        }
      } catch (err) {
        console.error("[ModalNewService] Erro ao carregar:", err);
        toast.error("Erro ao carregar dados do serviço.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [show, tenantId, isEditing, service]);

  // -------------------------------------------
  // HANDLERS
  // -------------------------------------------
  function toggleProfessional(id: string) {
    setSelectedProfessionalIds((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id]
    );
  }

async function handleSave() {
  if (!tenantId) {
    toast.error("Tenant inválido.");
    return;
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    toast.warn("Informe o nome do serviço.");
    return;
  }

  const durationNumber = Number(duration) || 0;
  const priceNumber = Number(price.replace(",", ".")) || 0;

  setLoading(true);

  try {
    let serviceFinal: {
      id: string;
      name: string;
      duration_min: number;
    } | null = null;

    /* ===========================================================
       1) INSERT OU UPDATE DO SERVICE
    ============================================================ */

    if (!isEditing) {
      // INSERT
      const { data, error } = await supabase
        .from("services")
        .insert([
          {
            tenant_id: tenantId,
            name: trimmedName,
            duration_min: durationNumber,
            price_cents: Math.round(priceNumber * 100),
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error || !data) throw error || new Error("Falha ao criar serviço.");

      serviceFinal = {
        id: data.id,
        name: data.name,
        duration_min: data.duration_min,
      };
    } else {
      // UPDATE
      if (!service?.id) throw new Error("ID de serviço inválido para edição.");

      const { error } = await supabase
        .from("services")
        .update({
          name: trimmedName,
          duration_min: durationNumber,
          price_cents: Math.round(priceNumber * 100),
          is_active: isActive,
        })
        .eq("tenant_id", tenantId)
        .eq("id", service.id);

      if (error) throw error;

      // O update não retorna o registro por padrão → buscar o atualizado
      const { data, error: fetchErr } = await supabase
        .from("services")
        .select("id, name, duration_min")
        .eq("tenant_id", tenantId)
        .eq("id", service.id)
        .single();

      if (fetchErr || !data)
        throw fetchErr || new Error("Erro ao buscar serviço atualizado.");

      serviceFinal = data;
    }

    if (!serviceFinal) throw new Error("Falha inesperada: serviceFinal nulo.");

    const serviceId = serviceFinal.id;

    /* ===========================================================
       2) ATUALIZAR VÍNCULOS EM professional_services
    ============================================================ */

    const { error: delErr } = await supabase
      .from("professional_services")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("service_id", serviceId);

    if (delErr) throw delErr;

    if (selectedProfessionalIds.length > 0) {
      const rows = selectedProfessionalIds.map((profId) => ({
        tenant_id: tenantId,
        professional_id: profId,
        service_id: serviceId,
      }));

      const { error: insErr } = await supabase
        .from("professional_services")
        .insert(rows);

      if (insErr) throw insErr;
    }

    /* ===========================================================
       3) SUCESSO
    ============================================================ */

    toast.success(
      isEditing
        ? "Serviço atualizado com sucesso!"
        : "Serviço cadastrado com sucesso!"
    );

    // AGORA VAI PERFEITAMENTE!  100% seguro e definido
    onSuccess?.(
      serviceFinal.id,
      serviceFinal.name,
      serviceFinal.duration_min
    );

    onClose();
  } catch (err) {
    console.error("[ModalNewService] Erro ao salvar:", err);
    toast.error("Erro ao salvar serviço.");
  } finally {
    setLoading(false);
  }
}

  if (!show) return null;

  // -------------------------------------------
  // RENDER
  // -------------------------------------------
  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={18} />
        </button>

        <h3>{isEditing ? "Editar serviço" : "Novo serviço"}</h3>

        {initialLoading ? (
          <p className={styles.empty}>Carregando...</p>
        ) : (
          <>
            <input
              className={styles.input}
              placeholder="Nome do serviço"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={styles.input}
              placeholder="Duração em minutos"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              type="number"
              min={0}
            />

            <input
              className={styles.input}
              placeholder="Preço (R$)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            {isEditing && (
              <label className={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Serviço ativo</span>
              </label>
            )}

            {/* PROFISSIONAIS */}
<h4 className={styles.sectionTitle}>Profissionais</h4>

{professionals.length === 0 ? (
  <p className={styles.smallMuted}>
    Nenhum profissional cadastrado ainda.
  </p>
) : (
  <div className={styles.checkList}>
    {professionals.map((prof) => {
      const checked = selectedProfessionalIds.includes(prof.id);

      return (
        <label
          key={prof.id}
          className={styles.checkItem}
          onClick={(e) => {
            // Evita toggle duplo quando clicado diretamente no input
            if ((e.target as HTMLElement).tagName !== "INPUT") {
              toggleProfessional(prof.id);
            }
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleProfessional(prof.id)}
          />
          <p className={styles.profName}>{prof.name}</p>
        </label>
      );
    })}
  </div>
)}

            <button
              className={styles.saveBtn}
              disabled={loading}
              onClick={handleSave}
            >
              {loading
                ? "Salvando..."
                : isEditing
                ? "Salvar alterações"
                : "Salvar serviço"}
            </button>
          </>
        )}
        
      </div>
    </div>
  );
}
