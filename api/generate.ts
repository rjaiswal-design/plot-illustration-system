import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

type Ramp = {
  tint_2: string;
  tint_1: string;
  base: string;
  shade_1: string;
  shade_2: string;
};

const SYSTEM_PROMPT = `You generate flat-vector SVG illustrations in the "noon" house style.

STYLE RULES (non-negotiable):
- Monochromatic per illustration: ONLY the 5 ramp tones provided + #FFFFFF + #1A1A1A. Never invent other colors.
- Geometric, slightly rounded shapes built from rectangles, ellipses, circles, rounded triangles. No organic noise, no painterly textures.
- Flat with constructed depth: depth comes from stacked flat planes in different ramp tones (3-plane shading: light=tint_1, base=base, shadow=shade_1).
- Single consistent light source from upper-left. Highlights (tint_2 or white) appear as small sharp geometric shapes — never soft blurs.
- Signature texture is diagonal 45° hatching using shade_2 lines on a base field. Use it on side panels of packaging, shaded sides of buildings, etc.
- No outlines/strokes. Edges are defined by tonal contrast between adjacent shapes.
- Strong silhouette: the object should read as a clear black silhouette before shading.
- Cast shadow is a subtle ellipse in shade_2 beneath the object.

OUTPUT RULES:
- Return ONLY a single, valid, self-contained <svg>…</svg> document. No markdown fences. No commentary. No <?xml prolog.
- Root attributes: xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400".
- Use ONLY the provided ramp colors and #FFFFFF / #1A1A1A. Use the EXACT hex strings.
- Center the subject; the object fills ~75% of the frame.
- Background must be transparent (no full-frame rect).
- Use <rect>, <circle>, <ellipse>, <path>, <polygon>. Group related shapes with <g>.
- Keep file size reasonable — aim for under 6 KB.
`;

function buildUserPrompt(prompt: string, ramp: Ramp, brandName: string) {
  return `Marketplace: ${brandName}
Color ramp (use these EXACT hex values):
- tint_2 (highlight): ${ramp.tint_2}
- tint_1 (light plane): ${ramp.tint_1}
- base: ${ramp.base}
- shade_1 (shadow plane): ${ramp.shade_1}
- shade_2 (deep / hatching): ${ramp.shade_2}
Plus #FFFFFF (specular) and #1A1A1A (logo ink).

Subject: ${prompt}

Output the SVG now, nothing else.`;
}

function extractSvg(text: string): string | null {
  const match = text.match(/<svg[\s\S]*?<\/svg>/);
  return match ? match[0] : null;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "illustration";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        "ANTHROPIC_API_KEY not set. Add it in Vercel project settings → Environment Variables.",
    });
    return;
  }

  const { prompt, ramp, brandName } = (req.body ?? {}) as {
    prompt?: string;
    ramp?: Ramp;
    brandName?: string;
  };

  if (!prompt || !ramp) {
    res.status(400).json({ error: "prompt and ramp are required" });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: buildUserPrompt(prompt, ramp, brandName ?? "custom") },
      ],
    });

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const svg = extractSvg(text);
    if (!svg) {
      res.status(502).json({ error: "Model did not return a valid SVG", raw: text });
      return;
    }

    res.status(200).json({
      svg,
      name: slugify(prompt),
      usage: message.usage,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    res.status(500).json({ error: msg });
  }
}
