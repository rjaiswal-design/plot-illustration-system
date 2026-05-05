import { useEffect, useMemo, useState } from "react";
import "./App.css";

type Ramp = {
  tint_2: string;
  tint_1: string;
  base: string;
  shade_1: string;
  shade_2: string;
};
type Brand = {
  tagline: string;
  ramp: Ramp;
  logo_color?: string;
  logo_accent?: string;
  logo_badge?: string;
  logo_bg?: string;
  custom?: boolean;
};
type Palettes = {
  system_version: string;
  philosophy: string;
  neutrals: Record<string, string>;
  brands: Record<string, Brand>;
  usage_rules: Record<string, string>;
};

const BRAND_LABELS: Record<string, string> = {
  noon: "noon",
  noon_food: "noon food",
  minutes: "minutes",
  supermall: "supermall",
  nownow: "nownow",
};

const BRAND_DIRS: Record<string, string> = {
  noon: "noon",
  noon_food: "noon-food",
  minutes: "minutes",
  supermall: "supermall",
  nownow: "nownow",
};

const COMPONENTS = [
  "apple", "bottle", "bread", "building", "cupcake", "donut",
  "headphones", "hero-composition", "package-box", "palm-tree",
  "paper-bag", "perfume", "pizza-slice", "smartphone", "sneaker", "sunglasses",
];

// Components that exist only as a noon-templated SVG and theme dynamically
// for every brand (no per-brand pre-baked PNG).
const EXTRA_COMPONENTS = ["pizza", "cart", "groceries"];

const HEADS = [
  "afro", "airy", "caesar", "chongo", "curly", "hijab-1", "hijab2", "long",
  "no-hair", "pony", "rad", "short-1", "short-2", "short-beard", "top",
  "turban-1", "turban2", "wavy",
];
const BODIES = [
  "hoodie", "jacket", "jacket-2", "lab-coat", "long-sleeve",
  "pointing-forward", "pointing-up", "pregnant", "trench-coat", "turtle-neck",
];
const BOTTOMS = [
  "baggy-pants", "jogging", "shorts", "skinny-jeans", "skinny-jeans-walk",
  "skirt", "sprint", "sweatpants",
];

const HEADS_GULF = [
  "ghutra-white", "shemagh-red", "kufi-cap", "hijab-navy", "hijab-burgundy",
];
const BODIES_GULF = ["thobe-white", "abaya-black", "kandura-cream"];
const BOTTOMS_GULF = ["thobe-hem-white", "abaya-hem-black", "long-skirt-brown"];

const HEADS_DELIVERY = [
  "delivery-helmet-light", "delivery-helmet-tan", "delivery-helmet-brown",
];
const BODIES_DELIVERY = ["delivery-rider"];
const BOTTOMS_DELIVERY = ["delivery-running", "delivery-pants-walk", "delivery-pants"];

const HUMAN_STYLES = [
  { id: "default", label: "Modern", heads: HEADS, bodies: BODIES, bottoms: BOTTOMS },
  { id: "gulf", label: "Gulf", heads: HEADS_GULF, bodies: BODIES_GULF, bottoms: BOTTOMS_GULF },
  { id: "delivery", label: "Delivery", heads: HEADS_DELIVERY, bodies: BODIES_DELIVERY, bottoms: BOTTOMS_DELIVERY },
] as const;
type HumanStyleId = (typeof HUMAN_STYLES)[number]["id"];

// Source palette in noon SVG templates — substitution map keys.
const TEMPLATE = {
  tint_2: "#FFF2A8",
  tint_1: "#FFE066",
  base: "#FFCD00",
  shade_1: "#E8A500",
  shade_2: "#B27800",
} as const;

const PRINCIPLES = [
  {
    title: "Monochrome per marketplace",
    body: (
      <>
        Every illustration uses <strong>one brand hue rendered across a 5-tone tonal ramp</strong>,
        plus white and ink black. Never mix marketplace hues in the same illustration.
      </>
    ),
  },
  {
    title: "Geometric fundamentals",
    body: (
      <>
        Build from <strong>simple geometric primitives</strong>: rectangles, ellipses, rounded
        rectangles, triangles. Soft 4–8px corner radii. No painterly textures.
      </>
    ),
  },
  {
    title: "Diagonal hatching texture",
    body: (
      <>
        <strong>Diagonal hatching at 45°</strong> in shade_2 is the signature texture, used on
        side panels, packaging, and architectural shadow planes.
      </>
    ),
  },
  {
    title: "Logo placement",
    body: (
      <>
        Logos are <strong>always centered on the hero packaging</strong>, sitting inside a
        contrasting plate.
      </>
    ),
  },
];

const DOS = [
  "One brand hue per illustration",
  "5-tone ramp: tint_2, tint_1, base, shade_1, shade_2",
  "45° diagonal hatching in shade_2",
  "Logo centered on hero packaging",
  "Soft 4–8px corner radii",
];
const DONTS = [
  "Mixing two brand hues",
  "Painterly textures or noise",
  "Off-brand colors outside the ramp",
  "Logos floating freely without a plate",
  "Sharp 0px corners on organic shapes",
];

function isLight(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function rampFromHsl(h: number, s: number, l: number): Ramp {
  return {
    tint_2: hslToHex(h, clamp(s - 5, 0, 100), clamp(l + 32, 5, 95)),
    tint_1: hslToHex(h, clamp(s - 2, 0, 100), clamp(l + 18, 5, 95)),
    base: hslToHex(h, s, l),
    shade_1: hslToHex(h, s, clamp(l - 15, 5, 95)),
    shade_2: hslToHex(h, s, clamp(l - 30, 5, 95)),
  };
}

function themeSvg(svg: string, ramp: Ramp): string {
  let out = svg;
  // Order matters — substitute longer/distinct first; use case-insensitive global.
  for (const key of ["tint_2", "tint_1", "base", "shade_1", "shade_2"] as const) {
    const from = TEMPLATE[key];
    const re = new RegExp(from.replace("#", "#"), "gi");
    out = out.replace(re, ramp[key]);
  }
  return out;
}

function App() {
  const [palettes, setPalettes] = useState<Palettes | null>(null);
  const [customBrands, setCustomBrands] = useState<Record<string, Brand>>({});
  const [brand, setBrand] = useState<string>("noon");
  const [modal, setModal] = useState<
    | { kind: "asset"; name: string }
    | { kind: "generated"; name: string; svg: string }
    | null
  >(null);
  const [toast, setToast] = useState<string>("");

  // Template SVGs (noon brand) cached for re-theming custom brands.
  const [templates, setTemplates] = useState<Record<string, string>>({});

  // Create-marketplace modal state.
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [hsl, setHsl] = useState({ h: 200, s: 70, l: 50 });

  // Generate-illustration modal state.
  const [genOpen, setGenOpen] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string>("");
  const [genResult, setGenResult] = useState<{ svg: string; name: string } | null>(null);
  const [generated, setGenerated] = useState<Record<string, { name: string; svg: string }[]>>({});

  // Humans mix-and-match state.
  const [humanStyle, setHumanStyle] = useState<HumanStyleId>("default");
  const [human, setHuman] = useState({
    head: HEADS[0],
    body: BODIES[0],
    bottom: BOTTOMS[0],
  });

  const activeHumanPool = useMemo(
    () => HUMAN_STYLES.find((s) => s.id === humanStyle) ?? HUMAN_STYLES[0],
    [humanStyle]
  );

  function switchHumanStyle(id: HumanStyleId) {
    if (id === humanStyle) return;
    const pool = HUMAN_STYLES.find((s) => s.id === id) ?? HUMAN_STYLES[0];
    setHumanStyle(id);
    setHuman({ head: pool.heads[0], body: pool.bodies[0], bottom: pool.bottoms[0] });
  }

  useEffect(() => {
    fetch("/assets/palettes.json")
      .then((r) => r.json())
      .then(setPalettes);
  }, []);

  useEffect(() => {
    Promise.all(
      [...COMPONENTS, ...EXTRA_COMPONENTS].map((name) =>
        fetch(`/assets/components/noon/${name}.svg`)
          .then((r) => r.text())
          .then((text) => [name, text] as const)
      )
    ).then((entries) => setTemplates(Object.fromEntries(entries)));
  }, []);

  const allBrands = useMemo<Record<string, Brand>>(() => {
    if (!palettes) return {};
    return { ...palettes.brands, ...customBrands };
  }, [palettes, customBrands]);

  const ramp = allBrands[brand]?.ramp;
  const isCustom = !!allBrands[brand]?.custom;

  const swatches = useMemo(() => {
    if (!palettes || !ramp) return [];
    return [
      { name: "tint_2", hex: ramp.tint_2 },
      { name: "tint_1", hex: ramp.tint_1 },
      { name: "base", hex: ramp.base },
      { name: "shade_1", hex: ramp.shade_1 },
      { name: "shade_2", hex: ramp.shade_2 },
      { name: "white", hex: palettes.neutrals.white },
      { name: "ink", hex: palettes.neutrals.ink },
    ];
  }, [palettes, ramp]);

  const previewRamp = useMemo(() => rampFromHsl(hsl.h, hsl.s, hsl.l), [hsl]);

  async function writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  async function copy(text: string, msg: string) {
    const ok = await writeClipboard(text);
    setToast(ok ? msg : "Copy failed");
    window.setTimeout(() => setToast(""), 1400);
  }

  function downloadFile(url: string, filename: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function downloadSvgText(text: string, filename: string) {
    const blob = new Blob([text], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    downloadFile(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copySvgFromUrl(url: string, name: string) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      const ok = await writeClipboard(text);
      setToast(ok ? `Copied ${name}.svg` : "Copy failed");
    } catch {
      setToast("Copy failed");
    }
    window.setTimeout(() => setToast(""), 1400);
  }

  function getThemedSvg(componentName: string, brandKey: string): string | null {
    const b = allBrands[brandKey];
    if (!b) return null;
    // Custom brands and EXTRA components both render via inline themed SVG.
    if (b.custom || EXTRA_COMPONENTS.includes(componentName)) {
      const tpl = templates[componentName];
      if (!tpl) return null;
      return themeSvg(tpl, b.ramp);
    }
    return null;
  }

  function createMarketplace() {
    const name = newName.trim();
    if (!name) {
      setToast("Name required");
      window.setTimeout(() => setToast(""), 1400);
      return;
    }
    const key = `custom_${Date.now().toString(36)}`;
    const ramp = rampFromHsl(hsl.h, hsl.s, hsl.l);
    setCustomBrands((prev) => ({
      ...prev,
      [key]: {
        tagline: `Custom marketplace — H${hsl.h} S${hsl.s} L${hsl.l}`,
        ramp,
        logo_color: "#1A1A1A",
        custom: true,
      },
    }));
    BRAND_LABELS[key] = name;
    setBrand(key);
    setCreateOpen(false);
    setNewName("");
    setToast(`Created "${name}"`);
    window.setTimeout(() => setToast(""), 1600);
  }

  async function generateIllustration() {
    if (!genPrompt.trim() || !ramp) return;
    setGenLoading(true);
    setGenError("");
    setGenResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: genPrompt.trim(),
          ramp,
          brandName: BRAND_LABELS[brand] ?? brand,
        }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        setGenError(
          "API route not available. The /api/generate function only runs on Vercel — deploy the app or run `vercel dev` locally."
        );
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error ?? `HTTP ${res.status}`);
      } else {
        setGenResult({ svg: data.svg, name: data.name });
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setGenLoading(false);
    }
  }

  async function buildCombinedHumanSvg(): Promise<string> {
    const [head, body, bottom] = await Promise.all([
      fetch(`/assets/humans/head/${human.head}.svg`).then((r) => r.text()),
      fetch(`/assets/humans/body/${human.body}.svg`).then((r) => r.text()),
      fetch(`/assets/humans/bottom/${human.bottom}.svg`).then((r) => r.text()),
    ]);
    const inner = (svg: string) =>
      svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const W = 320;
    const H = 460;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <g transform="translate(10,225)">${inner(bottom)}</g>
  <g transform="translate(32,80)">${inner(body)}</g>
  <g transform="translate(92,0)">${inner(head)}</g>
</svg>`;
  }

  async function downloadHumanSvg() {
    const svg = await buildCombinedHumanSvg();
    downloadSvgText(svg, `human-${human.head}-${human.body}-${human.bottom}.svg`);
  }

  async function copyHumanSvg() {
    const svg = await buildCombinedHumanSvg();
    const ok = await writeClipboard(svg);
    setToast(ok ? "Copied combined SVG" : "Copy failed");
    window.setTimeout(() => setToast(""), 1400);
  }

  function addGeneratedToLibrary() {
    if (!genResult) return;
    setGenerated((prev) => ({
      ...prev,
      [brand]: [...(prev[brand] ?? []), genResult],
    }));
    setToast(`Added "${genResult.name}"`);
    window.setTimeout(() => setToast(""), 1600);
    setGenResult(null);
    setGenPrompt("");
    setGenOpen(false);
  }

  if (!palettes) return null;

  const dir = BRAND_DIRS[brand];
  const themedForModal =
    modal && (isCustom || (modal.kind === "asset" && EXTRA_COMPONENTS.includes(modal.name)))
      ? getThemedSvg(modal.name, brand)
      : null;
  const generatedForBrand = generated[brand] ?? [];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <div className="brand-name">noon ✦ illustrations</div>
            <div className="brand-sub">v{palettes.system_version} · uiplot</div>
          </div>
        </div>

        <div className="nav">
          <div className="nav-label">Sections</div>
          <a className="nav-link active" href="#palette"><span>Palette</span><span className="num">01</span></a>
          <a className="nav-link" href="#components"><span>Components</span><span className="num">02</span></a>
          <a className="nav-link" href="#humans"><span>Humans</span><span className="num">03</span></a>
          <a className="nav-link" href="#principles"><span>Principles</span><span className="num">04</span></a>
          <a className="nav-link" href="#checklist"><span>Checklist</span><span className="num">05</span></a>
        </div>

        <div className="brand-pickers">
          <div className="nav-label">Marketplace</div>
          {Object.entries(allBrands).map(([key, b]) => (
            <button
              key={key}
              className={`brand-pick ${brand === key ? "active" : ""}`}
              onClick={() => setBrand(key)}
            >
              <span className="brand-dot" style={{ background: b.ramp.base }} />
              {BRAND_LABELS[key] ?? key}
              {b.custom && <span className="custom-tag">NEW</span>}
            </button>
          ))}
          <button className="brand-new" onClick={() => setCreateOpen(true)}>
            <span className="brand-new-plus">+</span>
            New marketplace
          </button>
        </div>

        <div className="footer-meta">
          UIPLOT · DARK<br />
          DESIGN SYSTEM · 2026
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <div className="eyebrow">noon · illustration system</div>
          <h1>
            Style fundamentals,<br />
            asset library &amp; <em>prompt templates</em>.
          </h1>
          <p className="lede">
            On-brand illustrations across all noon marketplaces — built from a 5-tone monochromatic
            ramp, geometric primitives, and 45° hatching. Switch a marketplace in the sidebar to
            re-skin the entire system.
          </p>
        </header>

        <section id="palette" className="section">
          <div className="section-head">
            <h2>Palette</h2>
            <span className="section-num">SECTION 01 / 05</span>
          </div>
          <p className="section-desc">
            Click any swatch to copy its hex. Each marketplace uses a 5-tone monochromatic ramp built
            around its signature hue.
          </p>
          <div className="palette">
            {swatches.map((s) => (
              <button
                key={s.name}
                className={`swatch ${isLight(s.hex) ? "" : "dark"}`}
                style={{ background: s.hex }}
                onClick={() => copy(s.hex, `Copied ${s.hex.toUpperCase()}`)}
              >
                <div className="swatch-meta">
                  <span className="swatch-name">{s.name}</span>
                  <span className="swatch-hex">{s.hex.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section id="components" className="section">
          <div className="section-head">
            <h2>Components</h2>
            <div className="section-actions">
              <button className="btn btn-ghost" onClick={() => setGenOpen(true)}>
                <span className="sparkle">✦</span> Generate illustration
              </button>
              <span className="section-num">SECTION 02 / 05</span>
            </div>
          </div>
          <p className="section-desc">
            Click any component to view full-size and download as SVG (editable) or PNG. Components
            re-theme automatically with the selected marketplace.
          </p>
          <div className="grid">
            {COMPONENTS.map((name, i) => {
              const themed = isCustom ? getThemedSvg(name, brand) : null;
              return (
                <button
                  key={name}
                  className="card"
                  onClick={() => setModal({ kind: "asset", name })}
                >
                  <span className="card-num">{String(i + 1).padStart(2, "0")}</span>
                  <div className="card-img">
                    {themed ? (
                      <span
                        className="svg-host"
                        dangerouslySetInnerHTML={{ __html: themed }}
                      />
                    ) : (
                      <img src={`/assets/png/${dir}/${name}.png`} alt={name} loading="lazy" />
                    )}
                  </div>
                  <div className="card-name">{name.replace(/-/g, " ")}</div>
                </button>
              );
            })}
            {EXTRA_COMPONENTS.map((name, i) => {
              const themed = getThemedSvg(name, brand);
              return (
                <button
                  key={name}
                  className="card"
                  onClick={() => setModal({ kind: "asset", name })}
                >
                  <span className="card-num">
                    {String(COMPONENTS.length + i + 1).padStart(2, "0")}
                  </span>
                  <div className="card-img">
                    {themed && (
                      <span
                        className="svg-host"
                        dangerouslySetInnerHTML={{ __html: themed }}
                      />
                    )}
                  </div>
                  <div className="card-name">{name.replace(/-/g, " ")}</div>
                </button>
              );
            })}
            {generatedForBrand.map((g, i) => (
              <button
                key={`gen-${i}-${g.name}`}
                className="card card-generated"
                onClick={() => setModal({ kind: "generated", name: g.name, svg: g.svg })}
              >
                <span className="card-num">G{String(i + 1).padStart(2, "0")}</span>
                <div className="card-img">
                  <span
                    className="svg-host"
                    dangerouslySetInnerHTML={{ __html: g.svg }}
                  />
                </div>
                <div className="card-name">{g.name.replace(/-/g, " ")}</div>
              </button>
            ))}
          </div>
        </section>

        <section id="humans" className="section">
          <div className="section-head">
            <h2>Humans</h2>
            <div className="section-actions">
              <div className="style-toggle">
                {HUMAN_STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`style-toggle-btn ${humanStyle === s.id ? "active" : ""}`}
                    onClick={() => switchHumanStyle(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const p = activeHumanPool;
                  setHuman({
                    head: p.heads[Math.floor(Math.random() * p.heads.length)],
                    body: p.bodies[Math.floor(Math.random() * p.bodies.length)],
                    bottom: p.bottoms[Math.floor(Math.random() * p.bottoms.length)],
                  });
                }}
              >
                ⚄ Randomize
              </button>
              <span className="section-num">SECTION 03 / 05</span>
            </div>
          </div>
          <p className="section-desc">
            Mix-and-match characters from the Humaaans library. Pick a head, body, and bottom — the
            figure recomposes in real time. Download or copy the combined SVG.
          </p>

          <div className="humans-console">
            <div className="figure-stage">
              <div className="figure">
                <img
                  className="figure-bottom"
                  src={`/assets/humans/bottom/${human.bottom}.svg`}
                  alt={human.bottom}
                />
                <img
                  className="figure-body"
                  src={`/assets/humans/body/${human.body}.svg`}
                  alt={human.body}
                />
                <img
                  className="figure-head"
                  src={`/assets/humans/head/${human.head}.svg`}
                  alt={human.head}
                />
              </div>
              <div className="figure-meta">
                <div className="figure-meta-row"><span>HEAD</span>{human.head.replace(/-/g, " ")}</div>
                <div className="figure-meta-row"><span>BODY</span>{human.body.replace(/-/g, " ")}</div>
                <div className="figure-meta-row"><span>BOTTOM</span>{human.bottom.replace(/-/g, " ")}</div>
              </div>
              <div className="figure-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => downloadHumanSvg()}
                >
                  Download SVG
                </button>
                <button
                  className="btn"
                  onClick={() => copyHumanSvg()}
                >
                  Copy SVG
                </button>
              </div>
            </div>

            <div className="parts-panel">
              <PartRow
                label="Head"
                items={activeHumanPool.heads}
                active={human.head}
                kind="head"
                onSelect={(v) => setHuman((p) => ({ ...p, head: v }))}
              />
              <PartRow
                label="Body"
                items={activeHumanPool.bodies}
                active={human.body}
                kind="body"
                onSelect={(v) => setHuman((p) => ({ ...p, body: v }))}
              />
              <PartRow
                label="Bottom"
                items={activeHumanPool.bottoms}
                active={human.bottom}
                kind="bottom"
                onSelect={(v) => setHuman((p) => ({ ...p, bottom: v }))}
              />
            </div>
          </div>
        </section>

        <section id="principles" className="section">
          <div className="section-head">
            <h2>Principles</h2>
            <span className="section-num">SECTION 04 / 05</span>
          </div>
          <p className="section-desc">
            The rules that make an illustration <em>noon</em>. Every team member should know these
            by heart.
          </p>
          <div className="principles">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="principle">
                <div className="principle-num">PRINCIPLE {String(i + 1).padStart(2, "0")}</div>
                <div className="principle-title">{p.title}</div>
                <div className="principle-body">{p.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="checklist" className="section">
          <div className="section-head">
            <h2>Checklist</h2>
            <span className="section-num">SECTION 05 / 05</span>
          </div>
          <p className="section-desc">Quick visual check before shipping any illustration.</p>
          <div className="do-dont">
            <div className="do">
              <div className="do-label">Do</div>
              <ul>{DOS.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <div className="dont">
              <div className="dont-label">Don't</div>
              <ul>{DONTS.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          </div>
        </section>
      </main>

      {modal && (() => {
        const isGen = modal.kind === "generated";
        const svgForModal = isGen ? modal.svg : themedForModal;
        const meta = isGen ? "AI generated" : "pre-themed";
        return (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
              <div className="modal-svg-wrap">
                {svgForModal ? (
                  <span
                    className="svg-host svg-host-lg"
                    dangerouslySetInnerHTML={{ __html: svgForModal }}
                  />
                ) : (
                  <img src={`/assets/png/${dir}/${modal.name}.png`} alt={modal.name} />
                )}
              </div>
              <div className="modal-title">{modal.name.replace(/-/g, " ")}</div>
              <div className="modal-meta">{BRAND_LABELS[brand] ?? brand} · {meta}</div>
              <div className="modal-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (svgForModal) {
                      downloadSvgText(svgForModal, `${modal.name}.svg`);
                    } else {
                      downloadFile(`/assets/components/${dir}/${modal.name}.svg`, `${modal.name}.svg`);
                    }
                  }}
                >
                  Download SVG
                </button>
                <button
                  className="btn"
                  onClick={async () => {
                    if (svgForModal) {
                      const ok = await writeClipboard(svgForModal);
                      setToast(ok ? `Copied ${modal.name}.svg` : "Copy failed");
                      window.setTimeout(() => setToast(""), 1400);
                    } else {
                      copySvgFromUrl(`/assets/components/${dir}/${modal.name}.svg`, modal.name);
                    }
                  }}
                >
                  Copy SVG
                </button>
                {modal.kind === "asset" && !isCustom && !EXTRA_COMPONENTS.includes(modal.name) && (
                  <button
                    className="btn"
                    onClick={() =>
                      downloadFile(`/assets/png/${dir}/${modal.name}.png`, `${modal.name}.png`)
                    }
                  >
                    Download PNG
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal create-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCreateOpen(false)}>×</button>
            <div className="create-eyebrow">NEW MARKETPLACE</div>
            <div className="modal-title create-title">Pick a signature hue</div>
            <p className="create-desc">
              The 5-tone ramp generates automatically from your base color. The full illustration set
              re-themes in real time.
            </p>

            <label className="field">
              <span className="field-label">Name</span>
              <input
                className="input"
                placeholder="e.g. lifestyle"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>

            <div className="sliders">
              <Slider
                label="Hue"
                suffix="°"
                min={0}
                max={360}
                value={hsl.h}
                onChange={(h) => setHsl((p) => ({ ...p, h }))}
                track={`linear-gradient(to right,
                  hsl(0,${hsl.s}%,${hsl.l}%),
                  hsl(60,${hsl.s}%,${hsl.l}%),
                  hsl(120,${hsl.s}%,${hsl.l}%),
                  hsl(180,${hsl.s}%,${hsl.l}%),
                  hsl(240,${hsl.s}%,${hsl.l}%),
                  hsl(300,${hsl.s}%,${hsl.l}%),
                  hsl(360,${hsl.s}%,${hsl.l}%))`}
              />
              <Slider
                label="Saturation"
                suffix="%"
                min={0}
                max={100}
                value={hsl.s}
                onChange={(s) => setHsl((p) => ({ ...p, s }))}
                track={`linear-gradient(to right,
                  hsl(${hsl.h},0%,${hsl.l}%),
                  hsl(${hsl.h},100%,${hsl.l}%))`}
              />
              <Slider
                label="Lightness"
                suffix="%"
                min={5}
                max={95}
                value={hsl.l}
                onChange={(l) => setHsl((p) => ({ ...p, l }))}
                track={`linear-gradient(to right,
                  hsl(${hsl.h},${hsl.s}%,5%),
                  hsl(${hsl.h},${hsl.s}%,50%),
                  hsl(${hsl.h},${hsl.s}%,95%))`}
              />
            </div>

            <div className="create-preview">
              <div className="create-preview-label">RAMP PREVIEW</div>
              <div className="ramp-row">
                {(["tint_2", "tint_1", "base", "shade_1", "shade_2"] as const).map((k) => (
                  <div key={k} className="ramp-cell">
                    <div className="ramp-chip" style={{ background: previewRamp[k] }} />
                    <div className="ramp-name">{k}</div>
                    <div className="ramp-hex">{previewRamp[k]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="create-illustrations">
              <div className="create-preview-label">ILLUSTRATION SET PREVIEW</div>
              <div className="create-grid">
                {["apple", "package-box", "perfume", "smartphone", "sneaker", "bottle"].map((n) => {
                  const tpl = templates[n];
                  if (!tpl) return <div key={n} className="create-cell empty" />;
                  return (
                    <div
                      key={n}
                      className="create-cell"
                      dangerouslySetInnerHTML={{ __html: themeSvg(tpl, previewRamp) }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={createMarketplace}>
                Generate set
              </button>
              <button className="btn" onClick={() => setCreateOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {genOpen && (
        <div className="modal-backdrop" onClick={() => setGenOpen(false)}>
          <div className="modal create-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGenOpen(false)}>×</button>
            <div className="create-eyebrow">GENERATE ILLUSTRATION</div>
            <div className="modal-title create-title">Describe what you want</div>
            <p className="create-desc">
              Claude generates a flat-vector SVG in the noon house style, locked to{" "}
              <strong>{BRAND_LABELS[brand] ?? brand}</strong>'s 5-tone ramp. Be specific about subject
              and composition.
            </p>

            <label className="field">
              <span className="field-label">Prompt</span>
              <textarea
                className="input textarea"
                placeholder="e.g. a vintage film camera, 3/4 view, with a soft strap looping behind"
                rows={4}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                disabled={genLoading}
              />
            </label>

            <div className="ramp-row ramp-row-compact">
              {(["tint_2", "tint_1", "base", "shade_1", "shade_2"] as const).map((k) =>
                ramp ? (
                  <div key={k} className="ramp-cell">
                    <div className="ramp-chip ramp-chip-sm" style={{ background: ramp[k] }} />
                    <div className="ramp-name">{k}</div>
                  </div>
                ) : null
              )}
            </div>

            {genError && <div className="gen-error">{genError}</div>}

            {genResult && (
              <div className="gen-result">
                <div className="create-preview-label">PREVIEW</div>
                <div className="gen-preview">
                  <span
                    className="svg-host"
                    dangerouslySetInnerHTML={{ __html: genResult.svg }}
                  />
                </div>
                <div className="gen-result-name">{genResult.name.replace(/-/g, " ")}</div>
              </div>
            )}

            <div className="modal-actions">
              {!genResult ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={generateIllustration}
                    disabled={genLoading || !genPrompt.trim()}
                  >
                    {genLoading ? "Generating…" : "Generate"}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setGenOpen(false)}
                    disabled={genLoading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={addGeneratedToLibrary}>
                    Add to library
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setGenResult(null);
                      generateIllustration();
                    }}
                    disabled={genLoading}
                  >
                    Regenerate
                  </button>
                  <button className="btn" onClick={() => setGenResult(null)}>
                    Discard
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
  track,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  suffix?: string;
  track?: string;
}) {
  return (
    <label className="slider">
      <div className="slider-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={track ? ({ "--slider-track": track } as React.CSSProperties) : undefined}
      />
    </label>
  );
}

function PartRow({
  label,
  items,
  active,
  kind,
  onSelect,
}: {
  label: string;
  items: readonly string[];
  active: string;
  kind: "head" | "body" | "bottom";
  onSelect: (v: string) => void;
}) {
  return (
    <div className="part-row">
      <div className="part-row-head">
        <span className="part-label">{label}</span>
        <span className="part-count">
          {String(items.indexOf(active) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </span>
      </div>
      <div className="part-thumbs">
        {items.map((name) => (
          <button
            key={name}
            className={`part-thumb ${active === name ? "active" : ""}`}
            onClick={() => onSelect(name)}
            title={name.replace(/-/g, " ")}
          >
            <img src={`/assets/humans/${kind}/${name}.svg`} alt={name} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
