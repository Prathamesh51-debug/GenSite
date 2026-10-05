// Shared design guidance injected into the website-generation prompt so generated
// sites look professionally designed (not generic) and use real assets instead of
// gray placeholder boxes. Distilled from ui-ux-pro-max design intelligence.

export const DESIGN_GUIDE = `DESIGN QUALITY — make it look like a premium, professionally designed site:
- Choose a cohesive, modern color palette appropriate to the industry (one primary, one accent, plus neutral grays). Avoid default blue-on-white blandness.
- Load a strong Google Fonts pairing via <link> in the <head>: a characterful display font for headings (e.g. Space Grotesk, Sora, Poppins, Clash) + a clean sans for body (e.g. Inter, DM Sans).
- Use generous whitespace, a consistent spacing rhythm, clear visual hierarchy (large bold headings), rounded corners, subtle shadows and tasteful gradients.
- Add polish: sticky header, a strong hero with one clear CTA, alternating section backgrounds, hover states and smooth transitions (transition, duration-300, hover:scale-105, group-hover) on EVERY interactive element and section.
- Mobile-first responsive layout using Tailwind prefixes (sm: md: lg: xl:).

REAL IMAGES — every visual must ACTUALLY LOAD and MATCH this site's subject (never gray boxes, never off-topic):
- Content photos: https://loremflickr.com/WIDTH/HEIGHT/KEYWORD?lock=N
  - KEYWORD = 1-3 SINGLE words joined by commas, with NO spaces and NO multi-word phrases. CORRECT: "trading,finance,charts" or "coffee,cafe". WRONG: "trading platform interface" or "crypto%20dashboard" — spaces break the image and it won't load. Keep the words on-topic and SAFE for THIS business.
  - N = a unique integer per image, so each image is STABLE across reloads and DISTINCT from the others. Use a fitting keyword for every hero, card and section image.
- Avatars (testimonials/team): https://i.pravatar.cc/150?img=N (N between 1 and 70).
- Every <img> needs descriptive alt text and explicit width/height (or aspect-ratio) to avoid layout shift.
- NEVER stand in an image with a fake "mockup" / "product screenshot" / "app UI" placeholder box, an empty gradient <div>, or a captioned grey rectangle. If a section needs a product screenshot, app/dashboard UI or a hero visual, use a REAL <img> loading a loremflickr URL with a fitting keyword (e.g. "dashboard,software,ui" or "app,analytics,screen"). Do NOT emit any element whose only content is placeholder/caption text describing an image that isn't there.
- NEVER cover an <img> with an absolutely-positioned gradient/overlay <div> (e.g. class "absolute inset-0 bg-gradient-..."): a positioned overlay paints ON TOP and hides the photo. If you want a tint, put it BEHIND the image or use low opacity; the actual photo must always be visible.

SEO & METADATA — include in every page:
- <html lang="en">, a real <title>, <meta name="description">, Open Graph tags (og:title, og:description, og:image set to a loremflickr URL using the main keyword), and <meta name="viewport" content="width=device-width, initial-scale=1">.
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

export const EDIT_IMAGE_RULES = `IMAGES — every new visual must actually LOAD (never a fake box):
- Use a real <img> whose src is https://loremflickr.com/WIDTH/HEIGHT/KEYWORD?lock=N — KEYWORD is 1-3 SINGLE words joined by commas with NO spaces (e.g. "dashboard,software,ui" or "coffee,cafe"), N a unique integer per image. Avatars: https://i.pravatar.cc/150?img=N (N 1-70). Give every <img> alt text and explicit width/height.
- NEVER produce a fake "mockup"/"screenshot"/"product UI" placeholder box, an empty gradient <div>, or a captioned grey rectangle in place of an image. A product screenshot / app / dashboard visual must be a REAL <img> with a fitting keyword.
- If the element you are editing IS (or contains) such a placeholder — e.g. an absolutely-positioned "absolute inset-0 bg-gradient-..." overlay standing in for an image — REMOVE that overlay and put a real <img> in its place. Never leave a positioned gradient/overlay <div> covering the photo (it paints on top and hides it).`;

// Single-page site generation — the primary generation path.
export const buildSinglePageMessages = (prompt: string) => [
  {
    role: 'system' as const,
    content: `You are an expert web developer. Create a complete, production-ready, single-page website based on the user's request in the user message (which may include a DESIGN BRIEF to follow).

The user's OWN words always take priority. The DESIGN BRIEF is only a helpful expansion for anything the user left unspecified — wherever the brief conflicts with something the user explicitly asked for (a colour, a theme, a specific section or feature), follow the USER and ignore the brief on that point.

Build a FULL multi-section site appropriate to the request — even if the request is brief — with a header/nav, hero, several content sections, and a footer.

SINGLE-PAGE NAVIGATION — this is ONE page; the nav scrolls, it never leaves the page:
- Give every major section a real id AND data-section-id: <header data-section-id="header">, <section id="hero" data-section-id="hero">, <section id="about" data-section-id="about">, <footer data-section-id="footer">, etc.
- Every header/nav link MUST be an in-page anchor href="#section-id" that points to a section id that ACTUALLY EXISTS on this page. Build the sections first, then create the nav from exactly those ids — every nav link must resolve to a real section, with NO mismatches.
- NEVER use href="#" (dead link) and NEVER link to another file (no about.html, menu.html, shop.html, order.html). There is only this one page.
- The mobile hamburger menu uses the SAME #section-id anchors and closes on click.
- Add html { scroll-behavior: smooth } AND, before </body>, a script that intercepts clicks on nav anchors and smooth-scrolls to the target section, so navigation works reliably.

CRITICAL REQUIREMENTS:
- Output valid HTML ONLY.
- Ensure all semantic sections have data-section-id attributes for surgical edit-scoping.
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

// Expand a short/vague request into a COMPLETE, PRESCRIPTIVE single-page brief so
// that even a small/weak model can produce an excellent site by following it literally.
export const buildEnhanceMessages = (prompt: string) => [
  {
    role: 'system' as const,
    content: `You are a senior art director and copywriter. Turn the user's brief website request into a COMPLETE, PRESCRIPTIVE build brief for a SINGLE-PAGE website — detailed and concrete enough that even a small or weak AI model can produce an excellent, premium site by following it literally. Output plain text only (no markdown fences, no preamble, no explanation).

Invent a fitting brand name, then specify EXACTLY (be concrete — real names and values, never vague adjectives):
- BRAND & POSITIONING: brand name, one-line value proposition, target audience, tone (3-4 words).
- PALETTE: primary, accent, and 2 neutral colours as #hex — on-brand for the industry (never default blue-on-white).
- FONTS: a Google Fonts pairing by exact name — a display font for headings + a clean body font.
- SECTIONS (in order, e.g. hero → ... → footer): for EACH section give its <section id>, a concrete headline/subhead direction, the SPECIFIC content it shows (real example items — e.g. 3 named products with one-line descriptions, actual FAQ questions — not "some products"), the layout (grid / split / columns), any CTA button text, and one loremflickr image KEYWORD for it.
- NAVIGATION: the header nav items, each mapping to a section id above.
- FEATURES/INTERACTIONS: the specific interactive pieces to include (mobile hamburger menu, contact form with named fields, FAQ accordion, etc.).

Hard rules: it is ONE page — describe SECTIONS, never separate pages or files. Preserve every detail the user stated; only invent where they were silent. Keep it tight and skimmable.`,
  },
  { role: 'user' as const, content: prompt },
];
