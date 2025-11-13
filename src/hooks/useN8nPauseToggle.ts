import { useState } from "react";
import { supabase } from "../lib/supabaseCleint";

export function useN8nPauseToggle(
  subscriptionId: string,
  initialState: boolean
) {
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(initialState);

  async function toggle() {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ n8n_pause: !paused })
      .eq("id", subscriptionId)
      .select("*")
      .single();

    setLoading(false);

    if (error) {
      console.error("Erro ao atualizar subscription:", error);
      return;
    }

    // Atualiza estado local
    setPaused(data.n8n_pause);
  }

  return { paused, loading, toggle };
}
