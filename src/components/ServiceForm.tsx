import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

import styles from "../css/ModalNewService.module.css";
import { formatCentsToBRL, parseBRLToCents, formatPriceInput } from "../utils/currencyUtils";
import { useUserTenant } from "../context/UserTenantProvider";

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

interface ServiceFormProps {
  tenantId?: string;
  mode: "new" | "edit";
  service?: ServiceRow;
  onSaveSuccess?: (id: string, name: string, duration: number) => void;
  onCancel?: () => void;
  isFromOnboarding?: boolean;
}

export default function ServiceForm({
  tenantId,
  mode,
  service,
  onSaveSuccess,
  onCancel,
  isFromOnboarding = false,
}: ServiceFormProps) {
  const isEditing = mode === "edit" && !!service;
  const { profile } = useUserTenant();
  const navigate = useNavigate();

  // campos do serviço
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<string>("60");
  const [price, setPrice] = useState<string>(formatCentsToBRL(0));
  const [isActive, setIsActive] = useState(true);

  // profissionais
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    (async () => {
      try {
        setInitialLoading(true);

        // Carrega profissionais (não mostra no onboarding para novo serviço)
        if (!isFromOnboarding || isEditing) {
          const { data: profs, error: profErr } = await supabase
            .from("professionals")
            .select("id,name,is_active")
            .eq("tenant_id", tenantId)
            .order("name");

          if (profErr) throw profErr;
          setProfessionals((profs || []) as ProfessionalRow[]);
        } else {
          setProfessionals([]);
        }

        if (isEditing && service) {
          setName(service.name);
          setDuration(String(service.duration_min ?? 60));
          setPrice(formatCentsToBRL(service.price_cents));
          setIsActive(service.is_active);

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
          setName("");
          setDuration("60");
          setPrice(formatCentsToBRL(0));
          setIsActive(true);

          // No onboarding, vincula automaticamente ao profissional do usuário
          if (isFromOnboarding && profile?.professional_id) {
            setSelectedProfessionalIds([profile.professional_id]);
          } else {
            setSelectedProfessionalIds([]);
          }
        }
      } catch (err) {
        console.error("[ServiceForm] Erro ao carregar:", err);
        toast.error("Erro ao carregar dados do serviço.");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [tenantId, isEditing, service, isFromOnboarding, profile?.professional_id]);

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
    const priceCents = parseBRLToCents(price);

    setLoading(true);

    try {
      let serviceFinal: { id: string; name: string; duration_min: number } | null = null;

      if (!isEditing) {
        const { data, error } = await supabase
          .from("services")
          .insert([
            {
              tenant_id: tenantId,
              name: trimmedName,
              duration_min: durationNumber,
              price_cents: priceCents,
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
        if (!service?.id) throw new Error("ID de serviço inválido para edição.");

        const { error } = await supabase
          .from("services")
          .update({
            name: trimmedName,
            duration_min: durationNumber,
            price_cents: priceCents,
            is_active: isActive,
          })
          .eq("tenant_id", tenantId)
          .eq("id", service.id);

        if (error) throw error;

        const { data, error: fetchErr } = await supabase
          .from("services")
          .select("id, name, duration_min")
          .eq("tenant_id", tenantId)
          .eq("id", service.id)
          .single();

        if (fetchErr || !data)
          throw fetchErr || new Error("Erro ao buscar serviço atualizado.");

        serviceFinal = data as any;
      }

      if (!serviceFinal) throw new Error("Falha inesperada: serviceFinal nulo.");

      const serviceId = serviceFinal.id;

      let finalProfessionalIds = selectedProfessionalIds;
      if (isFromOnboarding && profile?.professional_id) {
        finalProfessionalIds = [profile.professional_id];
      }

      const { error: delErr } = await supabase
        .from("professional_services")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("service_id", serviceId);

      if (delErr) throw delErr;

      if (finalProfessionalIds.length > 0) {
        const rows = finalProfessionalIds.map((profId) => ({
          tenant_id: tenantId,
          professional_id: profId,
          service_id: serviceId,
        }));

        const { error: insErr } = await supabase
          .from("professional_services")
          .insert(rows);

        if (insErr) throw insErr;
      }

      toast.success(isEditing ? "Serviço atualizado com sucesso!" : "Serviço cadastrado com sucesso!");

      onSaveSuccess?.(serviceFinal.id, serviceFinal.name, serviceFinal.duration_min);
      if (onCancel) {
        onCancel();
      } else {
        navigate(-1);
      }
    } catch (err) {
      console.error("[ServiceForm] Erro ao salvar:", err);
      toast.error("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.closeBtn} onClick={onCancel || (() => navigate(-1))}>
        <X size={18} />
      </div>

      <h3>{isEditing ? "Editar serviço" : "Novo serviço"}</h3>

      {initialLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <input
            className={styles.input}
            placeholder="Nome do serviço"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className={styles.inputWithUnit}>
            <input
              className={styles.input}
              placeholder="Duração"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              type="number"
              min={0}
            />
            <span className={styles.unitLabel}>minutos</span>
          </div>

          <input
            className={styles.input}
            placeholder="Preço (R$)"
            value={price}
            onChange={(e) => setPrice(formatPriceInput(e.target.value))}
            type="text"
          />

          {isEditing && (
            <label className={styles.switchRow as any}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Serviço ativo</span>
            </label>
          )}

          {!isFromOnboarding && (
            <>
              <h3 className={styles.sectionTitle}>Profissionais</h3>
              <h6>Selecione os profissionais que prestam esse serviço</h6>

              {professionals.length === 0 ? (
                <p className={styles.smallMuted}>Nenhum profissional cadastrado ainda.</p>
              ) : (
                <div className={styles.checkList}>
                  {professionals.map((prof) => {
                    const checked = selectedProfessionalIds.includes(prof.id);
                    return (
                      <label
                        key={prof.id}
                        className={styles.checkItem}
                        onClick={(e) => {
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
            </>
          )}

          <button
            className={styles.saveBtn}
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar serviço"}
          </button>
        </>
      )}
    </div>
  );
}