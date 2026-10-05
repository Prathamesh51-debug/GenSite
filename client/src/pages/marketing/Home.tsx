import api from '@/shared/api/axios';
import { authClient } from '@/shared/api/auth-client';
import { useCredits } from '@/features/billing/hooks/use-credits';
import { ArrowRightIcon, Loader2Icon, CheckIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import Footer from '@/shared/components/layout/Footer';
import Seo from '@/shared/components/layout/Seo';
import { SketchUnderline, SketchTick, Sparkle } from '@/shared/components/ui/HandDrawn';

const PENDING_KEY = 'gensite:pendingPrompt';

const cyclingWords = ['a portfolio', 'a café site', 'a landing page', 'a storefront', 'an event page'];

const examplePrompts = [
  'A café with a menu & story',
  'A photographer’s portfolio',
  'A store for a coffee brand',
];

// The real generation pipeline, in warm words. Each step is honest about what the
// server does (see server/src/generation/orchestrator) with the mechanism as a tag.
const buildSteps = [
  { tx: 'Charge 5/20 credits', tag: 'atomic' },
  { tx: 'Grow your prompt into a brief', tag: 'brief' },
  { tx: 'Pick the right engine for the job', tag: 'auto' },
  { tx: 'Write the whole page live', tag: 'streamed' },
  { tx: 'Double-check nothing got cut off', tag: 'retry' },
  { tx: 'Drop in real photos', tag: 'pexels' },
  { tx: 'Save a version you can roll back to', tag: 'settled' },
];

const buildSentences = [
  'a cosy neighbourhood café with a menu and a story',
  'a portfolio for a landscape photographer',
  'a storefront for a vintage sneaker shop',
  'an event page for a summer music festival',
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

const Reveal = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div className={className} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
    {children}
  </motion.div>
);

/* ── Cycling headline word — fixed-width slot so nothing reflows ────────── */
const CyclingWord = () => {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % cyclingWords.length), 2200);
    return () => clearInterval(id);
  }, [reduce]);
  return (
    <span className="relative inline-block text-clay align-baseline" style={{ minWidth: '6.4em' }}>
      <motion.span key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="inline-block">
        {cyclingWords[i]}
      </motion.span>
    </span>
  );
};

/* ── Hand-drawn prompt pill (the real generate form) ───────────────────── */
const PromptPill = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const credits = useCredits();

  const [tiers, setTiers] = useState<any[]>([]);
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  useEffect(() => {
    api.get('/api/user/models').then(({ data }) => setTiers(data.models)).catch(() => {});
  }, []);
  const activeTier = tiers.find((t) => t.id === tier);
  const cost = activeTier?.credits ?? (tier === 'premium' ? 20 : 5);

  const insufficient = credits !== null && credits < cost;
  const creditsPending = !!session?.user && credits === null;

  // Sign-in handoff: if the visitor typed an idea before signing in, we stashed it.
  // On return, pre-fill so they just hit Generate (no surprise credit charge).
  useEffect(() => {
    if (!session?.user) return;
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    sessionStorage.removeItem(PENDING_KEY);
    try {
      const saved = JSON.parse(raw) as { prompt?: string; tier?: 'free' | 'premium' };
      if (saved.prompt) {
        setInput(saved.prompt);
        if (saved.tier) setTier(saved.tier);
        toast('Welcome back — hit Generate to build your site.');
      }
    } catch { /* ignore malformed */ }
  }, [session?.user]);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return toast.error('Describe the site you want first.');
    if (!session?.user) {
      // Stash the idea and send them to sign in; they resume right here afterwards.
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ prompt: input, tier }));
      toast('Sign in to start building — we saved your idea.');
      return navigate('/auth/signin');
    }
    if (insufficient) { toast.error(`You need at least ${cost} credits to create a project.`); return navigate('/pricing'); }

    setLoading(true);
    const slowTimer = window.setTimeout(() => {
      toast('Waking the server… the first request can take up to a minute.', { id: 'cold-start', duration: 15000 });
    }, 5000);
    try {
      const { data } = await api.post('/api/user/project', { initial_prompt: input, model: tier });
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
    <motion.div variants={fadeUp} className="relative w-full max-w-[480px]">
      <form
        onSubmit={onSubmitHandler}
        className="relative bg-card ink-border rounded-organic shadow-sticker tilt-left px-5 pt-6 pb-5"
      >
        {/* doodle sparkle in the corner */}
        <Sparkle className="absolute -top-3 -right-2 size-6 text-clay rotate-12" />

        <label htmlFor="home-prompt" className="font-serif-display italic text-[15px] text-primary relative inline-block">
          Tell me what to build
          <SketchUnderline className="text-clay" />
        </label>

        <div className="relative mt-4">
          <textarea
            id="home-prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim() && !loading && !creditsPending) e.currentTarget.form?.requestSubmit();
              }
            }}
            className="w-full bg-transparent outline-none resize-none text-[15.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/80"
            rows={3}
            maxLength={2000}
            aria-label="Describe the website you want to build"
            placeholder="a cosy café with a menu, a story, and a way to find us…"
            required
          />
          {/* pine wavy underline under the field — no box */}
          <div className="relative h-0">
            <SketchUnderline className="text-primary/70" style={{ bottom: '2px' }} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <div role="group" aria-label="Quality tier" className="inline-flex items-center rounded-organic-sm border border-border bg-secondary/60 p-0.5">
            {(['free', 'premium'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                disabled={loading}
                aria-pressed={tier === t}
                className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${tier === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t === 'free' ? 'Free' : 'Premium'}
              </button>
            ))}
          </div>
          <span className="font-serif-display italic text-xs text-muted-foreground hidden sm:inline">{cost} credits</span>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground rounded-organic-sm shadow-sticker-strong tilt-right px-5 py-2.5 font-semibold text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading || creditsPending}
          >
            {!loading ? (<>Generate <ArrowRightIcon className="size-4" /></>) : (<>Building <Loader2Icon className="animate-spin size-4" /></>)}
          </motion.button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2.5 mt-5">
        <span className="font-serif-display italic text-xs text-muted-foreground">try —</span>
        {examplePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setInput(prompt)}
            className="text-xs text-foreground/80 bg-card border border-border rounded-organic-sm px-3 py-1.5 hover:border-primary/50 hover:text-primary transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

/* ── The "build card" — warm, hand-drawn pipeline that ticks itself ─────── */
const BuildCard = () => {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? buildSentences[0] : '');
  const [active, setActive] = useState(reduce ? buildSteps.length : -1);
  const [done, setDone] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    const timers: number[] = [];
    let sIndex = 0;
    const wait = (ms: number) => new Promise<void>((res) => { timers.push(window.setTimeout(res, ms)); });

    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        const sentence = buildSentences[sIndex % buildSentences.length];
        setDone(false);
        setActive(-1);
        setTyped('');
        // type it out
        for (let c = 0; c <= sentence.length && !cancelled; c++) {
          setTyped(sentence.slice(0, c));
          await wait(26);
        }
        await wait(500);
        // tick each step
        for (let s = 0; s < buildSteps.length && !cancelled; s++) {
          setActive(s);
          await wait(520);
        }
        if (cancelled) break;
        setDone(true);
        await wait(2800);
        sIndex++;
      }
    };
    run();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [reduce]);

  return (
    <div className="relative mx-auto w-full max-w-[660px] bg-card ink-border rounded-organic-lg shadow-sticker tilt-right px-6 py-7 sm:px-8 sm:py-8">
      <p className="font-serif-display italic text-sm text-muted-foreground">you type…</p>
      <p className="relative mt-2 text-lg sm:text-xl font-medium text-foreground leading-snug inline-block">
        <span>{typed}</span>
        {!done && !reduce && <span className="inline-block w-0.5 h-5 bg-primary align-middle ml-0.5 animate-pulse" />}
        <SketchUnderline className="text-clay" />
      </p>

      <div className="mt-7 grid gap-1.5">
        {buildSteps.map((step, idx) => {
          const on = idx <= active;
          return (
            <div key={step.tx} className={`flex items-center gap-3 py-1 transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-40'}`}>
              <span className={`relative grid place-items-center size-6 shrink-0 rounded-[7px] border-2 ${on ? 'border-primary text-primary' : 'border-border text-transparent'}`}>
                {on && <SketchTick className="size-4" />}
              </span>
              <span className="text-[15px] text-foreground">{step.tx}</span>
              <span className="font-code text-[11px] text-muted-foreground ml-auto shrink-0">{step.tag}</span>
            </div>
          );
        })}
      </div>

      <motion.p
        animate={{ opacity: done ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 font-serif-display italic text-[15px] text-primary"
      >
        🎉 your site is ready to publish
      </motion.p>
    </div>
  );
};

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  return (
    <div className="text-sm text-foreground overflow-x-clip">
      <Seo path="/" />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative px-4 md:px-16 lg:px-24 xl:px-32">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-60" />
        </div>

        <motion.div
          className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 pt-14 md:pt-24 pb-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <div>
            <motion.h1 variants={fadeUp} className="font-display text-[54px] leading-[1.04] md:text-[76px] lg:text-[84px] md:leading-[1.02] font-bold tracking-tight text-foreground">
              Build <CyclingWord /> from{' '}
              <span className="relative inline-block whitespace-nowrap text-primary">
                one sentence
                <SketchUnderline className="text-primary" />
              </span>.
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-8 max-w-md text-[18px] md:text-[19px] leading-relaxed text-muted-foreground">
              Describe the site you want in plain words. GenSite drafts the copy, writes the page,
              drops in real photos, and hands you something you can publish — no templates, no blank canvas.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckIcon className="size-4 text-primary" /> Start free</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-4 text-primary" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-4 text-primary" /> Edit it by chatting</span>
            </motion.div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <PromptPill />
          </div>
        </motion.div>

        {/* ── Pipeline build card ──────────────────────────────────────── */}
        <div className="mx-auto w-full max-w-6xl mt-20 md:mt-28">
          <Reveal className="text-center mb-10">
            <p className="text-eyebrow">Behind the scenes</p>
            <h2 className="font-display mt-3 text-[28px] md:text-[42px] leading-[1.12] font-bold tracking-tight text-foreground">
              Everything that happens the second you hit{' '}
              <span className="relative inline-block whitespace-nowrap text-clay">
                generate
                <SketchUnderline className="text-clay" />
              </span>.
            </h2>
          </Reveal>
          <Reveal>
            <BuildCard />
          </Reveal>
        </div>
      </section>

      {/* ── Ready to build (CTA) ────────────────────────────────────────── */}
      <section className="relative mx-auto mt-24 md:mt-28 max-w-4xl px-4">
        <Reveal className="relative overflow-hidden rounded-organic-lg bg-card ink-border shadow-sticker tilt-left px-6 py-16 text-center md:py-20">
          <Sparkle className="absolute top-7 right-9 size-7 text-clay rotate-12" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-foreground">
              Ready to build your{' '}
              <span className="relative inline-block whitespace-nowrap text-primary">
                next site
                <SketchUnderline className="text-clay" />
              </span>?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-muted-foreground">One sentence is all it takes. Your first project is moments away.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => (session?.user ? navigate('/projects') : navigate('/auth/signin'))}
                className="flex items-center gap-2 rounded-organic-sm bg-primary text-primary-foreground px-7 py-3 font-semibold shadow-sticker-strong tilt-right"
              >
                Start building free <ArrowRightIcon className="size-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 rounded-organic-sm bg-card border border-border px-7 py-3 font-medium text-foreground hover:border-primary/50 transition-colors"
              >
                View pricing
              </motion.button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-serif-display italic text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 not-italic font-sans"><CheckIcon className="size-3.5 text-primary" /> No credit card required</span>
              <span className="flex items-center gap-1.5 not-italic font-sans"><CheckIcon className="size-3.5 text-primary" /> Free starter credits</span>
              <span className="flex items-center gap-1.5 not-italic font-sans"><CheckIcon className="size-3.5 text-primary" /> Export your code anytime</span>
            </div>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
