import { useEffect, useState, useCallback } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";
import ModalNewProfessional from "../../../components/ModalNewProfessional";

type Professional = {
  id: string;
  name: string;
  is_active: boolean;
};

interface StepScheduleProps {
  onScheduleValidated: (isValid: boolean) => void;
}

export default function StepSchedule({ onScheduleValidated }: StepScheduleProps) {
  const { tenant, profile } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  // ADDED: nome do profissional selecionado derivado
  const selectedProfessionalName = professionals.find(p => p.id === selectedProfessionalId)?.name || "";

  /* ============================================================
     ✔ VALIDAR SE PROFISSIONAL TEM SERVIÇOS + HORÁRIOS
  ============================================================ */
  const validateProfessionalData = useCallback(async () => {
    if (!tenantId || !userId) {
      onScheduleValidated(false);
      return false;
    }

    // Buscar profissional logado
    const { data: prof } = await supabase
      .from("professionals")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!prof) {
      onScheduleValidated(false);
      return false;
    }

    const professionalId = prof.id;

    // GARANTIR QUE O PROFISSIONAL PADRÃO FIQUE SELECIONADO
    setSelectedProfessionalId(professionalId);

    // Verificar serviços
    const { count: serviceCount } = await supabase
      .from("professional_services")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId);

    if (!serviceCount) {
      onScheduleValidated(false);
      return false;
    }

    // Verificar horários
    const { count: scheduleCount } = await supabase
      .from("professional_schedules")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("professional_id", professionalId);

    if (!scheduleCount) {
      onScheduleValidated(false);
      return false;
    }

    onScheduleValidated(true);
    return true;
  }, [tenantId, userId, onScheduleValidated]);

  /* ============================================================
     ✔ CARREGAR PROFISSIONAIS
  ============================================================ */
  const loadProfessionals = useCallback(async () => {
    if (!tenantId) return;

    setLoadingProfessionals(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id,name,is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar profissionais.");
      setProfessionals([]);
      onScheduleValidated(false);
    } else {
      setProfessionals(data || []);
      await validateProfessionalData();
      // NÃO sobrescrever a seleção se já existe um selecionado (mantém o padrão)
      setSelectedProfessionalId(prev => prev || ((data && data.length > 0) ? data[0].id : ""));
    }

    setLoadingProfessionals(false);
  }, [tenantId, validateProfessionalData, onScheduleValidated]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  /* ============================================================
     RENDER – ULTRA PREMIUM
  ============================================================ */
  // Permitir cadastrar pelo menos mais um (habilita quando há 0 ou 1 profissionais)
  const disableAddProfessional = loadingProfessionals ? true : professionals.length > 1;

  return (
    <div className={styles.stepContainer}>

      {/* 🔥 TÍTULO + TEXTO MODERNOS */}
      <h2 className={styles.stepTitle}>Configure seus horários e atendimentos</h2>

      <p className={styles.stepText}>
        Aqui você gerencia os profissionais do seu Studio e define os horários 
        de atendimento. Você já foi cadastrado automaticamente como profissional, 
        mas pode adicionar novos profissionais agora mesmo.
      </p>

      {/* LISTA */}
      <div className={styles.professionalsListWrapper}>
        <p className={styles.servicesLabel}>Profissionais cadastrados:</p>

        {loadingProfessionals ? (
          <p className={styles.stepText}>Carregando profissionais...</p>
        ) : professionals.length === 0 ? (
          <p className={styles.emptyText}>Nenhum profissional cadastrado.</p>
        ) : (
          <ul className={styles.list}>
            {professionals.map(p => (
              <li key={p.id} className={`${styles.listItem} ${selectedProfessionalId === p.id ? styles.listItemSelected : ""}`}>
                <span className={styles.itemTitle}>{p.name}</span>

                <span className={`${styles.badge} ${p.is_active ? styles.badgeActive : styles.badgeInactive}`}>
                  {p.is_active ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ADDED: texto informando profissional selecionado */}
      {selectedProfessionalId && selectedProfessionalName && (
        <p className={styles.progressText}>Profissional selecionado: {selectedProfessionalName}</p>
      )}

      {/* BOTÃO */}
      <button
        className={styles.stepActionButton}
        onClick={() => setShowModal(true)}
        disabled={disableAddProfessional}
      >
        Cadastrar profissional
      </button>

      {/* MODAL */}
      {tenantId && showModal && (
        <ModalNewProfessional
          tenantId={tenantId}
          show={showModal}
          editId={null}
          mode="cadastro"
          onClose={() => {
            setShowModal(false);
            loadProfessionals();
          }}
          onSuccess={() => {
            setShowModal(false);
            loadProfessionals();
          }}
        />
      )}
    </div>
  );
}