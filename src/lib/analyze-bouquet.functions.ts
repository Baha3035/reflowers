import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Each call costs AI credits: signed-in users only, capped per day.
const DAILY_LIMIT = 40;

function unavailable(reason: string): BouquetAnalysis {
  return { isBouquet: true, title: "", description: "", priceMin: 0, priceMax: 0, reason };
}

// Only our own uploads (Supabase Storage) or inline images may be sent to the AI.
function isAllowedImage(url: string, supabaseUrl: string | undefined) {
  if (url.startsWith("data:image/")) return true;
  return !!supabaseUrl && url.startsWith(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/`);
}

export type BouquetAnalysis = {
  isBouquet: boolean;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  reason?: string;
};

export const analyzeBouquet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { images: string[] }) => {
    if (!input || !Array.isArray(input.images) || input.images.length === 0) {
      throw new Error("images required");
    }
    if (!input.images.every(i => typeof i === "string")) throw new Error("invalid images");
    return { images: input.images.slice(0, 4) };
  })
  .handler(async ({ data, context }): Promise<BouquetAnalysis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return unavailable("AI недоступен");

    if (!data.images.every(url => isAllowedImage(url, process.env.SUPABASE_URL))) {
      return unavailable("Фото должно быть загружено в ReFlowers");
    }

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error: countError } = await context.supabase
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", since);
    if (countError) return unavailable("AI недоступен");
    if ((count ?? 0) >= DAILY_LIMIT) {
      return unavailable("Лимит AI-подсказок на сегодня исчерпан — заполните объявление вручную");
    }
    const { error: logError } = await context.supabase
      .from("ai_usage")
      .insert({ user_id: context.userId, kind: "analyze_bouquet" });
    if (logError) return unavailable("AI недоступен");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "Ты — эксперт по цветам и вторичному рынку букетов в Бишкеке (Кыргызстан). " +
          "Посмотри на фото и определи: это букет цветов? Если да — коротко опиши " +
          "(тип цветов, количество, размер, свежесть), и предложи справедливую цену " +
          "перепродажи в кыргызских сомах (KGS). Обычный диапазон: 500–5000 сом. " +
          "Верни строго JSON без пояснений: " +
          '{"isBouquet": boolean, "title": string (до 50 символов, по-русски), ' +
          '"description": string (1-2 короткие фразы, по-русски), ' +
          '"priceMin": number (KGS), "priceMax": number (KGS), ' +
          '"reason": string (если не букет — почему)}.',
      },
      ...data.images.map(url => ({ type: "image_url", image_url: { url } })),
    ];

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { isBouquet: true, title: "", description: "", priceMin: 0, priceMax: 0, reason: `AI ${res.status}: ${txt.slice(0, 120)}` };
      }
      const json = await res.json();
      const raw: string = json?.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return { isBouquet: true, title: "", description: raw.slice(0, 200), priceMin: 0, priceMax: 0 };
      }
      const parsed = JSON.parse(match[0]);
      return {
        isBouquet: !!parsed.isBouquet,
        title: String(parsed.title ?? "").slice(0, 60),
        description: String(parsed.description ?? "").slice(0, 300),
        priceMin: Math.max(0, Math.round(Number(parsed.priceMin) || 0)),
        priceMax: Math.max(0, Math.round(Number(parsed.priceMax) || 0)),
        reason: parsed.reason ? String(parsed.reason).slice(0, 200) : undefined,
      };
    } catch (err) {
      return {
        isBouquet: true,
        title: "",
        description: "",
        priceMin: 0,
        priceMax: 0,
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  });