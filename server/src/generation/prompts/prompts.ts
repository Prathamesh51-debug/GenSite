// Shared design guidance injected into the website-generation prompt so generated
// sites look professionally designed (not generic) and use real assets instead of
// gray placeholder boxes. Distilled from ui-ux-pro-max design intelligence.

export const DESIGN_GUIDE = `DESIGN QUALITY — make it look like a premium, professionally designed site:
- Choose a cohesive, modern color palette appropriate to the industry (one primary, one accent, plus neutral grays). Avoid default blue-on-white blandness.
- Load a strong Google Fonts pairing via <link> in the <head>: a characterful display font for headings (e.g. Space Grotesk, Sora, Poppins, Clash) + a clean sans for body (e.g. Inter, DM Sans).
- Use generous whitespace, a consistent spacing rhythm, clear visual hierarchy (large bold headings), rounded corners, subtle shadows and tasteful gradients.
- Add polish: sticky header, a strong hero with one clear CTA, alternating section backgrounds, hover states and smooth transitions (transition, duration-300, hover:scale-105, group-hover) on EVERY interactive element and section.
- Mobile-first responsive layout using Tailwind prefixes (sm: md: lg: xl:).

REAL IMAGES — never use gray placeholder boxes:
- Photos: https://picsum.photos/seed/UNIQUE-KEYWORD/WIDTH/HEIGHT (use a different seed per image).
- Avatars (testimonials/team): https://i.pravatar.cc/150?img=N (N between 1 and 70).
- Every <img> needs descriptive alt text and width/height (or aspect-ratio) to avoid layout shift.

SEO & METADATA — include in every page:
- <html lang="en">, a real <title>, <meta name="description">, Open Graph tags (og:title, og:description, og:image set to a Picsum URL), and <meta name="viewport" content="width=device-width, initial-scale=1">.
- An emoji SVG favicon: <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>EMOJI</text></svg>"> (pick an emoji that fits the brand).

FORMS — if there is a contact/signup/newsletter section:
- Build a real form: labeled inputs, correct input types (email/tel), required attributes, inline validation.
- On submit, preventDefault and show a clear success message via JavaScript (e.g. "Thanks — we'll be in touch!").

INTERACTIVITY & NAVIGATION — the site must actually WORK, including on mobile:
- Give each main section a real id (id="about", id="menu", id="contact", ...) and make the header nav links point to them (href="#about" etc.) with smooth scrolling (html { scroll-behavior: smooth } or JS). NEVER use dead href="#" links.
- Include a WORKING mobile hamburger menu: a button (hidden on md+ screens) that toggles the nav open/closed via JavaScript; the nav is collapsed by default on small screens.
- Every button/CTA must do something sensible — scroll to the relevant section or open the contact form. No dead buttons.
- Any interactive components (FAQ accordions, tabs, sliders, the mobile menu) MUST have working JavaScript in a <script> before </body>.
- It must be fully responsive: verify mentally at 375px that nothing overflows horizontally, the hamburger works, and text stays readable.

ANIMATION & MOTION (make the page feel alive and top-class):
- Include the AOS (Animate On Scroll) library. In <head>: <link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">. Before </body>: <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script><script>AOS.init({ duration: 800, once: true, easing: 'ease-out-cubic' });</script>
- Add data-aos attributes to sections, headings, cards and images so they animate in on scroll: data-aos="fade-up" / "fade-right" / "zoom-in" / "flip-up", with staggered data-aos-delay ("0","100","200"...) on items within a group.
- Add Tailwind hover + transition polish to interactive elements: hover:scale-105, hover:-translate-y-1, transition, duration-300, and hover effects on buttons, cards and images.
- Add a subtle gradient/animated hero background and smooth-scroll for nav anchors (html { scroll-behavior: smooth }).

ACCESSIBILITY: semantic HTML5 landmarks (header/nav/main/section/footer), alt text, <label> tied to each input, and WCAG AA color contrast.

AWARD-LEVEL POLISH: aim for an Awwwards-worthy result — a confident oversized type scale, deliberate whitespace, a distinctive hero, tasteful motion and micro-interactions. It should look designed by a top studio for THIS specific brand, not a generic template.`;

export interface BriefPage { path: string; title: string; purpose?: string; sections?: string[] }
export interface DesignBrief {
  industry?: string;
  vibe?: string;
  palette?: { primary?: string; accent?: string; neutrals?: string[] };
  fonts?: { display?: string; body?: string };
  pages: BriefPage[];
  imageryKeywords?: string[];
  tone?: string;
}

// STEP 1 — derive a design brief (industry-dedicated identity) as strict JSON.
export const buildBriefMessages = (prompt: string) => [
  {
    role: 'system' as const,
    content: `You are a world-class art director. Analyze the website request and produce a DESIGN BRIEF as STRICT JSON (no prose, no markdown fences).

Give the site a DISTINCT, industry-appropriate identity — a coffee brand should feel warm/artisanal, a SaaS clean/geometric/techy, a law firm authoritative, a fashion label editorial, a gym bold/energetic. Choose the colours, fonts and pages a top studio would pick for THIS specific business.

Output EXACTLY this JSON shape and nothing else:
{
  "industry": "short label",
  "vibe": "3-5 adjectives",
  "palette": { "primary": "#hex", "accent": "#hex", "neutrals": ["#hex","#hex"] },
  "fonts": { "display": "Google Font name", "body": "Google Font name" },
  "pages": [ { "path": "index.html", "title": "Home", "purpose": "one line", "sections": ["hero","..."] } ],
  "imageryKeywords": ["keyword","keyword"],
  "tone": "one line"
}

Rules:
- 2 to 5 pages appropriate to the request. ALWAYS include "index.html" first (the home page). Common others: about.html, services.html / menu.html / features.html, pricing.html, contact.html.
- Real Google Fonts. A cohesive, on-brand palette (NOT default blue-on-white).
- Output ONLY the JSON object.`,
  },
  { role: 'user' as const, content: prompt },
];

// STEP 2 — build ONE page, consistent with the brief and linking to the other pages.
export const buildPageMessages = (brief: DesignBrief, page: BriefPage, pages: BriefPage[], originalPrompt: string) => {
  const nav = pages.map((p) => `${p.title} → ${p.path}`).join(', ');
  const neutrals = (brief.palette?.neutrals || []).join(', ');
  return [
    {
      role: 'system' as const,
      content: `You are an award-winning web developer building ONE page of a MULTI-PAGE website: the "${page.title}" page (file: ${page.path}).

PROJECT: ${originalPrompt}
INDUSTRY / VIBE: ${brief.industry ?? ''} — ${brief.vibe ?? ''}. Tone: ${brief.tone ?? ''}.

DESIGN SYSTEM — apply IDENTICALLY on every page so the site feels cohesive:
- Colours: primary ${brief.palette?.primary ?? ''}, accent ${brief.palette?.accent ?? ''}, neutrals ${neutrals}.
- Fonts: display "${brief.fonts?.display ?? 'Space Grotesk'}" for headings, "${brief.fonts?.body ?? 'Inter'}" for body (load via Google Fonts <link>).
- Imagery: use these keywords as picsum seeds — ${(brief.imageryKeywords || []).join(', ')}.

THIS PAGE — purpose: ${page.purpose ?? ''}. Suggested sections: ${(page.sections || []).join(', ')}.

MULTI-PAGE NAVIGATION (identical sticky header + footer on every page):
- The header nav links MUST point to the real page files: ${nav}. Use href="about.html" style links (the actual filenames), NEVER href="#".
- Mark the CURRENT page ("${page.path}") as the active nav item.
- In-page CTAs may still scroll to sections via #anchors.

- Include this EXACT script in <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes for all styling, animation and responsiveness.

${DESIGN_GUIDE}

CRITICAL HARD RULES:
1. Output ONLY the complete HTML document for THIS page. Start with <!DOCTYPE html>, nothing before or after.
2. No markdown fences, no explanations, no "reasoning"/"analysis" hidden fields.`,
    },
    { role: 'user' as const, content: `Build the ${page.title} page (${page.path}).` },
  ];
};

// STEP 2a — build the SHARED LAYOUT (chrome) once, so the logo/header/nav/footer are
// IDENTICAL on every page. Contains a single <!--PAGE_CONTENT--> placeholder.
export const buildLayoutMessages = (brief: DesignBrief, pages: BriefPage[], originalPrompt: string) => {
  const nav = pages.map((p) => `${p.title} → ${p.path}`).join(', ');
  const neutrals = (brief.palette?.neutrals || []).join(', ');
  return [
    {
      role: 'system' as const,
      content: `You are an award-winning web designer. Build the SHARED LAYOUT ("chrome") that EVERY page of this multi-page site reuses, so the logo, header, navigation and footer are byte-for-byte IDENTICAL on every page.

PROJECT: ${originalPrompt}
INDUSTRY / VIBE: ${brief.industry ?? ''} — ${brief.vibe ?? ''}. Tone: ${brief.tone ?? ''}.
DESIGN SYSTEM: primary ${brief.palette?.primary ?? ''}, accent ${brief.palette?.accent ?? ''}, neutrals ${neutrals}. Fonts: display "${brief.fonts?.display ?? 'Space Grotesk'}", body "${brief.fonts?.body ?? 'Inter'}" (load via Google Fonts <link>).

Output a COMPLETE HTML document containing ONLY the shared chrome:
- <head>: <html lang="en">, <meta viewport>, a real <title>, the Google Fonts <link>, the Tailwind browser script <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>, the AOS css <link href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css" rel="stylesheet">, and an emoji SVG favicon that fits the brand.
- Invent a fitting BRAND NAME for this business and use it as the wordmark logo.
- A STICKY <header> with the logo + a <nav> linking to EVERY page by its real filename: ${nav}. Include a WORKING mobile hamburger menu (a button hidden on md+ that toggles the nav via JS). Style the active link via a[aria-current="page"] (accent colour / underline).
- Right inside the <body> content area, put EXACTLY this and nothing else there: <main id="page"><!--PAGE_CONTENT--></main>
- A rich <footer> (brand, page links, socials, copyright).
- Before </body>: the AOS script + AOS.init({ duration: 800, once: true }) and the mobile-menu toggle JS. Add html { scroll-behavior: smooth }.

CRITICAL:
- Include the literal placeholder <!--PAGE_CONTENT--> EXACTLY ONCE, inside <main>.
- Do NOT put any hero/sections/page content in the layout — only the shared chrome.
- Output ONLY the HTML document. Start with <!DOCTYPE html>. No markdown fences, no explanations.`,
    },
    { role: 'user' as const, content: 'Build the shared layout.' },
  ];
};

// STEP 2b — build ONLY the unique content for one page (goes inside the shared <main>).
export const buildContentMessages = (brief: DesignBrief, page: BriefPage, originalPrompt: string) => {
  const neutrals = (brief.palette?.neutrals || []).join(', ');
  return [
    {
      role: 'system' as const,
      content: `You are building the UNIQUE CONTENT for the "${page.title}" page of a multi-page site. The shared header, nav, footer, fonts and Tailwind are ALREADY provided by the layout — do NOT repeat any of them.

PROJECT: ${originalPrompt}
DESIGN SYSTEM (match exactly): primary ${brief.palette?.primary ?? ''}, accent ${brief.palette?.accent ?? ''}, neutrals ${neutrals}. Fonts already loaded: display "${brief.fonts?.display ?? ''}", body "${brief.fonts?.body ?? ''}".
THIS PAGE — purpose: ${page.purpose ?? ''}. Suggested sections: ${(page.sections || []).join(', ')}.

Requirements:
- Output ONLY the inner content for THIS page — a series of <section> blocks. NO <html>, <head>, <header>, <nav>, <footer>, and NO <main> wrapper.
- Use Tailwind utility classes and the design-system colours/fonts consistently with the rest of the site.
- Real images: https://picsum.photos/seed/KEYWORD/WIDTH/HEIGHT and avatars https://i.pravatar.cc/150?img=N (N 1-70). Never gray boxes. Imagery keywords: ${(brief.imageryKeywords || []).join(', ')}.
- Add data-aos scroll animations (fade-up / zoom-in) with staggered data-aos-delay.
- If this page needs interactive components (accordion, tabs, slider, contact form), include WORKING JavaScript for them in a <script> at the END of the fragment; forms must preventDefault and show a success message.
- Award-level quality: a bold type scale, generous whitespace, and a strong hero for the home page.

CRITICAL: Output ONLY the content fragment (start with a <section>). No page chrome, no <html>/<head>/<header>/<footer>, no markdown fences.`,
    },
    { role: 'user' as const, content: `Build the content sections for the ${page.title} page.` },
  ];
};

// Fallback — single-page generation (used if the brief step fails).
export const buildSinglePageMessages = (prompt: string) => [
  {
    role: 'system' as const,
    content: `You are an expert web developer. Create a complete, production-ready, single-page website based on this request: "${prompt}"

Build a FULL multi-section site appropriate to the request — even if the request is brief — with a header/nav, hero, several content sections, and a footer.

CRITICAL REQUIREMENTS:
- Output valid HTML ONLY.
- Include this EXACT script in the <head>: <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
- Use Tailwind utility classes for all styling, animation and responsiveness.

${DESIGN_GUIDE}

CRITICAL HARD RULES:
1. Put ALL output ONLY into the message content. Do NOT use "reasoning"/"analysis" or any hidden fields.
2. Do NOT include explanations, notes, comments or markdown code fences.
3. Output must start with <!DOCTYPE html> with nothing before or after the HTML.`,
  },
  { role: 'user' as const, content: prompt },
];
