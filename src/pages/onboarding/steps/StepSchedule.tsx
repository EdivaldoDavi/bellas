// src/pages/onboarding/steps/StepSchedule.tsx
import { useEffect, useState, useCallback } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";
import ProfessionalsPage from "../../ProfessionalsPage";

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

  /* ============================================================
     ✅ VALIDAR DADOS DO PROFISSIONAL (para habilitar o 'Continuar')
  ============================================================ */
  const validateProfessionalData = useCallback(async () => {
    console.log("StepSchedule: validateProfessionalData called.");
    if (!tenantId || !userId) {
      console.warn("StepSchedule: validateProfessionalData - Missing tenantId or userId. Validation failed.");
      onScheduleValidated(false);
      return false;
    }

    try {
      // 1. Buscar o professional_id associado ao usuário logado
      const { data: prof, error: profFetchError } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle(); // Use maybeSingle to avoid throwing if not found

      if (profFetchError) {
        console.error("StepSchedule: validateProfessionalData - Erro ao buscar profissional:", profFetchError);
        onScheduleValidated(false);
        return false;
      }
      if (!prof) {
        console.warn("StepSchedule: validateProfessionalData - Profissional não encontrado para user_id:", userId);
        onScheduleValidated(false);
        return false;
      }

      const professionalId = prof.id;
      console.log("StepSchedule: validateProfessionalData - Professional ID encontrado:", professionalId);

      // 2. Verificar se o profissional tem serviços associados
      const { count: serviceCount, error: serviceCountError } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (serviceCountError) {
        console.error("StepSchedule: validateProfessionalData - Erro ao verificar contagem de serviços:", serviceCountError);
        onScheduleValidated(false);
        return false;
      }

      console.log("StepSchedule: validateProfessionalData - Contagem de serviços para o profissional:", serviceCount);
      if (!serviceCount || serviceCount === 0) {
        console.warn("StepSchedule: validateProfessionalData - Nenhum serviço associado ao profissional.");
        onScheduleValidated(false);
        return false;
      }

      // 3. Verificar se o profissional tem horários definidos
      const { count: scheduleCount, error: scheduleCountError } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (scheduleCountError) {
        console.error("StepSchedule: validateProfessionalData - Erro ao verificar contagem de horários:", scheduleCountError);
        onScheduleValidated(false);
        return false;
      }

      console.log("StepSchedule: validateProfessionalData - Contagem de horários para o profissional:", scheduleCount);
      if (!scheduleCount || scheduleCount === 0) {
        console.warn("StepSchedule: validateProfessionalData - Nenhum horário definido para o profissional.");
        onScheduleValidated(false);
        return false;
      }

      // Tudo certo
      console.log("StepSchedule: validateProfessionalData - Validação bem-sucedida. onScheduleValidated(true) called.");
      onScheduleValidated(true);
      return true;
    } catch (err) {
      console.error("StepSchedule: validateProfessionalData - Erro geral na validação:", err);
      onScheduleValidated(false);
      return false;
    }
  }, [tenantId, userId, onScheduleValidated]); // Removed `profile` from dependencies as `userId` is sufficient and more stable.

  /* ============================================================
     🔥 CARREGAR PROFISSIONAIS
  ============================================================ */
  const loadProfessionals = useCallback(async () => {
    console.log("StepSchedule: loadProfessionals called.");
    if (!tenantId) {
      console.log("StepSchedule: loadProfessionals - No tenantId, skipping fetch.");
      setProfessionals([]);
      setLoadingProfessionals(false);
      onScheduleValidated(false);
      return;
    }
    setLoadingProfessionals(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id,name,is_active")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      console.error("StepSchedule: Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar profissionais.");
      setProfessionals([]);
      onScheduleValidated(false);
    } else {
      console.log("StepSchedule: Profissionais carregados:", data);
      setProfessionals((data || []) as Professional[]);
      // Call validation after professionals are loaded
      await validateProfessionalData();
    }
    setLoadingProfessionals(false);
    console.log("StepSchedule: loadProfessionals finished.");
  }, [tenantId, onScheduleValidated, validateProfessionalData]); // Added validateProfessionalData to dependencies

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]); // Depend on the memoized loadProfessionals


  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className={styles.stepContainer}>
      {/*
      <h2 className={styles.stepTitle}>
        Escolha o(s) profissionais que irão atender
      </h2>

      <p className={styles.stepText}>
        Aqui você pode ajustar os horários dos profissionais do Studio. Por
        padrão, você já foi cadastrado como profissional com horários de
        09:00 às 18:00 todos os dias. Se quiser ajustar agora, clique em{" "}
        <strong>Ajustar horários agora</strong>.
      </p>
*/}
      {/* LISTA DE PROFISSIONAIS */}
      <div className={styles.professionalsListWrapper}>
        <p className={styles.servicesLabel}>Profissionais cadastrados: </p>

        {loadingProfessionals ? (
          <p className={styles.stepText}>Carregando profissionais...</p>
        ) : professionals.length === 0 ? (
          <p className={styles.emptyText}>Nenhum profissional cadastrado.</p>
        ) : (
          <ul className={styles.professionalsList}>
            {professionals.map((p) => (
              <li key={p.id} className={styles.professionalItem}>
                <div className={styles.professionalNameAndStatus}> {/* Novo wrapper */}
                  <span>{p.name}</span>
                  <span
                    className={
                      p.is_active
                        ? styles.statusBadgeActive
                        : styles.statusBadgeInactive
                    }
                  >
                    {p.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTÕES */}
      {/* The navigation buttons are now handled by OnboardingFixedNavigation */}
      <button
        className={styles.stepActionButton} // Apply new style
        onClick={() => setShowModal(true)}
      >
        Cadastrar profissional
      </button>

      {tenantId && showModal && (
        <ProfessionalsPage onClose={() => {
          setShowModal(false);
          loadProfessionals(); // Reload professionals after modal closes
        }} />
      )}
    </div>
  );
}