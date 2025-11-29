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
  initialInstanceId?: string;
  autostart?: boolean; // agora opcional, mas só funciona externamente
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

  const mapStatus = (raw: any): EvoStatus => {
    if (!raw) return "UNKNOWN";
    const s = String(raw).toLowerCase().trim();

    if (
      s.includes("disconnect") ||
      s.includes("logout") ||
      s.includes("offline") ||
      s === "close"
    )
      return "DISCONNECTED";

    if (
      s.includes("connected") ||
      s === "online" ||
      s.includes("phoneconnected")
    )
      return "CONNECTED";

    if (s.includes("opening") || s.includes("initializing"))
      return "OPENING";

    if (s.includes("qr") || s.includes("scan") || s.includes("waiting"))
      return "QRCODE";

    return "UNKNOWN";
  };

  const evaluateConnectivity = (payload: StatusPayload): EvoStatus => {
    if (
      payload.phoneConnected === true ||
      payload.connected === true ||
      payload.instance?.connected === true ||
      payload.instance?.phoneConnected === true
    )
      return "CONNECTED";

    if (
      payload.phoneConnected === false ||
      payload.connected === false ||
      payload.instance?.phoneConnected === false
    )
      return "DISCONNECTED";

    return mapStatus(extractStatus(payload));
  };

  const existsFetch = async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/evo/status?instanceId=${encodeURIComponent(
        id
      )}`;
      const res = await fetch(url, { headers: { "X-Api-Key": evoToken } });
      if (res.status === 404) return false;
      if (!res.ok) return false;
      const data = await res.json();
      if (typeof data.exists === "boolean") return data.exists;
      if (data.instance || data.status) return true;
      return false;
    } catch {
      return false;
    }
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
     SSE
  --------------------------------------------------------- */
  const openSSE = useCallback(
    (instanceId: string) => {
      if (!instanceId || didLogoutRef.current) return;

      closeSSE();

      const es = new EventSource(
        `${baseUrl}/evo/stream?instanceId=${encodeURIComponent(
          instanceId
        )}&token=${encodeURIComponent(evoToken)}`
      );
      sseRef.current = es;

      es.addEventListener("status", async (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          const exists = await existsFetch(instanceId);
          if (!exists) {
            setStatusSafe("DISCONNECTED");
            return;
          }
          const next = evaluateConnectivity(data);
          setStatusSafe(next);
        } catch {}
      });

      es.addEventListener("qr", (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          const qr = normalizeQR(data?.base64 ?? data);
          if (qr) {
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

      const firstQR =
        json?.base64 || json?.qr?.base64 || json?.qrcode?.base64 || null;
      const q = normalizeQR(firstQR);
      if (q) {
        setQrBase64(q);
        setStatusSafe("QRCODE");
      }

      openSSE(inst);
    } catch (err: any) {
      setStatusSafe("ERROR");
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, logicalInstanceId, openSSE]);

  /* ---------------------------------------------------------
     LOGOUT
  --------------------------------------------------------- */
  const logout = useCallback(async () => {
    const id = realInstanceId || logicalInstanceId;
    if (!id) return;

    didLogoutRef.current = true;
    closeSSE();

    try {
      await fetch(
        `${baseUrl.replace(/\/$/, "")}/evo/instance/delete/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
    } catch {}

    setQrBase64(null);
    setPairingCode(null);
    setRealInstanceId("");
    setStatusSafe("LOGGED_OUT");
  }, [baseUrl, realInstanceId, logicalInstanceId, closeSSE]);

  /* ---------------------------------------------------------
     CLEANUP
  --------------------------------------------------------- */
  useEffect(() => closeSSE, [closeSSE]);

  /* ---------------------------------------------------------
     RETURN
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
    logout,
    setRealInstanceId,
  };
}
