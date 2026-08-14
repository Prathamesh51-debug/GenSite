import api from '@/shared/api/axios';
import { authClient } from '@/shared/api/auth-client';
import { useCredits } from '@/features/billing/hooks/use-credits';
import {
  ArrowRightIcon, Loader2Icon, SparklesIcon, ZapIcon, PaletteIcon, RocketIcon,
  MessageSquareIcon, GlobeIcon, CodeIcon, ShieldCheckIcon, CheckIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  motion, useMotionValue, useReducedMotion, useScroll, useTransform,
  type MotionValue, type Variants,
} from 'framer-motion';
import Footer from '@/shared/components/layout/Footer';
import Seo from '@/shared/components/layout/Seo';

const examplePrompts = [
  'A sleek portfolio for a photographer',
  'Landing page for a SaaS startup',
  'An elegant restaurant website',
  'A modern store for a coffee brand',
];

// Honest capability highlights — no fabricated usage/rating/uptime numbers.
const stats = [
  { value: 'Multi-page', label: 'Sites from one prompt' },
  { value: 'Live', label: 'Preview as it builds' },
  { value: 'Tailwind', label: 'Clean, exportable code' },
  { value: '1-click', label: 'Publish & share' },
];

const steps = [
  { no: '01', icon: MessageSquareIcon, title: 'Describe it', desc: 'Write a sentence about the site you want. No design or code skills needed.' },
  { no: '02', icon: SparklesIcon, title: 'AI builds it', desc: 'Our model generates a complete, responsive site styled with Tailwind in seconds.' },
  { no: '03', icon: GlobeIcon, title: 'Refine & publish', desc: 'Tweak with follow-up prompts, then ship it live with a single click.' },
];

const features = [
  { icon: ZapIcon, title: 'Built in seconds', desc: 'Go from idea to a working site faster than you can open a code editor.' },
  { icon: PaletteIcon, title: 'Beautifully styled', desc: 'Modern, responsive layouts crafted with Tailwind CSS out of the box.' },
  { icon: CodeIcon, title: 'Clean, real code', desc: 'Production-ready HTML you can preview, edit and export — no lock-in.' },
  { icon: RocketIcon, title: 'One-click publish', desc: 'Share a live, shareable URL the moment your site is ready.' },
  { icon: MessageSquareIcon, title: 'Iterate by chat', desc: 'Refine any detail with natural-language follow-ups and version history.' },
  { icon: ShieldCheckIcon, title: 'Secure by default', desc: 'Authentication, billing and your projects, safely handled end to end.' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 34 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

// Scroll reveals. These replace the old GSAP ScrollTrigger pass — framer-motion is
// already a dependency, so the effect costs nothing extra in the bundle, and
// `once: true` means each element animates a single time instead of scrubbing
// against every scroll event.
const Reveal = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
    {children}
  </motion.div>
);

const RevealGroup = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
    {children}
  </motion.div>
);

// The page deck: the hero's one visual. Each card carries its own open-position
// offset; a single shared scroll value scales all of them, so five cards are driven
// by one MotionValue rather than five scroll subscriptions.
// `outer` cards sit at the widest spread, so they're dropped below `sm` — at phone
// widths the full five-card fan can't fit without shrinking the deck until the pages
// are unreadable. Three cards still say "more than one page", which is the point.
const PAGES = [
  { file: 'gallery.html', x: -292, y: 38, r: -17, z: 10, accent: 'from-fuchsia-400/30', outer: true },
  { file: 'menu.html', x: -152, y: 14, r: -9, z: 20, accent: 'from-violet-400/30', outer: false },
  { file: 'index.html', x: 0, y: 0, r: 0, z: 30, accent: 'from-indigo-400/40', outer: false },
  { file: 'about.html', x: 152, y: 14, r: 9, z: 20, accent: 'from-purple-400/30', outer: false },
  { file: 'contact.html', x: 292, y: 38, r: 17, z: 10, accent: 'from-sky-400/30', outer: true },
] as const;

const FanCard = ({ page, f }: { page: (typeof PAGES)[number]; f: MotionValue<number> }) => {
  // Only `transform` — never a property that would touch layout or paint.
  const x = useTransform(f, (v) => page.x * v);
  const y = useTransform(f, (v) => page.y * v);
  const rotate = useTransform(f, (v) => page.r * v);

  return (
    <motion.div
      style={{ x, y, rotate, zIndex: page.z }}
      className={`absolute left-1/2 top-0 -ml-[95px] ${page.outer ? 'hidden sm:flex' : 'flex'} h-[240px] w-[190px] flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#16161d] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] transition-shadow duration-300 hover:shadow-[0_24px_50px_-18px_rgba(129,140,248,0.45)]`}
    >
      <div className="h-4 shrink-0 border-b border-zinc-800 bg-[#0d0d12]" />
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className={`h-8 shrink-0 rounded bg-gradient-to-r ${page.accent} to-transparent`} />
        <div className="h-1.5 rounded bg-white/10" />
        <div className="h-1.5 w-3/4 rounded bg-white/10" />
        <div className="h-1.5 w-1/2 rounded bg-white/10" />
        <div className="mt-auto h-4 w-2/5 rounded bg-indigo-400/25" />
      </div>
      <div className="font-code shrink-0 border-t border-zinc-800 px-2.5 py-1.5 text-[10px] text-gray-500">
        {page.file}
      </div>
    </motion.div>
  );
};

const PageFan = () => {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // 0 while the deck is still below the fold, 1 once it reaches the middle of the
  // viewport — so it opens as it arrives rather than at an arbitrary scroll depth.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  // Under reduced motion the deck renders already open: a closed stack would hide
  // four of the five pages, which is the whole point of the visual.
  const open = useMotionValue(1);
  const f = reduceMotion ? open : scrollYProgress;

  return (
    <div ref={ref} className="relative mx-auto mt-6 h-[170px] w-full max-w-[640px] sm:h-[220px] md:h-[260px] lg:h-[300px]" aria-hidden="true">
      {/* The deck is authored at full size and scaled to fit. The open fan reaches
          ±418px from centre (±292 offset, +95 half-card, +31 of rotation overhang),
          so full scale only clears the viewport from `lg` up — at `md` the available
          half-width is 384px and scale-100 would overflow the page. */}
      <div className="absolute inset-0 origin-top scale-[0.58] sm:scale-[0.72] md:scale-[0.85] lg:scale-100">
        {PAGES.map((page) => (
          <FanCard key={page.file} page={page} f={f} />
        ))}
      </div>
    </div>
  );
};

// The prompt box owns its own `input`/`loading` state. Keeping it OUT of <Home>
// means typing only re-renders this small form, not the rest of the hero.
const PromptForm = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const credits = useCredits();
  const insufficient = credits !== null && credits < 5;
  // A signed-in user whose balance is still loading shouldn't be able to fire a
  // create that the server will 403. Signed-OUT users keep an enabled button so
  // the click still surfaces the "please sign in" prompt.
  const creditsPending = !!session?.user && credits === null;

  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('auto');
  useEffect(() => {
    api.get('/api/user/models').then(({ data }) => setModels(data.models)).catch(() => {});
  }, []);
  const activeModel = models.find((m) => m.id === selectedModel);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return toast.error('Please sign in to create a project');
    if (!input.trim()) return toast.error('Please enter a message');
    if (insufficient) { toast.error('You need at least 5 credits to create a project.'); return navigate('/pricing'); }

    setLoading(true);
    // Cold-start hint: the API on the free tier can take 30–60s to wake up. Use a
    // stable id so we can dismiss it the moment the request resolves.
    const slowTimer = window.setTimeout(() => {
      toast('Waking the server… the first request can take up to a minute.', { id: 'cold-start', duration: 15000 });
    }, 5000);
    try {
      const { data } = await api.post('/api/user/project', { initial_prompt: input, model: selectedModel });
      // autostart tells the editor THIS is a fresh creation, so it may auto-generate
      // (reopening an ungenerated project later won't silently re-charge).
      navigate(`/projects/${data.projectId}`, { state: { autostart: true } });
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      clearTimeout(slowTimer);
      toast.dismiss('cold-start');
    }
  };

  return (
    <>
      <motion.form
        variants={fadeUp}
        onSubmit={onSubmitHandler}
        className="relative w-full bg-[#16161c]/40 backdrop-blur-2xl border border-white/10 rounded-[24px] p-5 mt-10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all duration-300 group"
      >
        <div className="absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Ignore Enter while an IME composition is active (CJK input), else it
            // submits mid-word.
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (input.trim() && !loading && !insufficient && !creditsPending) e.currentTarget.form?.requestSubmit();
            }
          }}
          className="bg-transparent outline-none text-gray-100 resize-none w-full placeholder:text-gray-500 text-[15px] relative z-10 leading-relaxed"
          rows={3}
          maxLength={2000}
          aria-label="Describe the website you want to build"
          placeholder="Describe the website you want — e.g. a sleek landing page for a coffee brand with a menu and contact section"
          required
        />
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/5 mt-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={loading}
              aria-label="Generation model"
              title={activeModel?.description}
              className="max-w-[9.5rem] sm:max-w-[15rem] truncate bg-white/5 border border-white/10 rounded-lg text-xs text-gray-200 px-2 py-1.5 outline-none focus:border-indigo-400/50 cursor-pointer disabled:opacity-60"
            >
              {models.length === 0 && <option value="auto">Auto — Smart mix</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-gray-100">{m.label}</option>
              ))}
            </select>
            {insufficient ? (
              <button type="button" onClick={() => navigate('/pricing')} className="hidden sm:flex items-center gap-1 text-xs font-medium text-amber-300/90 hover:text-amber-200 transition-colors">
                Need 5 credits
              </button>
            ) : (
              <span className="hidden sm:inline text-xs text-gray-500">· 5 credits</span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white rounded-xl px-5 py-2.5 font-semibold text-sm hover:from-[#6d28d9] hover:to-[#7c3aed] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] border border-white/10"
            disabled={loading || insufficient || creditsPending}
          >
            {!loading ? (
              <>Create with AI <ArrowRightIcon className="size-4" /></>
            ) : (
              <>Creating <Loader2Icon className="animate-spin size-4 text-white" /></>
            )}
          </motion.button>
        </div>
        {activeModel && (
          <p className="mt-2.5 text-[11px] text-gray-500 relative z-10 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-gray-400">{activeModel.description}</span>
            {(activeModel.bestFor || []).map((tag: string) => (
              <span key={tag} className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-gray-400">{tag}</span>
            ))}
          </p>
        )}
      </motion.form>

      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3 mt-8 w-full max-w-[500px]">
        <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Try:</span>
        {examplePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="text-xs text-gray-300 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 hover:border-indigo-400/60 hover:bg-white/10 hover:text-white hover:shadow-[0_0_15px_rgba(124,58,237,0.2)] transition-all duration-300"
          >
            {prompt}
          </button>
        ))}
      </motion.div>
    </>
  );
};

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <div className="text-white text-sm">
      <Seo path="/" />
      <section className="relative flex flex-col items-center px-4 md:px-16 lg:px-24 xl:px-32">

        {/* Static backdrop. Nothing in here animates, which is the point: a blur that
            never moves is rasterized once and cached by the compositor, unlike the
            old animated blobs + WebGL shader + particle canvas, which repainted the
            whole hero every frame on machines without a dedicated GPU. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="absolute -top-40 left-1/2 h-[34rem] w-[46rem] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]" />
          <div className="absolute -right-32 top-20 h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
        </div>

        <motion.div
          className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center text-center mt-12 md:mt-20"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.button
            variants={fadeUp}
            onClick={() => navigate('/pricing')}
            whileHover={{ y: -2 }}
            className="group flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full py-1 pl-1 pr-4 text-sm hover:border-indigo-500/50 hover:bg-white/10 transition-all duration-300 shadow-[0_8px_16px_rgba(0,0,0,0.3)]"
          >
            <span className="flex items-center gap-1 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]">
              NEW
            </span>
            <p className="flex items-center gap-2 text-gray-200 text-xs font-medium tracking-wide">
              <span>Start free — no credit card needed</span>
              <ArrowRightIcon className="size-3.5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </p>
          </motion.button>

          <motion.h1
            variants={fadeUp}
            className="font-display text-[44px] leading-[1.1] md:text-[64px] md:leading-[1.1] mt-7 font-bold text-white tracking-tight"
          >
            Turn thoughts into <br className="hidden md:block" />
            stunning <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">websites</span>,<br className="hidden md:block" /> instantly.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base md:text-[17px] max-w-md lg:max-w-lg mt-6 text-gray-400 leading-relaxed font-medium"
          >
            Describe your idea and watch our AI design, build and publish a beautiful, responsive website — no code required.
          </motion.p>

          <PromptForm />
        </motion.div>

        {/* The deck opens as it scrolls into view — "one prompt, every page" told as a
            gesture rather than a sentence. */}
        <Reveal className="mt-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">One prompt · every page</p>
          <h2 className="font-display mt-3 text-2xl md:text-3xl font-bold tracking-tight">Not a page. A whole site.</h2>
        </Reveal>
        <PageFan />

        <Reveal className="grid grid-cols-2 md:grid-cols-4 mt-24 w-full max-w-5xl panel shadow-elevated rounded-2xl overflow-hidden divide-x divide-y md:divide-y-0 divide-zinc-800">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center text-center py-9 px-4">
              <span className="font-display text-3xl md:text-5xl font-bold bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">{s.value}</span>
              <span className="text-xs md:text-sm text-gray-500 mt-2">{s.label}</span>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="relative px-4 mt-32 max-w-5xl mx-auto">
        <Reveal>
          <p className="text-indigo-400 text-xs font-semibold tracking-[0.2em] uppercase">How it works</p>
          <h2 className="font-display text-shimmer text-3xl md:text-5xl font-bold mt-3 max-w-2xl">From idea to live site in three steps</h2>
        </Reveal>
        <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
          {steps.map(({ no, icon: Icon, title, desc }) => (
            <motion.div
              key={no}
              variants={fadeUp}
              className="panel panel-hover relative rounded-2xl p-7 hover:-translate-y-1.5 transition-transform"
            >
              <span className="font-display absolute top-5 right-6 text-6xl font-bold text-white/[0.05]">{no}</span>
              <div className="flex items-center justify-center size-11 rounded-xl border border-zinc-800 bg-zinc-900 mb-5">
                <Icon className="size-5 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </RevealGroup>
      </section>

      <section className="relative px-4 mt-32 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-indigo-400 text-xs font-semibold tracking-[0.2em] uppercase">Features</p>
          <h2 className="font-display text-shimmer text-3xl md:text-5xl font-bold mt-3">Everything you need to ship</h2>
          <p className="text-shimmer mt-4 max-w-xl">A complete toolkit that turns a single prompt into a polished, publishable website.</p>
        </Reveal>
        <RevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-14">
          {features.map(({ icon: Icon, title, desc }, i) => {
            const wide = i === 0 || i === 3 || i === 4;
            const featured = i === 0;
            return (
              <motion.div
                key={title}
                variants={fadeUp}
                className={`panel panel-hover group rounded-2xl p-7 hover:-translate-y-1.5 transition-transform ${wide ? 'md:col-span-2' : ''} ${featured ? 'border-indigo-500/40' : ''}`}
              >
                <div className={`flex items-center justify-center size-11 rounded-xl border mb-4 transition-transform group-hover:scale-110 ${featured ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900'}`}>
                  <Icon className={`size-5 ${featured ? 'text-violet-300' : 'text-indigo-300'}`} />
                </div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400 mt-1.5 leading-relaxed max-w-md">{desc}</p>
              </motion.div>
            );
          })}
        </RevealGroup>
      </section>

      <section className="relative px-4 mt-32 max-w-5xl mx-auto">
        <Reveal className="panel glow-indigo rounded-3xl px-6 py-16 md:py-20 text-center relative overflow-hidden">
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-indigo-600/15 blur-[120px]" />
          <div className="relative z-10">
            <h2 className="font-display text-shimmer text-3xl md:text-5xl font-bold">Ready to build your next website?</h2>
            <p className="text-shimmer mt-4 max-w-lg mx-auto">Join thousands of creators turning ideas into live websites. Your first project is moments away.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => (session?.user ? navigate('/projects') : navigate('/auth/signin'))}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl px-7 py-3 font-semibold shadow-[0_10px_40px_-10px_rgba(99,102,241,0.7)]"
              >
                Start building free <ArrowRightIcon className="size-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-7 py-3 font-medium hover:border-zinc-700 transition-colors"
              >
                View pricing
              </motion.button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> Free starter credits</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> Export your code anytime</span>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
