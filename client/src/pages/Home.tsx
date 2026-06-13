import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import {
  ArrowRightIcon, Loader2Icon, SparklesIcon, ZapIcon, PaletteIcon, RocketIcon,
  MessageSquareIcon, GlobeIcon, CodeIcon, ShieldCheckIcon, CheckIcon,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Footer from '../components/Footer';

const examplePrompts = [
  'A sleek portfolio for a photographer',
  'Landing page for a SaaS startup',
  'An elegant restaurant website',
  'A modern store for a coffee brand',
];

const stats = [
  { value: '12K+', label: 'Websites generated' },
  { value: '30s', label: 'Average build time' },
  { value: '4.9/5', label: 'Creator rating' },
  { value: '99.9%', label: 'Uptime' },
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

const Home = () => {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal for sections
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal');
    if (!els?.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!session?.user) {
        return toast.error('Please sign in to create a project');
      } else if (!input.trim()) {
        return toast.error('Please enter a message');
      }
      setLoading(true);
      const { data } = await api.post('/api/user/project', { initial_prompt: input });
      setLoading(false);
      navigate(`/projects/${data.projectId}`);
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return (
    <div ref={rootRef} className="text-white text-sm overflow-hidden">
      <section className="relative flex flex-col items-center px-4">

        {/* ---------- Ambient background ---------- */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-grid" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-indigo-600/25 blur-[120px] animate-aurora" />
          <div className="absolute top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px] animate-aurora" style={{ animationDelay: '4s' }} />
          <div className="absolute top-10 -right-24 w-[30rem] h-[30rem] rounded-full bg-violet-500/20 blur-[120px] animate-aurora" style={{ animationDelay: '8s' }} />
        </div>

        {/* ---------- Badge ---------- */}
        <button
          onClick={() => navigate('/pricing')}
          className="group flex items-center gap-2 glass rounded-full p-1 pr-3 text-sm mt-20 animate-fade-in-down hover:border-indigo-400/60 hover:bg-white/10 smooth-transition"
        >
          <span className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-xs px-3 py-1 rounded-full font-medium">
            <SparklesIcon className="size-3" /> NEW
          </span>
          <p className="flex items-center gap-2 text-gray-200">
            <span>Start your 30-day free trial</span>
            <ArrowRightIcon className="size-3.5 group-hover:translate-x-1 smooth-transition" />
          </p>
        </button>

        {/* ---------- Headline ---------- */}
        <h1 className="text-center text-[40px] leading-[48px] md:text-[68px] md:leading-[76px] mt-6 font-semibold tracking-tight max-w-4xl animate-fade-in-up animate-delay-200">
          Turn thoughts into <span className="text-gradient">stunning websites</span>, instantly.
        </h1>

        <p className="text-center text-base md:text-lg max-w-xl mt-5 animate-fade-in-up animate-delay-300 text-gray-400">
          Describe your idea and watch our AI design, build and publish a beautiful, responsive website — no code required.
        </p>

        {/* ---------- Prompt box ---------- */}
        <form
          onSubmit={onSubmitHandler}
          className="glass glow-ring max-w-2xl w-full rounded-2xl p-4 mt-10 focus-within:ring-2 focus-within:ring-indigo-500/70 transition-all animate-fade-in-up animate-delay-400"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="bg-transparent outline-none text-gray-100 resize-none w-full placeholder:text-gray-500 smooth-transition"
            rows={4}
            placeholder="Describe the website you want — e.g. a sleek landing page for a coffee brand with a menu and contact section"
            required
          />
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <SparklesIcon className="size-3.5 text-indigo-400" /> Powered by AI
            </span>
            <button
              className="ml-auto flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 to-indigo-600 rounded-lg px-5 py-2.5 font-medium hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition animate-gradient disabled:opacity-70"
              disabled={loading}
            >
              {!loading ? (
                <>Create with AI <ArrowRightIcon className="size-4" /></>
              ) : (
                <>Creating <Loader2Icon className="animate-spin size-4 text-white" /></>
              )}
            </button>
          </div>
        </form>

        {/* ---------- Example chips ---------- */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 max-w-2xl animate-fade-in-up animate-delay-500">
          <span className="text-xs text-gray-500">Try:</span>
          {examplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="text-xs text-gray-300 glass rounded-full px-3 py-1.5 hover:bg-white/10 hover:text-white hover:border-indigo-400/50 smooth-transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* ---------- Product mockup ---------- */}
        <div className="reveal relative mt-24 w-full max-w-5xl">
          <div className="absolute -inset-x-10 -top-10 bottom-0 bg-indigo-600/20 blur-[100px] -z-10" />
          <div className="glass shadow-premium rounded-2xl overflow-hidden border border-white/10">
            {/* browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <span className="size-3 rounded-full bg-red-400/80" />
              <span className="size-3 rounded-full bg-yellow-400/80" />
              <span className="size-3 rounded-full bg-green-400/80" />
              <div className="ml-3 flex-1 max-w-sm flex items-center gap-2 text-xs text-gray-400 bg-black/30 rounded-md px-3 py-1.5 border border-white/5">
                <GlobeIcon className="size-3.5" /> yoursite.sitebuilder.app
              </div>
            </div>
            {/* faux generated site */}
            <div className="relative p-8 md:p-12 bg-gradient-to-b from-zinc-900 to-black">
              <div className="flex items-center justify-between mb-10">
                <div className="h-3 w-24 rounded bg-white/20" />
                <div className="hidden sm:flex gap-4">
                  <div className="h-2.5 w-12 rounded bg-white/10" />
                  <div className="h-2.5 w-12 rounded bg-white/10" />
                  <div className="h-2.5 w-12 rounded bg-white/10" />
                  <div className="h-2.5 w-16 rounded bg-indigo-400/50" />
                </div>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="h-5 w-2/3 rounded-md bg-gradient-to-r from-white/40 to-white/10 mb-3" />
                <div className="h-5 w-1/2 rounded-md bg-gradient-to-r from-fuchsia-400/40 to-indigo-400/30 mb-6" />
                <div className="h-2.5 w-3/5 rounded bg-white/10 mb-2" />
                <div className="h-2.5 w-2/5 rounded bg-white/10 mb-7" />
                <div className="flex gap-3 mb-12">
                  <div className="h-9 w-32 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600" />
                  <div className="h-9 w-28 rounded-lg border border-white/20" />
                </div>
                <div className="grid grid-cols-3 gap-4 w-full">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="size-8 rounded-lg bg-indigo-400/30 mb-3" />
                      <div className="h-2 w-3/4 rounded bg-white/15 mb-2" />
                      <div className="h-2 w-full rounded bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Stats band ---------- */}
        <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-px mt-24 w-full max-w-5xl glass rounded-2xl overflow-hidden">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center justify-center text-center py-8 px-4 bg-white/[0.02]">
              <span className="text-3xl md:text-4xl font-semibold text-gradient">{s.value}</span>
              <span className="text-xs md:text-sm text-gray-400 mt-2">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="relative px-4 mt-32 max-w-5xl mx-auto">
        <div className="reveal text-center">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">How it works</p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mt-3">From idea to live site in three steps</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
          {steps.map(({ no, icon: Icon, title, desc }, i) => (
            <div
              key={no}
              className="reveal relative glass rounded-2xl p-7 hover:bg-white/[0.06] hover:-translate-y-1 smooth-transition"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="absolute top-6 right-7 text-5xl font-bold text-white/5">{no}</span>
              <div className="flex items-center justify-center size-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 border border-white/10 mb-5">
                <Icon className="size-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="relative px-4 mt-32 max-w-6xl mx-auto">
        <div className="reveal text-center">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">Features</p>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mt-3">Everything you need to ship</h2>
          <p className="text-gray-400 mt-4 max-w-xl mx-auto">A complete toolkit that turns a single prompt into a polished, publishable website.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-14">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="reveal group glass rounded-2xl p-6 text-left hover:bg-white/[0.07] hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 smooth-transition"
              style={{ transitionDelay: `${(i % 3) * 80}ms` }}
            >
              <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 border border-white/10 mb-4 group-hover:scale-110 smooth-transition">
                <Icon className="size-5 text-indigo-300" />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative px-4 mt-32 max-w-5xl mx-auto">
        <div className="reveal gradient-border rounded-3xl p-px shadow-premium">
          <div className="relative rounded-3xl bg-zinc-950/80 backdrop-blur-xl px-6 py-16 md:py-20 text-center overflow-hidden">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-indigo-600/25 blur-[110px]" />
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">Ready to build your next website?</h2>
            <p className="text-gray-400 mt-4 max-w-lg mx-auto">Join thousands of creators turning ideas into live websites. Your first project is moments away.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button
                onClick={() => (session?.user ? navigate('/projects') : navigate('/auth/signin'))}
                className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 to-indigo-600 rounded-lg px-7 py-3 font-medium hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition animate-gradient"
              >
                Start building free <ArrowRightIcon className="size-4" />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 glass rounded-lg px-7 py-3 font-medium hover:bg-white/10 smooth-transition"
              >
                View pricing
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> Free starter credits</span>
              <span className="flex items-center gap-1.5"><CheckIcon className="size-3.5 text-indigo-400" /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
