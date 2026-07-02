import React from 'react'
import Footer from '@/shared/components/Footer';
import Seo from '@/shared/components/Seo';
import { authClient } from '@/shared/api/auth-client';
import { toast } from 'sonner';
import api from '@/shared/api/axios';
import { CheckIcon, SparklesIcon, ArrowRightIcon, Loader2Icon } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  credits: number;
  description: string;
  features: string[];
}

const Pricing = () => {
  const { data: session } = authClient.useSession();
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [pendingPlan, setPendingPlan] = React.useState<string | null>(null);

  // Pricing comes from the server (single source of truth), so the displayed price
  // can never differ from what's charged at checkout.
  React.useEffect(() => {
    api.get('/api/user/plans')
      .then(({ data }) => setPlans(data.plans))
      .catch((error) => toast.error(error?.response?.data?.message || 'Could not load plans'));
  }, []);

  const handlePurchase = async (planId: string) => {
    if (pendingPlan) return; // in-flight lock — avoid creating duplicate checkout sessions
    try {
      if (!session?.user) return toast('Please login to purchase credits');
      setPendingPlan(planId);
      // Capture the current balance so the post-payment page can detect when the
      // webhook has actually granted credits.
      try {
        const { data } = await api.get('/api/user/credits');
        localStorage.setItem('creditsBefore', String(data.credits ?? 0));
      } catch {
        localStorage.removeItem('creditsBefore');
      }
      const { data } = await api.post('/api/user/purchase-credits', { planId });
      if (!data?.payment_link) {
        // Don't navigate to `/undefined` if the server didn't return a link.
        throw new Error('Could not start checkout — please try again.');
      }
      window.location.href = data.payment_link;
    } catch (error: any) {
      setPendingPlan(null);
      // Leftover baseline would make the /loading page mis-detect a purchase.
      localStorage.removeItem('creditsBefore');
      console.error(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return (
    <div className="relative text-white overflow-hidden">
      <Seo title="Pricing" path="/pricing" description="Simple, transparent credit pricing for GenSite — start free and scale as you build." />
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/20 blur-[130px] animate-aurora" />
        <div className="absolute top-40 -right-20 w-[26rem] h-[26rem] rounded-full bg-fuchsia-600/15 blur-[120px] animate-aurora" style={{ animationDelay: '6s' }} />
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 min-h-[80vh]">
        {}
        <div className="text-center mt-20 animate-fade-in-down">
          <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">Pricing</p>
          <h1 className="text-shimmer text-4xl md:text-5xl font-semibold tracking-tight mt-3">
            Simple, transparent pricing
          </h1>
          <p className="text-shimmer text-base max-w-md mx-auto mt-4">
            Start for free and scale up as you grow. Find the perfect plan for your website-building needs.
          </p>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 items-stretch">
          {plans.map((plan, idx) => {
            const popular = plan.name.toLowerCase() === 'pro';
            return (
              <div
                key={idx}
                className={`relative animate-fade-in-up ${popular ? 'md:-mt-4 md:mb-4' : ''}`}
                style={{ animationDelay: `${idx * 0.12}s` }}
              >
                {}
                <div className={`h-full rounded-2xl p-px ${popular ? 'gradient-border shadow-premium' : 'bg-white/10'}`}>
                  <div className={`relative h-full flex flex-col rounded-2xl p-7 ${popular ? 'bg-zinc-950/90' : 'bg-white/[0.03] backdrop-blur-xl'}`}>
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                        <SparklesIcon className="size-3" /> Most popular
                      </span>
                    )}

                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-gray-400 text-sm">/ {plan.credits} credits</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-3">{plan.description}</p>

                    <div className="divider-gradient w-full my-6 opacity-50" />

                    <ul className="space-y-3 mb-8 text-sm flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className={`flex items-center justify-center size-5 rounded-full shrink-0 ${popular ? 'bg-indigo-500/30' : 'bg-white/10'}`}>
                            <CheckIcon className="size-3 text-indigo-300" />
                          </span>
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={pendingPlan !== null}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium active:scale-95 smooth-transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        popular
                          ? 'bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/40 animate-gradient'
                          : 'glass hover:bg-white/10'
                      }`}
                    >
                      {pendingPlan === plan.id ? (
                        <>Redirecting <Loader2Icon className="size-4 animate-spin" /></>
                      ) : (
                        <>Get {plan.name} <ArrowRightIcon className="size-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mx-auto text-center text-sm max-w-md mt-12 text-gray-400 font-light">
          Project <span className="text-white">creation / revision</span> consumes
          <span className="text-white"> 5 credits</span>. Purchase more credits anytime to keep building.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
