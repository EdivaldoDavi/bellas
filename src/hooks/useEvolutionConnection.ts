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

type StatusPayload = {
  status?: string;
  instance?: { state?: string; phoneConnected?: boolean; connected?: boolean };
  connected?: boolean;
  phoneConnected?: boolean;
  exists?: boolean;
};

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
     STATE
  --------------------------------------------------------- */
  const [realInstanceId, setRealInstanceId] = useState("");
  const [status, setStatus] = useState<EvoStatus>("IDLE");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     CONTROL
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

  const extractStatus = (raw: StatusPayload) => {
    if (!raw) return "UNKNOWN";
    if (typeof (raw as any) === "string") return raw;
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

  /** 🔍 converte o texto de status em EvoStatus coerente */
const mapStatus = (raw: any): EvoStatus => {
  if (!raw) return "UNKNOWN";
  const s = String(raw).toLowerCase().trim();

  // ❌ Desconectado / offline (verificado primeiro!)
  if (
    s === "disconnected" ||
    s.includes("disconnected") ||
    s.includes("offline") ||
    s.includes("logout") ||
    s.includes("closed") ||
    s === "close"
  ) {
    return "DISCONNECTED";
  }

  // ✅ Conectado
  if (
    s === "connected" ||
    s.includes(" connected") || // evita "disconnected"
    s === "online" ||
    s.includes(" phone_connected") ||
    s.includes("phoneconnected")
  ) {
    return "CONNECTED";
  }

  // 🔄 Em conexão
  if (s === "openning" || s.includes("opening") || s.includes("initializing")) {
    return "OPENING";
  }

  // 🧾 QR
  if (s.includes("qr") || s.includes("scan") || s.includes("waiting")) {
    return "QRCODE";
  }

  // ⚠️ Estados intermediários
  if (s === "open" || s.includes("ready") || s.includes("active")) {
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

  /** ✅ Checa se a instância existe consultando apenas /status */
  const existsFetch = async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/evo/status?instanceId=${encodeURIComponent(id)}`;
      const res = await fetch(url, { headers: { "X-Api-Key": evoToken } });
      if (res.status === 404) return false;
      if (!res.ok) return false;
      const data = (await res.json()) as StatusPayload;
      if (typeof data.exists === "boolean") return data.exists;
      if (data.instance || data.status) return true;
      return false;
    } catch {
      return false;
    }
  };

  /** ⚙️ define se o payload representa conectado/desconectado */
  const evaluateConnectivity = (payload: StatusPayload): EvoStatus => {
    // explicitação direta
    if (
      payload.phoneConnected === true ||
      payload.connected === true ||
      payload.instance?.phoneConnected === true ||
      payload.instance?.connected === true
    )
      return "CONNECTED";
    if (
      payload.phoneConnected === false ||
      payload.connected === false ||
      payload.instance?.phoneConnected === false
    )
      return "DISCONNECTED";

    // fallback textual
    const mapped = mapStatus(extractStatus(payload));
    return mapped;
  };

  /* ---------------------------------------------------------
     SSE
  --------------------------------------------------------- */
  const openSSE = useCallback(
    (instanceId: string) => {
      if (!instanceId || didLogoutRef.current) return;
      closeSSE();

      const es = new EventSource(
        `${baseUrl}/evo/stream?instanceId=${encodeURIComponent(instanceId)}&token=${encodeURIComponent(evoToken)}`
      );
      sseRef.current = es;

      es.addEventListener("status", async (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data) as StatusPayload;
          const exists = await existsFetch(instanceId);
          if (!exists) {
            setStatusSafe("DISCONNECTED");
            return;
          }
          const next = evaluateConnectivity(data);
          setStatusSafe(next);
        } catch (err) {
          console.warn("Erro ao processar status SSE:", err);
        }
      });

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
     START
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
        `${baseUrl}/evo/start?instanceId=${encodeURIComponent(logicalInstanceId)}`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
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

      const firstQR = json?.base64 || json?.qr?.base64 || json?.qrcode?.base64 || null;
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

    const exists = await existsFetch(id);
    if (!exists) {
      setQrBase64(null);
      setPairingCode(null);
      setStatusSafe("DISCONNECTED");
      return;
    }

    try {
      const r = await fetch(
        `${baseUrl.replace(/\/$/, "")}/evo/status?instanceId=${encodeURIComponent(id)}`,
        { headers: { "X-Api-Key": evoToken } }
      );
      if (r.status === 404) {
        setStatusSafe("DISCONNECTED");
        return;
      }
      const j = (await r.json()) as StatusPayload;
      const next = evaluateConnectivity(j);
      setStatusSafe(next);

      if (next === "CONNECTED") {
        setQrBase64(null);
        return;
      }
    } catch {}

    try {
      const r2 = await fetch(
        `${baseUrl.replace(/\/$/, "")}/evo/qr?instanceId=${encodeURIComponent(id)}`,
        { headers: { "X-Api-Key": evoToken } }
      );
      if (r2.ok) {
        const j2 = await r2.json();
        const qr = j2?.base64 || j2?.qr?.base64 || j2?.qrcode?.base64 || null;
        if (qr && lastStatusRef.current !== "CONNECTED") {
          setQrBase64(normalizeQR(qr));
          setStatusSafe("QRCODE");
        } else {
          setStatusSafe("DISCONNECTED");
        }
      } else {
        setStatusSafe("DISCONNECTED");
      }
    } catch {
      setStatusSafe("DISCONNECTED");
    }
  }, [baseUrl, logicalInstanceId, realInstanceId, evoToken]);

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */
  const logout = useCallback(async () => {
    const id = realInstanceId || logicalInstanceId;
    if (!id) {
      setStatusSafe("LOGGED_OUT");
      return false;
    }

    didLogoutRef.current = true;
    closeSSE();

    const url = `${baseUrl.replace(/\/$/, "")}/evo/instance/delete/${encodeURIComponent(id)}`;
    try {
      const resp = await fetch(url, { method: "DELETE" });
      let body: any = null;
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
    } catch {
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
  }, [logicalInstanceId, refresh]);

  useEffect(() => {
    if (autostart && logicalInstanceId) start();
  }, [autostart, logicalInstanceId, start]);

  useEffect(() => closeSSE, [closeSSE]);

  /** 🔁 Polling que detecta conexão/desconexão */
  useEffect(() => {
    if (didLogoutRef.current) return;

    const id = realInstanceId || logicalInstanceId;
    if (!id) return;

    let timer: number | null = null;

    const ping = async () => {
      try {
        const r = await fetch(
          `${baseUrl.replace(/\/$/, "")}/evo/status?instanceId=${encodeURIComponent(id)}`,
          { headers: { "X-Api-Key": evoToken } }
        );
        if (r.status === 404) {
          setStatusSafe("DISCONNECTED");
          return;
        }

        const j = (await r.json()) as StatusPayload;
        const next = evaluateConnectivity(j);

        if (next !== lastStatusRef.current) {
          console.log("📡 Fallback detectou mudança →", next);
          setStatusSafe(next);
          if (next === "DISCONNECTED") setQrBase64(null);
        }
      } catch (err) {
        console.warn("Erro no fallback:", err);
      }
    };

    ping();
    timer = window.setInterval(ping, 3000) as unknown as number;

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [baseUrl, evoToken, realInstanceId, logicalInstanceId]);


  // 🧹 Auto-delete da instância se estiver desconectado
useEffect(() => {
  if (status !== "DISCONNECTED") return;
  if (didLogoutRef.current) return; // evita loop de logout
  const id = realInstanceId || logicalInstanceId;
  if (!id) return;

  console.log("🧹 Instância desconectada — agendando exclusão...");
  const timer = setTimeout(async () => {
    try {
      await logout();
      console.log("🗑️ Instância deletada automaticamente:", id);
    } catch (err) {
      console.warn("Erro ao deletar instância automaticamente:", err);
    }
  }, 2500); // espera 2.5 segundos para garantir que não é desconexão momentânea

  return () => clearTimeout(timer);
}, [status, logout, realInstanceId, logicalInstanceId]);

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