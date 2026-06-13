# Vendored circuits (frontend)

These compiled Noir circuits are **copied** from `wallet_proof/target/` so the
Next.js build doesn't depend on that directory (it's gitignored and not present
on a fresh clone / on Vercel). They are imported at build time by
`lib/utils/agent-private-features.ts` for client-side proving (deposit, withdraw,
transfer).

## Re-sync after recompiling circuits

If you rebuild the circuits in `wallet_proof/`, refresh these copies:

```bash
npm run sync-circuits   # from app/frontend
```
