import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import styles from "../css/ModalNewProfessional.module.css";
import ModalSelectServiceForProfessional from "./ModalSelectServiceForProfessional";
import ModalSelectScheduleForProfessional from "./ModalSelectScheduleForProfessional";
import {
  formatPhoneInput,
  dbPhoneToMasked,
  maskedToDbPhone,
  
} from "../utils/phoneUtils";

interface ModalNewProfessionalProps {
  tenantId?: string;
  show: boolean;
  mode?: "agenda" | "cadastro";
  onClose: () => void;
  onSuccess?: (id: string, name: string) => void;
  editId?: string | null;
}

type Service = {
  id: string;
  name: string;
  duration_min: number | null;
};

export type DayRow = {
  weekday: number;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

const WEEKDAYS_FULL = [
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
] as const;

// Rótulos curtos para o resumo
const WEEKDAY_LABEL_SHORT: Record<number, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
  7: "Dom",
};

function stripSeconds(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function padSeconds(t: string) {
  if (!t) return "";
  return t.length === 5 ? `${t}:00` : t;
}

/* ============================================================
   📌 Utilitários de telefone
   - Máscara: (14) 99655-2177
   - Salvar: 5514996552177 (sem o usuário digitar 55)
============================================================ */


/**
 * Monta o texto de resumo dos horários a partir dos weekRows.
 * - Agrupa dias consecutivos com o mesmo horário.
 * - Exemplo: "Horários definidos: Seg a Sex: 09:00–18:00 (12:00–13:00)"
 * - Dias sem horário (sem start/end) são ignorados.
 */
function buildScheduleSummary(weekRows: DayRow[]): string {
  const activeDays = weekRows
    .filter((d) => d.start && d.end)
    .sort((a, b) => a.weekday - b.weekday);

  if (activeDays.length === 0) {
    return "Nenhum horário definido";
  }

  type Group = {
    startDay: number;
    endDay: number;
    start: string;
    end: string;
    breakStart: string;
    breakEnd: string;
  };

  const groups: Group[] = [];
  let current: Group | null = null;

  for (const day of activeDays) {
    if (!current) {
      current = {
        startDay: day.weekday,
        endDay: day.weekday,
        start: day.start,
        end: day.end,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
      };
      continue;
    }

    const sameSchedule =
      day.weekday === current.endDay + 1 &&
      day.start === current.start &&
      day.end === current.end &&
      day.breakStart === current.breakStart &&
      day.breakEnd === current.breakEnd;

    if (sameSchedule) {
      current.endDay = day.weekday;
    } else {
      groups.push(current);
      current = {
        startDay: day.weekday,
        endDay: day.weekday,
        start: day.start,
        end: day.end,
        breakStart: day.breakStart,
        breakEnd: day.breakEnd,
      };
    }
  }

  if (current) groups.push(current);

  const parts = groups.map((g) => {
    const sameDay = g.startDay === g.endDay;

    const dayText = sameDay
      ? WEEKDAY_LABEL_SHORT[g.startDay]
      : `${WEEKDAY_LABEL_SHORT[g.startDay]} a ${
          WEEKDAY_LABEL_SHORT[g.endDay]
        }`;

    const timeText = `${g.start}–${g.end}`;

    const hasBreak =
      g.breakStart &&
      g.breakEnd &&
      g.breakStart !== "00:00" &&
      g.breakEnd !== "00:00";

    const breakText = hasBreak ? ` (${g.breakStart}–${g.breakEnd})` : "";

    return `${dayText}: ${timeText}${breakText}`;
  });

  return `Horários definidos: ${parts.join(" | ")}`;
}

export default function ModalNewProfessional({
  tenantId,
  show,
  mode = "agenda",
  onClose,
  onSuccess,
  editId,
}: ModalNewProfessionalProps) {
  const isEditing = !!editId;

  // CAMPOS PRINCIPAIS
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // agora com máscara

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showSelectServices, setShowSelectServices] = useState(false);

  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // HORÁRIOS
  const emptyWeek: DayRow[] = WEEKDAYS_FULL.map((d) => ({
    weekday: d.id,
    start: "",
    end: "",
    breakStart: "",
    breakEnd: "",
  }));

  const [weekRows, setWeekRows] = useState<DayRow[]>(emptyWeek);
  const [copyToWeek, setCopyToWeek] = useState(true); // só para reabrir o modal no mesmo modo
  const [showSelectSchedule, setShowSelectSchedule] = useState(false);

  /* RESET QUANDO ABRE (somente novo cadastro) */
  useEffect(() => {
    if (!show) return;

    if (!isEditing) {
      setName("");
      setEmail("");
      setPhone("");
      setSelectedServices([]);
      setWeekRows(emptyWeek);
      setCopyToWeek(true);
    }
  }, [show, isEditing]);

  /* CARREGAR SERVIÇOS */
  useEffect(() => {
    if (!show || !tenantId) return;

    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) {
        toast.error("Erro ao carregar serviços");
        return;
      }

      setServices(data || []);
    })();
  }, [show, tenantId]);

  /* CARREGAR DADOS DE EDIÇÃO */
  useEffect(() => {
    if (!show || !tenantId || !editId) return;

    (async () => {
      try {
        setInitialLoading(true);

        // Dados do profissional
        const { data: prof } = await supabase
          .from("professionals")
          .select("name,email,phone")
          .eq("tenant_id", tenantId)
          .eq("id", editId)
          .single();

        if (prof) {
          setName(prof.name ?? "");
          setEmail(prof.email ?? "");
          // Converte o que vier do banco (provavelmente 5514996552177) para máscara
          setPhone(dbPhoneToMasked(prof.phone));
        }

        // Serviços vinculados
        const { data: links } = await supabase
          .from("professional_services")
          .select("service_id")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (links) {
          setSelectedServices(links.map((l) => l.service_id));
        }

        // Horários
        const { data: scheds } = await supabase
          .from("professional_schedules")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (scheds && scheds.length) {
          const rows = emptyWeek.map((w) => ({ ...w }));

          scheds.forEach((s: any) => {
            const r = rows.find((x) => x.weekday === s.weekday);
            if (r) {
              r.start = stripSeconds(s.start_time);
              r.end = stripSeconds(s.end_time);
              r.breakStart = stripSeconds(s.break_start_time);
              r.breakEnd = stripSeconds(s.break_end_time);
            }
          });

          setWeekRows(rows);
          setCopyToWeek(false);
        }
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar profissional");
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [show, tenantId, editId]);

  /* SALVAR */
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant inválido");
    if (!name.trim()) return toast.warn("Informe o nome");

    // Telefone agora é obrigatório
    if (!phone.trim()) {
      return toast.warn("Informe o telefone do profissional");
    }

    const dbPhone = maskedToDbPhone(phone);

    if (!dbPhone) {
      return toast.warn("Telefone inválido. Use o formato (99) 99999-9999");
    }

    if (selectedServices.length === 0) {
      return toast.warn("Selecione ao menos um serviço");
    }

    setSaving(true);

    try {
      let professionalId = editId;

      // NOVO
      if (!isEditing) {
        const { data, error } = await supabase
          .from("professionals")
          .insert([
            {
              tenant_id: tenantId,
              name,
              email: email || null,
              phone: dbPhone, // ✅ sempre "55" + 11 dígitos
            },
          ])
          .select()
          .single();

        if (error || !data) throw error;
        professionalId = data.id;
      }
      // EDITAR
      else if (professionalId) {
        await supabase
          .from("professionals")
          .update({
            name,
            email: email || null,
            phone: dbPhone, // ✅ sempre "55" + 11 dígitos
          })
          .eq("tenant_id", tenantId)
          .eq("id", professionalId);
      }

      if (!professionalId) throw new Error("ID inválido");

      // SERVIÇOS
      await supabase
        .from("professional_services")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      await supabase.from("professional_services").insert(
        selectedServices.map((sid) => ({
          tenant_id: tenantId,
          professional_id: professionalId!,
          service_id: sid,
        }))
      );

      // HORÁRIOS
      await supabase
        .from("professional_schedules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      const rowsToInsert = weekRows
        .filter((w) => w.start && w.end)
        .map((w) => ({
          tenant_id: tenantId,
          professional_id: professionalId,
          weekday: w.weekday,
          start_time: padSeconds(w.start),
          end_time: padSeconds(w.end),
          break_start_time: padSeconds(w.breakStart || "00:00"),
          break_end_time: padSeconds(w.breakEnd || "00:00"),
        }));

      if (rowsToInsert.length > 0) {
        await supabase.from("professional_schedules").insert(rowsToInsert);
      }

      toast.success(
        isEditing ? "Profissional atualizado!" : "Profissional cadastrado!"
      );

      onSuccess?.(professionalId, name);

      // Modo agenda: apenas fecha
      if (mode === "agenda") {
        onClose();
        return;
      }

      // Modo cadastro: reseta se for novo
      if (!isEditing) {
        setName("");
        setEmail("");
        setPhone("");
        setSelectedServices([]);
        setWeekRows(emptyWeek);
        setCopyToWeek(true);
      }

      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  const scheduleSummary = buildScheduleSummary(weekRows);
  const hideMainModal = showSelectServices || showSelectSchedule;

  return (
    <>
      {/* MODAL PRINCIPAL (PROFISSIONAL) */}
      <div
        className={styles.overlay}
        style={{ display: hideMainModal ? "none" : "flex" }}
      >
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X />
          </button>

          <h3>{isEditing ? "Editar profissional" : "Novo profissional"}</h3>

          {initialLoading ? (
            <p className={styles.emptyText}>Carregando dados...</p>
          ) : (
            <>
              <input
                className={styles.input}
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className={styles.input}
                placeholder="E-mail (opcional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className={styles.input}
                placeholder="Telefone (ex: (14) 99655-2177)"
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                maxLength={17} // (99) 99999-9999
              />

              {/* SERVIÇOS */}
              <h4>Serviços que executa</h4>

              <button
                className={styles.selectServicesBtn}
                onClick={() => setShowSelectServices(true)}
              >
                Selecionar serviços
              </button>

              <p className={styles.summaryText}>
                {selectedServices.length === 0
                  ? "Nenhum serviço selecionado"
                  : `${selectedServices.length} serviço(s) selecionado(s)`}
              </p>

              {/* HORÁRIOS */}
              <h4>Horários de trabalho</h4>

              <button
                className={styles.selectServicesBtn}
                onClick={() => setShowSelectSchedule(true)}
              >
                Definir horários
              </button>

              <p className={styles.summaryText}>{scheduleSummary}</p>

              {/* BOTÃO SALVAR */}
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Salvando..."
                  : isEditing
                  ? "Salvar alterações"
                  : "Salvar profissional"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE SELEÇÃO DE SERVIÇOS */}
      <ModalSelectServiceForProfessional
        show={showSelectServices}
        services={services}
        selectedIds={selectedServices}
        onClose={() => setShowSelectServices(false)}
        onSave={(ids) => {
          setSelectedServices(ids);
          setShowSelectServices(false);
        }}
      />

      {/* MODAL DE SELEÇÃO DE HORÁRIOS */}
      <ModalSelectScheduleForProfessional
        show={showSelectSchedule}
        weekRows={weekRows}
        copyToWeek={copyToWeek}
        onClose={() => setShowSelectSchedule(false)}
        onSave={(rows, copyFlag) => {
          setWeekRows(rows);
          setCopyToWeek(copyFlag);
          setShowSelectSchedule(false);
        }}
      />
    </>
  );
}
