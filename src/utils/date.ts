// src/utils/date.ts
import {  supabase } from "../lib/supabaseCleint";
import { toast } from "react-toastify";

export async function checkAvailableTimes(dateStr: string, profId: string) {
  if (!dateStr || !profId) return false;

  const { startISO, endISO } = getDayBoundsISO(dateStr);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, starts_at")
    .eq("professional_id", profId)
    .gte("starts_at", startISO)
    .lte("starts_at", endISO);

  if (!appointments || appointments.length === 0) {
    toast.warn("Não há horários disponíveis para este profissional na data escolhida.");
    return false;
  }

  return true;
}


export function isInvalidAppointmentDate(dateStr: string) {
  if (!dateStr) return true;
  if (isPastDateLocal(dateStr)) return true;
  if (getWeekdayLocal(dateStr) === 7) return true; // domingo
  if (isHoliday(dateStr)) return true;
  return false;
}


/** Parse date string YYYY-MM-DD to local Date */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Check if date is in the past (local) */
export function isPastDateLocal(dateStr: string): boolean {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sel = parseLocalDate(dateStr);
  return sel.getTime() < t.getTime();
}

/** Weekday Monday=1 ... Sunday=7 */
export function getWeekdayLocal(dateStr: string): number {
  const wd = parseLocalDate(dateStr).getDay(); // 0..6 (Sun..Sat)
  return wd === 0 ? 7 : wd; // convert Sunday to 7
}

/** Combine YYYY-MM-DD and HH:mm to local Date */
export function combineLocalDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh, mm);
}

/** Convert date to local ISO (no UTC shift) */
export function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Get ISO bounds of a day in local timezone */
export function getDayBoundsISO(dateStr: string) {
  const base = parseLocalDate(dateStr);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59);
  return {
    startISO: toLocalISOString(start),
    endISO: toLocalISOString(end),
  };
}

/** Fixed Brazilian holidays (MM-DD) */
export const fixedHolidays = [
  "01-01", "04-21", "05-01", "09-07",
  "10-12", "11-02", "11-15", "12-25",
];

export function isHoliday(dateStr: string): boolean {
  return fixedHolidays.includes(dateStr.slice(5));
}

/** Format weekday in pt-BR */
export const weekdayName = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("pt-BR", { weekday: "long" });
};

/** Format date to dd/mm/yyyy */
export const dateBR = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};
