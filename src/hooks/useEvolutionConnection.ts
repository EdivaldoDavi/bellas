import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================
   ESTADOS PADRÃO
============================================ */
export type EvoStatus =
  | "IDLE"
  | "OPENING"
  | "QRCODE"
  | "CONNECTED"
  | "DISCONNECTED"
  | "LOGGED_OUT"
  | "ERROR"
  | "UNKNOWN"
  | "OPEN"            // engines que chamam assim
  | "AUTHENTICATED";  // engines que chamam assim

interface Options {
  baseUrl?: string;
  autostart?: boolean;
  initialInstanceId?: string; // tenant_xxx
}

/* ============================================
   HOOK PRINCIPAL
============================================ */
export function useEvolutionConnection(opts: Options = {}) {
  const baseUrl =
    opts.baseUrl ||
    import.meta.env.VITE_EVO_PROXY_URL ||
    "http://localhost:3001/api";

  const logicalInstanceId = opts.initialInstanceId ?? "";
  const autostart = opts.autostart ?? false;

  const [realInstanceId, setRealInstanceId] = useState<string>("");
  const [status, setStatus] = useState<EvoStatus>("IDLE");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const stoppedRef = useRef(false);

  /* ============================================
      FECHAR SSE
  ============================================= */
  const closeSSE = useCallback(() => {
    try {
      sseRef.current?.close();
    } catch {}
    sseRef.current = null;
  }, []);

  /* ============================================
      NORMALIZAR 100% DOS FORMATOS DE QR DETECTADOS
  ============================================= */
  const normalizeQR = (raw: any): string | null => {
    if (!raw) return null;

    // já é dataURL
    if (typeof raw === "string" && raw.startsWith("data:image/"))
      return raw;

    // string base64 pura
    if (typeof raw === "string" && /^[A-Za-z0-9+/=]+$/.test(raw)) {
      return `data:image/png;base64,${raw}`;
    }

    // Possíveis caminhos EvolutionAPI
    const candidate =
      raw?.qr?.base64 ||
      raw?.qrcode?.base64 ||
      raw?.qrcode ||
      raw?.base64 ||
      raw?.image ||
      raw?.img ||
      raw?.data ||
      null;

    if (!candidate) return null;

    if (typeof candidate === "string") {
      return candidate.startsWith("data:image/")
        ? candidate
        : `data:image/png;base64,${candidate}`;
    }

    return null;
  };

  /* ============================================
      TRATAR QR
  ============================================= */
  const handleQR = useCallback((payload: any) => {
    const qr = normalizeQR(payload);
    if (!qr) {
      console.log("⚪ QR ignorado:", payload);
      return;
    }
    console.log("✅ QR detectado");
    setQrBase64(qr);
    setStatus("QRCODE");
  }, []);

  /* ============================================
      STATUS HELPER
  ============================================= */
  const applyStatus = (st: string) => {
    const up = String(st || "").toUpperCase() as EvoStatus;

    let normalized: EvoStatus = up;

    if (up === "OPEN" || up === "AUTHENTICATED") {
      normalized = "CONNECTED";
    }

    if (normalized === "CONNECTED") {
      setQrBase64(null);
      setConnectedAt(new Date().toISOString());
    }

    console.log("📡 STATUS:", normalized);
    setStatus(normalized);
  };

  /* ============================================
      SSE STREAM
  ============================================= */
  const openSSE = useCallback(
    (instanceName: string) => {
      if (!instanceName) return;

      closeSSE();
      stoppedRef.current = false;

      const url = `${baseUrl}/evo/stream?instanceId=${encodeURIComponent(
        instanceName
      )}`;

      console.log("🔵 Abrindo SSE:", url);

      const es = new EventSource(url);
      sseRef.current = es;

      es.addEventListener("open", () => {
        console.log("✅ SSE conectado");
      });

      /* ---- STATUS ---- */
      es.addEventListener("status", (evt: MessageEvent) => {
        try {
          const json = JSON.parse(evt.data);
          applyStatus(
            json?.status ||
              json?.state ||
              json?.connectionStatus ||
              "UNKNOWN"
          );
        } catch {}
      });

      /* ---- QR ---- */
      const qrEvents = ["qr", "qrcode", "QRCODE", "base64", "message"];
      qrEvents.forEach((ev) => {
        es.addEventListener(ev, (evt: MessageEvent) => {
          try {
            handleQR(JSON.parse(evt.data));
          } catch {
            handleQR(evt.data);
          }
        });
      });

      /* ---- ERRO / RECONNECT ---- */
      es.onerror = () => {
        console.log("❌ SSE erro — tentando reconectar...");
        if (stoppedRef.current) return;
        setTimeout(() => openSSE(instanceName), 2000);
      };
    },
    [baseUrl, closeSSE, handleQR]
  );

  /* ============================================
      START INSTANCE → obtém instance REAL + SSE
  ============================================= */
  const start = useCallback(async () => {
    if (!logicalInstanceId) {
      setError("instanceId lógico não informado");
      return;
    }

    setLoading(true);
    setStatus("OPENING");
    setError(null);

    try {
      const resp = await fetch(
        `${baseUrl}/evo/start?instanceId=${encodeURIComponent(
          logicalInstanceId
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const json = await resp.json();

      if (!resp.ok) throw new Error(json?.error || "Falha ao iniciar");

      const realId = json.usedInstanceName || json.instanceName;
      if (!realId) throw new Error("Back-end não retornou instanceName real.");

      console.log("✅ Instance REAL:", realId);
      setRealInstanceId(realId);

      // se vem QR imediato
      handleQR(json);

      // iniciar SSE
      openSSE(realId);
    } catch (err: any) {
      console.log("❌ START ERROR:", err);
      setStatus("ERROR");
      setError(err?.message || "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, [logicalInstanceId, baseUrl, openSSE, handleQR]);

  /* ============================================
      LOGOUT
  ============================================= */
  const logout = useCallback(async () => {
    if (!realInstanceId) return;

    try {
      await fetch(
        `${baseUrl}/evo/logout?instanceId=${encodeURIComponent(
          realInstanceId
        )}`,
        { method: "DELETE" }
      );
    } catch {}

    closeSSE();
    setQrBase64(null);
    setStatus("LOGGED_OUT");
  }, [realInstanceId, baseUrl, closeSSE]);

  /* ============================================
      AUTO START
  ============================================= */
  useEffect(() => {
    if (autostart && logicalInstanceId) start();
  }, [autostart, logicalInstanceId, start]);

  /* ============================================
      CLEANUP
  ============================================= */
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      closeSSE();
    };
  }, [closeSSE]);

  /* ============================================
      EXPORT
  ============================================= */
  return {
    logicalInstanceId,
    realInstanceId,
    status,
    qrBase64,
    error,
    loading,
    connectedAt,
    start,
    logout,
    setRealInstanceId,
  };
}
