import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";
import { X } from "lucide-react";

import styles from "../css/ModalNewProfessional.module.css";
import ModalSelectServiceForProfessional from "./ModalSelectServiceForProfessional";

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
  { id: 1, label: "Segunda-feira" },
  { id: 2, label: "Terça-feira" },
  { id: 3, label: "Quarta-feira" },
  { id: 4, label: "Quinta-feira" },
  { id: 5, label: "Sexta-feira" },
  { id: 6, label: "Sábado" },
  { id: 7, label: "Domingo" },
];

function stripSeconds(t?: string | null) {
  if (!t) return "";
  return t.slice(0, 5);
}

function padSeconds(t: string) {
  return t.length === 5 ? `${t}:00` : t;
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
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

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
  const [monStart, setMonStart] = useState("09:00");
  const [monEnd, setMonEnd] = useState("18:00");
  const [monBreakStart, setMonBreakStart] = useState("00:00");
  const [monBreakEnd, setMonBreakEnd] = useState("00:00");

  const [weekRows, setWeekRows] = useState<DayRow[]>(emptyWeek);

  /* ------------------------------------------------------------------
     EVITAR FECHAMENTO INDESEJADO DO MODAL SECUNDÁRIO
     -> Quando showSelectServices = true, REMOVEMOS O MODAL PRINCIPAL DO DOM
  ------------------------------------------------------------------- */
  if (showSelectServices) {
    return (
      <ModalSelectServiceForProfessional
        show={true}
        services={services}
        selectedIds={selectedServices}
        onClose={() => setShowSelectServices(false)}
        onSave={(ids) => {
          setSelectedServices(ids);
          setShowSelectServices(false);
        }}
      />
    );
  }

  /* ------------------------------------------------------------------
     SE O MODAL PRINCIPAL NÃO DEVE APARECER → NÃO RENDERIZA NADA
  ------------------------------------------------------------------- */
  if (!show) return null;

  /* ------------------------------------------------------------------
     RESET (somente para criação)
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (!show) return;

    if (!isEditing) {
      setName("");
      setEmail("");
      setPhone("");
      setSelectedServices([]);

      setCopyToWeek(true);
      setMonStart("09:00");
      setMonEnd("18:00");
      setMonBreakStart("00:00");
      setMonBreakEnd("00:00");

      setWeekRows(emptyWeek);
    }
  }, [show, isEditing]);

  /* ----------------------------- CARREGAR SERVIÇOS ------------------------------ */
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

  /* ----------------------------- CARREGAR EDIÇÃO ------------------------------ */
  useEffect(() => {
    if (!show || !tenantId || !editId) return;

    (async () => {
      try {
        setInitialLoading(true);

        // DADOS
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

        // SERVIÇOS
        const { data: links } = await supabase
          .from("professional_services")
          .select("service_id")
          .eq("tenant_id", tenantId)
          .eq("professional_id", editId);

        if (links) {
          setSelectedServices(links.map((l) => l.service_id));
        }

        // HORÁRIOS
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

  /* ----------------------------- SALVAR ------------------------------ */
  async function handleSave() {
    if (!tenantId) return toast.error("Tenant inválido");
    if (!name.trim()) return toast.warn("Informe o nome");
    if (selectedServices.length === 0)
      return toast.warn("Selecione ao menos um serviço");

    setSaving(true);

    try {
      let professionalId = editId;

      /* NOVO */
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

      /* EDITAR */
      else if (professionalId) {
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

      if (copyToWeek) {
        for (let d = 1; d <= 6; d++) {
          rows.push({
            tenant_id: tenantId,
            professional_id: professionalId,
            weekday: d,
            start_time: padSeconds(monStart),
            end_time: padSeconds(monEnd),
            break_start_time: padSeconds(monBreakStart),
            break_end_time: padSeconds(monBreakEnd),
          });
        }
      } else {
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
      }

      await supabase.from("professional_schedules").insert(rows);

      toast.success(isEditing ? "Profissional atualizado!" : "Profissional cadastrado!");

      onSuccess?.(professionalId, name);

      if (mode === "agenda") return onClose();

      if (!isEditing) {
        setName("");
        setEmail("");
        setPhone("");
        setSelectedServices([]);
        setWeekRows(emptyWeek);
      }

      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar profissional");
    } finally {
      setSaving(false);
    }
  }

  /* ----------------------------- RENDER ------------------------------ */

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
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
              placeholder="Telefone (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

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

            <h4>Horários de trabalho</h4>

            <label className={styles.copyRow}>
              <input
                type="checkbox"
                checked={copyToWeek}
                onChange={() => setCopyToWeek((v) => !v)}
              />
              <span>Copiar segunda para todos os dias</span>
            </label>

            {copyToWeek ? (
              <>
                <div className={styles.dayTitle}>Segunda-feira</div>

                <div className={styles.timeGrid}>
                  <div>
                    <label>Entrada</label>
                    <input
                      type="time"
                      value={monStart}
                      onChange={(e) => setMonStart(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Saída</label>
                    <input
                      type="time"
                      value={monEnd}
                      onChange={(e) => setMonEnd(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Almoço início</label>
                    <input
                      type="time"
                      value={monBreakStart}
                      onChange={(e) => setMonBreakStart(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Almoço fim</label>
                    <input
                      type="time"
                      value={monBreakEnd}
                      onChange={(e) => setMonBreakEnd(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              WEEKDAYS_FULL.map((d) => {
                const r = weekRows.find((x) => x.weekday === d.id)!;

                return (
                  <div key={d.id} className={styles.dayBlock}>
                    <div className={styles.dayTitle}>{d.label}</div>

                    <div className={styles.timeGrid}>
                      <div>
                        <label>Entrada</label>
                        <input
                          type="time"
                          value={r.start}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((x) =>
                                x.weekday === d.id
                                  ? { ...x, start: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>Saída</label>
                        <input
                          type="time"
                          value={r.end}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((x) =>
                                x.weekday === d.id
                                  ? { ...x, end: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>Almoço início</label>
                        <input
                          type="time"
                          value={r.breakStart}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((x) =>
                                x.weekday === d.id
                                  ? { ...x, breakStart: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>

                      <div>
                        <label>Almoço fim</label>
                        <input
                          type="time"
                          value={r.breakEnd}
                          onChange={(e) =>
                            setWeekRows((prev) =>
                              prev.map((x) =>
                                x.weekday === d.id
                                  ? { ...x, breakEnd: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

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
  );
}
