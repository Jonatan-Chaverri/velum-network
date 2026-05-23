# Velum Network Frontend Draft

Initial frontend scaffold for `app-v2/frontend` using:

- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn/ui-style component structure
- Framer Motion
- Lucide Icons

## Structure

- `app/`
  - marketing landing page
  - auth pages
  - dashboard routes
- `components/ui/`
  - base reusable UI primitives
- `components/marketing/`
  - landing page sections and hero visual
- `components/dashboard/`
  - dashboard shell, cards, tables, modal flows
- `lib/data/mock.ts`
  - mock metrics, agents, marketplace, policies, API keys

## shadcn/ui Recommendations

- Add next if needed: `button`, `card`, `badge`, `input`, `textarea`, `label`, `dialog`, `sheet`, `dropdown-menu`, `table`, `tabs`, `tooltip`.
- Best next additions for this product:
  - `sheet` for mobile navigation
  - `select` and `command` for marketplace filters
  - `table` for transaction history
  - `tabs` for agent detail sub-sections
  - `toast` for payment and API key actions

## Suggested animation direction

- Floating agent nodes in hero
- Soft gradient pulse lines for private transaction paths
- Hover elevation on cards and buttons
- Dialog progress transitions for confidential payment flow

## Responsive behavior

- Landing page collapses from two-column hero to single-column stack
- Dashboard cards shift from 4-up to 2-up to 1-up
- Data tables remain horizontally scrollable on smaller screens
- Sidebar is desktop-first and ready for a mobile sheet implementation
