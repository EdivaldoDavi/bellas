import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import styles from "../css/ModalNewProfessional.module.css";
import ModalSelectServiceForProfessional from "./ModalSelectServiceForProfessional";
import ModalSelectScheduleForProfessional from "./ModalSelectScheduleForProfessional";

/* ============================================================
   TIPOS
============================================================ */
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

type DayRow = {
  weekday: number;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

const WEEKDAYS_FULL = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
  { id: 7, label: "Dom" },
];

function stripSeconds(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function padSeconds(t: string) {
  return t.length === 5 ? `${t}:00` : t;
}

/* ============================================================
   COMPONENTE PRINCIPAL
============================================================ */
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
  const [phone, setPhone] = useState("");

  // SERVIÇOS
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showSelectServices, setShowSelectServices] = useState(false);

  // HORÁRIOS
  const emptyWeek: DayRow[] = WEEKDAYS_FULL.map((d) => ({
    weekday: d.id,
    start: "",
    end: "",
    breakStart: "",
    breakEnd: "",
  }));

  const [copyToWeek, setCopyToWeek] = useState(true);
  const [weekRows, setWeekRows] = useState<DayRow[]>(emptyWeek);
  const [showSelectSchedule, setShowSelectSchedule] = useState(false);

  // CONTROLE
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  /* ============================================================
     RESET AO ABRIR
  ============================================================ */
  useEffect(() => {
    if (!show) return;

    if (!isEditing) {
      setName("");
      setEmail("");
      setPhone("");
      setSelectedServices([]);

      setCopyToWeek(true);
      setWeekRows(emptyWeek);
    }
  }, [show, isEditing]);

  /* ============================================================
     CARREGAR SERVIÇOS
  ============================================================ */
  useEffect(() => {
    if (!show || !tenantId) return;

    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,duration_min")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) return toast.error("Erro ao carregar serviços");
      setServices(data || []);
    })();
  }, [show, tenantId]);

  /* ============================================================
     CARREGAR PROFISSIONAL PARA EDIÇÃO
  ============================================================ */
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
          setPhone(prof.phone ?? "");
        }

        // Serviços selecionados
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

  /* ============================================================
     RESUMO DE HORÁRIOS (OPÇÃO D)
  ============================================================ */
  function renderScheduleSummary() {
    const filled = weekRows.filter((r) => r.start && r.end);
    if (filled.length === 0) return "Nenhum horário definido";

    return (
      <div style={{ marginTop: 6 }}>
        <strong>🕒 Horários definidos</strong>
        {filled.map((r) => {
          const d = WEEKDAYS_FULL.find((w) => w.id === r.weekday)?.label;
          const lunch =
            r.breakStart && r.breakEnd
              ? ` (${r.breakStart}–${r.breakEnd})`
              : "";

          return (
            <div key={r.weekday}>
              • {d}: {r.start}–{r.end}
              {lunch}
            </div>
          );
        })}
      </div>
    );
  }

  /* ============================================================
     SALVAR PROFISSIONAL
  ============================================================ */
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant inválido");
    if (!name.trim()) return toast.warn("Informe o nome");
    if (selectedServices.length === 0)
      return toast.warn("Selecione ao menos um serviço");

    setSaving(true);

    try {
      let professionalId = editId;

      /* NOVO PROFISSIONAL */
      if (!isEditing) {
        const { data, error } = await supabase
          .from("professionals")
          .insert([
            {
              tenant_id: tenantId,
              name,
              email: email || null,
              phone: phone || null,
            },
          ])
          .select()
          .single();

        if (error || !data) throw error;
        professionalId = data.id;
      }

      /* EDITAR PROFISSIONAL */
      else {
        await supabase
          .from("professionals")
          .update({
            name,
            email: email || null,
            phone: phone || null,
          })
          .eq("tenant_id", tenantId)
          .eq("id", professionalId);
      }

      if (!professionalId) throw new Error("ID inválido");

      /* SERVIÇOS */
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

      /* HORÁRIOS */
      await supabase
        .from("professional_schedules")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      const rows: any[] = [];

      weekRows.forEach((w) => {
        if (w.start && w.end) {
          rows.push({
            tenant_id: tenantId,
            professional_id: professionalId,
            weekday: w.weekday,
            start_time: padSeconds(w.start),
            end_time: padSeconds(w.end),
            break_start_time: padSeconds(w.breakStart),
            break_end_time: padSeconds(w.breakEnd),
          });
        }
      });

      await supabase.from("professional_schedules").insert(rows);

      toast.success(isEditing ? "Profissional atualizado!" : "Profissional cadastrado!");
      onSuccess?.(professionalId, name);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  }

  if (!show) return null;

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <>
      <div
        className={styles.overlay}
        style={{ display: showSelectServices || showSelectSchedule ? "none" : "flex" }}
      >
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X />
          </button>

          <h3>{isEditing ? "Editar profissional" : "Novo profissional"}</h3>

          {initialLoading ? (
            <p>Carregando...</p>
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
                placeholder="Telefone (opcional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              {/* ========== SERVIÇOS ========== */}
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

              {/* ========== HORÁRIOS ========== */}
              <h4>Horários de trabalho</h4>

              <button
                className={styles.selectServicesBtn}
                onClick={() => setShowSelectSchedule(true)}
              >
                Definir horários
              </button>

              {renderScheduleSummary()}

              {/* ========== SALVAR ========== */}
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

      {/* ========= MODAIS INTERNOS ========= */}
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

      <ModalSelectScheduleForProfessional
        show={showSelectSchedule}
        weekRows={weekRows}
        copyToWeek={copyToWeek}
        onClose={() => setShowSelectSchedule(false)}
        onSave={(rows, flag) => {
          setWeekRows(rows);
          setCopyToWeek(flag);
          setShowSelectSchedule(false);
        }}
      />
    </>
  );
}
