import React from 'react'
import Footer from '@/shared/components/layout/Footer';
import Seo from '@/shared/components/layout/Seo';
import { authClient } from '@/shared/api/auth-client';
import { toast } from 'sonner';
import api from '@/shared/api/axios';
import { CheckIcon, SparklesIcon, ArrowRightIcon, Loader2Icon } from 'lucide-react';
import { SketchUnderline } from '@/shared/components/ui/HandDrawn';

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
    <div className="relative text-foreground overflow-hidden">
      <Seo title="Pricing" path="/pricing" description="Simple, transparent credit pricing for GenSite — start free and scale as you build." />
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute top-40 -right-20 w-[26rem] h-[26rem] rounded-full bg-clay/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-6xl mx-auto px-4 min-h-[80vh]">
        {}
        <div className="text-center mt-20 animate-fade-in-down">
          <p className="text-eyebrow">Credits, not contracts</p>
          <h1 className="font-display text-[44px] md:text-[66px] leading-[1.04] font-bold tracking-tight mt-3 text-foreground">
            Pay for what you{' '}
            <span className="relative inline-block whitespace-nowrap text-primary">
              build
              <SketchUnderline className="text-clay" />
            </span>.
          </h1>
          <p className="text-[17px] md:text-[18px] max-w-md mx-auto mt-6 text-muted-foreground">
            Start free, top up whenever. No subscriptions, no surprises — every credit goes straight into building.
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
                <div className={`h-full rounded-organic ${popular ? 'ink-border shadow-sticker tilt-right bg-card' : 'border border-border bg-card'}`}>
                  <div className="relative h-full flex flex-col rounded-organic p-7">
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        <SparklesIcon className="size-3" /> Most popular
                      </span>
                    )}

                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-4xl font-bold text-foreground">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">/ {plan.credits} credits</span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-3">{plan.description}</p>

                    <div className="divider-gradient w-full my-6 opacity-70" />

                    <ul className="space-y-3 mb-8 text-sm flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className={`flex items-center justify-center size-5 rounded-full shrink-0 ${popular ? 'bg-primary/20' : 'bg-secondary'}`}>
                            <CheckIcon className="size-3 text-primary" />
                          </span>
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handlePurchase(plan.id)}
                      disabled={pendingPlan !== null}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-organic-sm text-sm font-semibold active:scale-95 smooth-transition disabled:opacity-60 disabled:cursor-not-allowed ${
                        popular
                          ? 'bg-primary text-primary-foreground shadow-sticker-strong hover:brightness-105'
                          : 'bg-card border border-border text-foreground hover:border-primary/50'
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

        <p className="mx-auto text-center text-sm max-w-md mt-12 text-muted-foreground">
          Project <span className="text-foreground font-medium">creation / revision</span> consumes
          <span className="text-foreground font-medium"> 5/20 credits</span> depending on the model. Purchase more credits anytime to keep building.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
