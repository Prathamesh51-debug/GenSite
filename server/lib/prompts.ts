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

ACCESSIBILITY: semantic HTML5 landmarks (header/nav/main/section/footer), alt text, <label> tied to each input, and WCAG AA color contrast.`;
