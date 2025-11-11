import { useCallback, useEffect, useRef, useState } from "react";

export type EvoStatus =
  | "IDLE"
  | "OPENING"
  | "QRCODE"
  | "CONNECTED"
  | "DISCONNECTED"
  | "LOGGED_OUT"
  | "ERROR"
  | "UNKNOWN";

interface Options {
  baseUrl?: string;
  autostart?: boolean;
  initialInstanceId?: string;
}

export function useEvolutionConnection(opts: Options = {}) {
  /* ---------------------------------------------------------
     CONFIG
  --------------------------------------------------------- */
  const baseUrl =
    opts.baseUrl ||
    import.meta.env.VITE_EVO_PROXY_URL ||
    "http://localhost:3001/api";

  const evoToken = import.meta.env.VITE_EVO_TOKEN ?? "";
  const logicalInstanceId = (opts.initialInstanceId ?? "").trim();
  const autostart = !!opts.autostart;

  /* ---------------------------------------------------------
     STATES
  --------------------------------------------------------- */
  const [realInstanceId, setRealInstanceId] = useState("");
  const [status, setStatus] = useState<EvoStatus>("IDLE");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     CONTROL REFS
  --------------------------------------------------------- */
  const didLogoutRef = useRef(false);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const lastStatusRef = useRef<EvoStatus>("IDLE");
  const startedForRef = useRef<string | null>(null);

  /* ---------------------------------------------------------
     HELPERS
  --------------------------------------------------------- */
  const closeSSE = useCallback(() => {
    try {
      sseRef.current?.close();
    } catch {}
    sseRef.current = null;

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const extractStatus = (raw: any) => {
    if (!raw) return "UNKNOWN";
    if (typeof raw === "string") return raw;
    if (raw.status) return raw.status;
    if (raw.instance?.state) return raw.instance.state;
    return "UNKNOWN";
  };

  const normalizeQR = (raw: any): string | null => {
    if (!raw) return null;
    if (typeof raw === "string") {
      if (raw.startsWith("data:image/")) return raw;
      return `data:image/png;base64,${raw}`;
    }

    const base =
      raw?.qr?.base64 ||
      raw?.qrcode?.base64 ||
      raw?.base64 ||
      raw?.qrcode ||
      null;

    return base ? `data:image/png;base64,${base}` : null;
  };

const mapStatus = (raw: any): EvoStatus => {
  if (!raw) return "UNKNOWN";
  const s = String(raw).toLowerCase().trim();

  // 🔥 ESTADOS DE CONECTADO
  if (
    s === "open" ||
    s === "connected" ||
    s.includes("connected") ||
    s.includes("sessionconnected") ||
    s.includes("session_active") ||
    s.includes("sessionactive") ||
    s.includes("session_activated") ||
    s.includes("open_session") ||
    s.includes("opensession") ||
    s.includes("online") ||
    s.includes("ready") ||
    s.includes("active")
  ) {
    return "CONNECTED";
  }

  // 🔥 Estados de CONNECTING
  if (
    s === "openning" ||
    s.includes("opening") ||
    s.includes("initializing")
  ) {
    return "OPENING";
  }

  // 🔥 Estados de QR
  if (
    s.includes("qr") ||
    s.includes("scan") ||
    s.includes("waiting")
  ) {
    return "QRCODE";
  }

  // 🔥 Estados de desconectado
  if (
    s === "close" ||
    s.includes("offline") ||
    s.includes("logout") ||
    s.includes("closed")
  ) {
    return "DISCONNECTED";
  }

  return "UNKNOWN";
};


  const setStatusSafe = (next: EvoStatus) => {
    if (lastStatusRef.current !== next) {
      lastStatusRef.current = next;
      setStatus(next);
    }
    if (next === "CONNECTED") {
      setQrBase64(null);
      setPairingCode(null);
    }
  };

  /* ---------------------------------------------------------
     SSE STREAM
  --------------------------------------------------------- */
const openSSE = useCallback(
  (instanceId: string) => {
    if (!instanceId || didLogoutRef.current) return;

    closeSSE();

    const es = new EventSource(
      `${baseUrl}/evo/stream?instanceId=${instanceId}&token=${evoToken}`
    );

    sseRef.current = es;

    /* ✅ CAPTURA STATUS DO SSE */
    es.addEventListener("status", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);

        // ✅ AQUI → loga o valor bruto enviado pelo backend
        console.log("📡 RAW SSE STATUS EVENT →", data);

        // ✅ Processamento normal
        const raw = extractStatus(data);

        // ✅ AQUI → loga antes e depois do mapeamento
        console.log("📡 RAW STATUS RECEBIDO →", raw);
        const mapped = mapStatus(raw);
        console.log("✅ STATUS NORMALIZADO →", mapped);

        // ✅ Aplica o status no React
        setStatusSafe(mapped);

      } catch (err) {
        console.warn("Erro ao processar status SSE:", err);
      }
    });

    /* ✅ CAPTURA QR */
    es.addEventListener("qr", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);
        const qr = normalizeQR(data?.base64 ?? data);

        if (qr && lastStatusRef.current !== "CONNECTED") {
          setQrBase64(qr);
          setStatusSafe("QRCODE");
        }
      } catch {}
    });

    es.onerror = () => {
      if (didLogoutRef.current) return;
      reconnectTimerRef.current = window.setTimeout(
        () => openSSE(instanceId),
        2000
      );
    };
  },
  [baseUrl, evoToken, closeSSE]
);

  /* ---------------------------------------------------------
     START INSTANCE
  --------------------------------------------------------- */
  const start = useCallback(async () => {
    if (!logicalInstanceId) {
      setError("instanceId lógico ausente");
      return;
    }

    didLogoutRef.current = false;

    if (startedForRef.current === logicalInstanceId && realInstanceId) {
      openSSE(realInstanceId);
      return;
    }

    setLoading(true);
    setError(null);
    setStatusSafe("OPENING");

    try {
      const resp = await fetch(
        `${baseUrl}/evo/start?instanceId=${logicalInstanceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || "Erro ao iniciar instância");

      const inst =
        json?.usedInstanceName ||
        json?.instanceName ||
        json?.instance?.instanceName ||
        logicalInstanceId;

      setRealInstanceId(inst);
      startedForRef.current = logicalInstanceId;

      const firstQR =
        json?.base64 || json?.qr?.base64 || json?.qrcode?.base64 || null;

      if (firstQR) {
        const q = normalizeQR(firstQR);
        if (q) {
          setQrBase64(q);
          setStatusSafe("QRCODE");
        }
      }

      openSSE(inst);
    } catch (err: any) {
      setStatusSafe("ERROR");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, logicalInstanceId, realInstanceId, openSSE]);

  /* ---------------------------------------------------------
     REFRESH
  --------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (didLogoutRef.current) return;

    const id = realInstanceId || logicalInstanceId;
    if (!id) return;

    try {
      const r = await fetch(`${baseUrl}/evo/status?instanceId=${id}`);
      const j = await r.json();

      const mapped = mapStatus(extractStatus(j));
      setStatusSafe(mapped);

      if (mapped === "CONNECTED") {
        setQrBase64(null);
        return;
      }
    } catch {}

    try {
      const r2 = await fetch(`${baseUrl}/evo/qr?instanceId=${id}`);
      const j2 = await r2.json();

      const qr =
        j2?.base64 || j2?.qr?.base64 || j2?.qrcode?.base64 || null;

      if (qr && lastStatusRef.current !== "CONNECTED") {
        setQrBase64(normalizeQR(qr));
        setStatusSafe("QRCODE");
      }
    } catch {}
  }, [baseUrl, logicalInstanceId, realInstanceId]);

  /* ---------------------------------------------------------
     LOGOUT — FINAL, FUNCIONAL E ESTÁVEL
  --------------------------------------------------------- */
  const logout = useCallback(async () => {
    const id = realInstanceId || logicalInstanceId;

    if (!id) {
      console.warn("Nenhuma instância para desconectar");
      setStatusSafe("LOGGED_OUT");
      return false;
    }

    didLogoutRef.current = true;
    closeSSE();

    const url = `${baseUrl.replace(/\/$/, "")}/evo/instance/delete/${encodeURIComponent(
      id
    )}`;

    try {
      const resp = await fetch(url, { method: "DELETE" });
      let body = null;
      try {
        body = await resp.json();
      } catch {}

      if (!resp.ok) {
        setStatusSafe("ERROR");
        setError(body?.error || "Erro ao deletar");
        return false;
      }

      setQrBase64(null);
      setPairingCode(null);
      setRealInstanceId("");
      setStatusSafe("LOGGED_OUT");
      return true;
    } catch (err) {
      setStatusSafe("ERROR");
      return false;
    }
  }, [baseUrl, realInstanceId, logicalInstanceId, closeSSE]);

  /* ---------------------------------------------------------
     EFFECTS
  --------------------------------------------------------- */
  useEffect(() => {
    didLogoutRef.current = false;
    refresh();
  }, [logicalInstanceId]);

  useEffect(() => {
    if (autostart && logicalInstanceId) start();
  }, [autostart, logicalInstanceId, start]);

  useEffect(() => closeSSE, [closeSSE]);
useEffect(() => {
  // fallback polling: enquanto não CONNECTED, consulta /status a cada 2s
  if (status === "CONNECTED" || didLogoutRef.current) return;

  const id = realInstanceId || logicalInstanceId;
  if (!id) return;

  let timer: number | null = null;

  const ping = async () => {
    try {
      const r = await fetch(`${baseUrl.replace(/\/$/, "")}/evo/status?instanceId=${encodeURIComponent(id)}`, {
        headers: { "X-Api-Key": evoToken }
      });
      const j = await r.json();
      const mapped = mapStatus(extractStatus(j));
      if (mapped === "CONNECTED") {
        console.log("✅ Fallback detectou CONNECTED");
        setStatusSafe("CONNECTED");
        setQrBase64(null);
        if (timer) window.clearInterval(timer);
      }
    } catch {}
  };

  // só ativa fallback quando estiver conectando ou aguardando QR
  if (status === "OPENING" || status === "QRCODE") {
    ping();
    timer = window.setInterval(ping, 2000) as unknown as number;
  }

  return () => { if (timer) window.clearInterval(timer); };
}, [status, baseUrl, evoToken, realInstanceId, logicalInstanceId]);

  /* ---------------------------------------------------------
     API
  --------------------------------------------------------- */
  return {
    logicalInstanceId,
    realInstanceId,
    status,
    qrBase64,
    pairingCode,
    error,
    loading,
    start,
    refresh,
    logout,
    setRealInstanceId,
  };
}
