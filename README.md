# Tap-it

Moderný systém virtuálnej permanentky pre fitká.

## Tech stack

| Vrstva | Technológia |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS + shadcn/ui |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Auth | Email/heslo, Google OAuth, Apple OAuth |
| File storage | Supabase Storage (profilové fotky) |
| QR checker | Python (pyzbar / opencv + Supabase API) |
| Mobilná app (future) | React Native |
| CI/CD | GitHub Actions |

## Štart projektu

```bash
# 1. Inštalácia závislostí
npm install

# 2. Skopírovať env šablónu a vyplniť hodnoty
cp .env.local.example .env.local

# 3. Spustiť vývojový server
npm run dev
```

Otvor [http://localhost:3000](http://localhost:3000).

## Štruktúra projektu

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout (dark theme, fonts)
│   ├── page.tsx            # Landing page (/)
│   ├── (auth)/             # login, register, forgot-password, reset-password
│   ├── dashboard/          # Používateľský dashboard
│   ├── profile/            # Profil + QR kód
│   ├── settings/           # Nastavenia
│   ├── stats/              # Personal stats
│   ├── transactions/       # Transakcie
│   ├── membership/         # Prehľad permanentiek
│   └── admin/              # Admin sekcia
├── components/
│   ├── ui/                 # shadcn/ui primitívy
│   └── ...                 # Vlastné komponenty (QRCode, LiveOccupancy, …)
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser Supabase client
│   │   └── server.ts       # Server Supabase client (RSC / Route Handlers)
│   ├── types.ts            # Zdieľané TypeScript typy
│   └── utils.ts            # cn() helper
└── middleware.ts           # Auth route protection
```

## Pridanie shadcn/ui komponentu

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dropdown-menu
# atď.
```

## Supabase migrácie

```bash
# Nová migrácia
supabase migration new <nazov>

# Aplikovať lokálne
supabase db push
```