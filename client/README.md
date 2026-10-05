# GenSite — Client

The React + Vite single-page app for **GenSite**, the AI website builder. It handles
auth, the generation UI (live SSE preview, conversational revisions, in-place element
editing), version history, billing, and the public community gallery.

> For the full product overview, architecture, and deployment, see the
> [root README](../README.md).

## Stack

- **React 19** + **TypeScript** on **Vite 7**
- **Tailwind CSS 4** + **shadcn/ui**, lucide-react icons
- **React Router 7**, Axios, Sonner (toasts)
- Framer Motion + Lenis (smooth scroll)

## Structure

```
client/src/
├── app/        # App, providers, routing
├── pages/      # route screens — marketing · app · legal
├── features/   # auth · editor · billing
└── shared/     # ui · components · lib · api
```

Imports use the `@/…` path alias.

## Getting started

```bash
npm install
cp .env.example .env     # set VITE_BASEURL to your API URL
npm run dev              # http://localhost:5173
```

## Environment

| Variable | Description |
| --- | --- |
| `VITE_BASEURL` | Backend API base URL (e.g. `http://localhost:3000`) — baked in at **build time** |

## Scripts

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit -p tsconfig.app.json   # typecheck
```

## Deployment

Deploys to **Vercel** with root = `client`. Set `VITE_BASEURL` to the API URL;
`vercel.json` handles SPA routing. See the [root README](../README.md#-deployment)
for the full picture.
