import { CodeBlock } from "@/components/docs/code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const issueSnippet = `# Authenticated with your user session (same JWT the dashboard uses).
# Body: the agent's ElGamal private key — available in your browser when
# the agent's treasury is unlocked.
curl -X POST "$VELUM_API_URL/api/agents/<agent-db-id>/sdk-key" \\
  -H "Authorization: Bearer <your-access-token>" \\
  -H "Content-Type: application/json" \\
  -d '{ "privateKey": "0x..." }'

# → { "success": true, "apiKey": "vk_agent_...", "expiresAt": "..." }`;

const operatorSnippet = `# Operator alternative (self-hosted backend): mint a key directly.
cd app/backend
npx tsx src/scripts/mintSdkKey.ts <agent-db-uuid|onchain-agent-id> <agent-private-key>`;

const usageSnippet = `# Store it as an environment variable; it is shown exactly once.
export VELUM_API_KEY="vk_agent_..."`;

export default function ApiKeysPage() {
  return (
    <>
      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>API keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            An SDK API key is a <span className="text-slate-200">capability token</span>{" "}
            scoped to one agent:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200">
              vk_agent_&lt;payload&gt;.&lt;signature&gt;
            </code>
            . It authenticates every SDK call and carries everything the
            platform needs to pay on the agent&apos;s behalf. Keys expire after{" "}
            <span className="text-slate-200">5 days</span> and are shown exactly
            once at issuance — store them like any other secret.
          </p>
          <CodeBlock code={issueSnippet} label="Issue a key over HTTP" />
          <CodeBlock code={operatorSnippet} label="Or from the backend (self-hosted)" />
          <CodeBlock code={usageSnippet} label="Use it" />
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem]">
        <CardHeader>
          <CardTitle>Custody model — what the platform can and cannot see</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            Velum has two custody modes, and we state them plainly:
          </p>
          {[
            {
              title: "Dashboard (self-custody)",
              body: "Your agent's private key never leaves the browser. Balances are decrypted and proofs are generated client-side.",
            },
            {
              title: "SDK (delegated proving)",
              body: "The private key travels inside the API key, sealed with AES-256-GCM under a secret only the platform's prover worker holds. The API backend validates your key's signature but cannot decrypt the sealed key. The prover unseals it in memory, for the duration of one proof, and never persists it — nothing is stored in any database.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-sm font-medium text-white">{item.title}</div>
              <p className="mt-1 text-sm leading-7 text-slate-400">{item.body}</p>
            </div>
          ))}
          <p className="max-w-3xl text-sm leading-7 text-slate-400">
            Delegated proving trades transient key exposure{" "}
            <em>to the platform&apos;s prover</em> for universal reach: any Node
            process can pay, with no wasm or proving stack. That is consistent
            with Velum&apos;s threat model — confidentiality is against the
            public and competitors, not against the platform. Local proving in
            the SDK is on the roadmap, as are key revocation and per-key spend
            limits; today the 5-day expiry bounds a leaked key.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
