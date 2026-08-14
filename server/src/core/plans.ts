// The ONE source of truth for credit plans. The server both charges from this
// (purchaseCredits) and serves it to the client (GET /api/user/plans), so the
// displayed price can never drift from what's actually charged.

export interface Plan {
  id: 'basic' | 'pro' | 'enterprise';
  name: string;
  price: string;       // display string, e.g. "$5"
  amount: number;      // USD dollars actually charged
  credits: number;
  description: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$5',
    amount: 5,
    credits: 100,
    description: 'For trying things out.',
    features: ['100 credits', '~20 website generations', 'Publish to the community gallery'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    amount: 19,
    credits: 400,
    description: 'For regular builders.',
    features: ['400 credits', '~80 website generations', 'Everything in Basic'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$49',
    amount: 49,
    credits: 1000,
    description: 'For heavy use.',
    features: ['1000 credits', '~200 website generations', 'Everything in Pro'],
  },
];

export const getPlan = (id: string): Plan | undefined => PLANS.find((p) => p.id === id);
