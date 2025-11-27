import { Copy } from "lucide-react";
import { toast } from "react-toastify";

export default function CopyButton({ value }: { value: string }) {
  async function copy() {
    await navigator.clipboard.writeText(value);
    toast.success("Número copiado!", { autoClose: 1500 });
  }

  return (
    <button
      onClick={copy}
      style={{
        marginLeft: 6,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 4,
      }}
      title="Copiar número"
    >
      <Copy size={18} color="var(--text-muted)" />
    </button>
  );
}
