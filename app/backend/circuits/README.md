# Vendored circuits (backend)

These compiled Noir circuits are **copied** from `wallet_proof/target/` so the
backend deploys without depending on that directory (it's gitignored and not
present on a fresh clone / on Railway).

- `transfer.json` — loaded at runtime by the prover worker
  (`src/prover/proverWorker.ts`).
- `deposit.json` — used only by the `setupSdkDemo` script.

Both resolve via `../../circuits/<name>.json` relative to `src|dist`, which works
in dev and in the compiled build. You can override the paths with the
`TRANSFER_CIRCUIT_PATH` / `DEPOSIT_CIRCUIT_PATH` env vars.

## Re-sync after recompiling circuits

If you rebuild the circuits in `wallet_proof/`, refresh these copies:

```bash
npm run sync-circuits   # from app/backend
```
