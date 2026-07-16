import { createServerFn } from "@tanstack/react-start";

export type BouquetAnalysis = {
  isBouquet: boolean;
  title: string;
  description: string;
  priceMin: number;
  priceMax: number;
  reason?: string;
};

export const analyzeBouquet = createServerFn({ method: "POST" })
  .inputValidator((input: { images: string[] }) => {
    if (!input || !Array.isArray(input.images) || input.images.length === 0) {
      throw new Error("images required");
    }
    return { images: input.images.slice(0, 4) };
  })
  .handler(async ({ data }): Promise<BouquetAnalysis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        isBouquet: true,
        title: "",
        description: "",
        priceMin: 0,
        priceMax: 0,
        reason: "AI недоступен",
      };
    }

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