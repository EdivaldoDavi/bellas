import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { dateBR } from "../utils/date";
import DatePickerModalAgenda from "./DatePickerModalAgenda";
import styles from "../css/DatePickerModal.module.css";

interface Props {
  /** Data selecionada no formato YYYY-MM-DD */
  value: string;
  /** Callback quando o usuário escolhe uma data */
  onSelect: (date: string) => void;
}

/**
 * Componente para exibir um input de data estilizado que abre
 * o DatePickerModalAgenda ao clicar.
 */
export default function DatePickerAgenda({ value, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Campo visível com ícone de calendário */}
      <div className={styles.inputWrapper} onClick={() => setOpen(true)}>
        <input
          type="text"
          className={styles.input}
          readOnly
          value={value ? dateBR(value) : ""}
          placeholder="Selecione uma data"
        />
        <CalendarDays className={styles.icon} size={20} />
      </div>

      {/* Modal estilizado (igual ao DatePickerModal) */}
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <DatePickerModalAgenda
              value={value}
              onSelect={(iso) => {
                onSelect(iso);
                setOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
