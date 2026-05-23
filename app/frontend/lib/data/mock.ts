export type ActivityItem = {
  sender: string;
  receiver: string;
  amount: string;
  status: "Completed" | "Verifying" | "Queued";
  timestamp: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  description: string;
  category: string;
  encryptedBalance: string;
  status: "Active" | "Paused" | "Policy review";
  apiRequests: string;
  spendingLimit: string;
  monthlySpend: string;
  proofGenerationCount: string;
  activeApiKeys: number;
};

export type RegisteredAgentRecord = {
  id: string;
  name: string;
  category: string;
  description: string;
  pricing: string;
  trustScore: string;
  status: "Open" | "Limited access" | "Private beta";
  integrations: string[];
  featuredCapability: string;
};

export const dashboardMetrics = [
  {
    title: "Total Agent Funds",
    value: "$8.42M",
    change: "+18.2%",
    description: "Managed across active agent workspaces",
  },
  {
    title: "Active Agents",
    value: "124",
    change: "+12",
    description: "Buying, selling, and operating autonomously",
  },
  {
    title: "Monthly Payment Volume",
    value: "$1.26M",
    change: "+31.4%",
    description: "Agent-to-agent and service payment volume",
  },
  {
    title: "Automated Payment Runs",
    value: "48.9k",
    change: "+9.1%",
    description: "Executed through Velum's payment infrastructure",
  },
];

export const activity: ActivityItem[] = [
  {
    sender: "Signal Routing Agent",
    receiver: "Research Node 12",
    amount: "Encrypted",
    status: "Completed",
    timestamp: "2 min ago",
  },
  {
    sender: "Treasury Orchestrator",
    receiver: "Compute Mesh EU-3",
    amount: "Encrypted",
    status: "Verifying",
    timestamp: "14 min ago",
  },
  {
    sender: "Quant Execution Agent",
    receiver: "API Vendor Prime",
    amount: "Encrypted",
    status: "Completed",
    timestamp: "31 min ago",
  },
  {
    sender: "Research Scout",
    receiver: "Trading Signal Agent",
    amount: "Encrypted",
    status: "Queued",
    timestamp: "1 hr ago",
  },
];

export const volumeSeries = [
  { label: "Mon", payments: 28, volume: 42 },
  { label: "Tue", payments: 52, volume: 64 },
  { label: "Wed", payments: 47, volume: 58 },
  { label: "Thu", payments: 68, volume: 84 },
  { label: "Fri", payments: 74, volume: 96 },
  { label: "Sat", payments: 59, volume: 75 },
  { label: "Sun", payments: 62, volume: 81 },
];

export const agents: AgentRecord[] = [
  {
    id: "signal-routing-agent",
    name: "Signal Routing Agent",
    description: "Routes premium market data purchases based on latency and budget.",
    category: "Trading",
    encryptedBalance: "$840k",
    status: "Active",
    apiRequests: "18.4k",
    spendingLimit: "$30k/day",
    monthlySpend: "$212k",
    proofGenerationCount: "8.1k",
    activeApiKeys: 4,
  },
  {
    id: "treasury-orchestrator",
    name: "Treasury Orchestrator",
    description: "Manages internal treasury allocation across autonomous teams.",
    category: "Treasury",
    encryptedBalance: "$2.6M",
    status: "Policy review",
    apiRequests: "9.1k",
    spendingLimit: "$120k/day",
    monthlySpend: "$404k",
    proofGenerationCount: "14.2k",
    activeApiKeys: 6,
  },
  {
    id: "research-scout",
    name: "Research Scout",
    description: "Procures reports, datasets, and model evaluations from external agents.",
    category: "Research",
    encryptedBalance: "$190k",
    status: "Active",
    apiRequests: "24.9k",
    spendingLimit: "$12k/day",
    monthlySpend: "$88k",
    proofGenerationCount: "5.9k",
    activeApiKeys: 3,
  },
  {
    id: "support-resolution-agent",
    name: "Support Resolution Agent",
    description: "Purchases verification, lookup, and routing services for user support flows.",
    category: "SaaS",
    encryptedBalance: "$76k",
    status: "Paused",
    apiRequests: "7.4k",
    spendingLimit: "$4k/day",
    monthlySpend: "$21k",
    proofGenerationCount: "1.8k",
    activeApiKeys: 2,
  },
];

export const marketplaceItems = [
  {
    name: "Research Agent",
    category: "Research",
    description: "On-demand due diligence, market maps, and source-backed intelligence.",
    price: "Starts at $18 / request",
    trustScore: "98.4",
    tags: ["AI", "Research"],
  },
  {
    name: "Compute Provider",
    category: "Compute",
    description: "GPU and CPU job execution for production agent workloads.",
    price: "$0.42 / min",
    trustScore: "97.1",
    tags: ["Compute", "APIs"],
  },
  {
    name: "API Vendor",
    category: "APIs",
    description: "Structured market, logistics, and identity APIs with usage-based billing.",
    price: "$299 / month",
    trustScore: "95.8",
    tags: ["APIs", "SaaS"],
  },
  {
    name: "Trading Signal Agent",
    category: "Trading",
    description: "Event-driven signal packages with policy-aware execution hooks.",
    price: "$32 / signal pack",
    trustScore: "96.9",
    tags: ["Trading", "AI"],
  },
];

export const registeredAgents: RegisteredAgentRecord[] = [
  {
    id: "atlas-research",
    name: "Atlas Research",
    category: "Research",
    description: "Delivers market scans, competitor briefings, and sourced intelligence for autonomous decision systems.",
    pricing: "Starts at $24 / request",
    trustScore: "98.8",
    status: "Open",
    integrations: ["OpenAI Agents", "LangChain", "Webhook"],
    featuredCapability: "Market intelligence",
  },
  {
    id: "mesh-compute",
    name: "Mesh Compute",
    category: "Compute",
    description: "Elastic GPU and CPU execution for batch inference, evaluation runs, and agent-side workloads.",
    pricing: "$0.58 / minute",
    trustScore: "97.4",
    status: "Open",
    integrations: ["REST API", "Python", "TypeScript"],
    featuredCapability: "GPU execution",
  },
  {
    id: "signal-forge",
    name: "Signal Forge",
    category: "Trading",
    description: "Streams event-driven signals, scenario triggers, and execution prompts for financial agents.",
    pricing: "$49 / pack",
    trustScore: "96.1",
    status: "Limited access",
    integrations: ["WebSocket", "REST API"],
    featuredCapability: "Signal delivery",
  },
  {
    id: "ops-pilot",
    name: "Ops Pilot",
    category: "Workflows",
    description: "Exposes operations automations for routing tickets, validating data, and coordinating internal tools.",
    pricing: "$399 / month",
    trustScore: "95.6",
    status: "Private beta",
    integrations: ["Zapier", "MCP", "Webhook"],
    featuredCapability: "Workflow automation",
  },
  {
    id: "ledger-link",
    name: "Ledger Link",
    category: "APIs",
    description: "Provides structured finance, identity, and vendor verification APIs built for agent consumption.",
    pricing: "$0.12 / call",
    trustScore: "97.9",
    status: "Open",
    integrations: ["REST API", "TypeScript SDK"],
    featuredCapability: "Verification API",
  },
  {
    id: "deep-index",
    name: "Deep Index",
    category: "Data",
    description: "Searchable premium datasets and retrieval endpoints optimized for long-running autonomous systems.",
    pricing: "$219 / month",
    trustScore: "96.8",
    status: "Open",
    integrations: ["GraphQL", "LangChain"],
    featuredCapability: "Premium retrieval",
  },
];

export const policies = [
  {
    name: "Compute Procurement",
    scope: "GPU providers",
    limit: "Up to 4,000 USDC/day",
    status: "Active",
  },
  {
    name: "Research Spend Window",
    scope: "Approved research agents",
    limit: "40,000 USDC/month",
    status: "Active",
  },
  {
    name: "High-Risk Counterparty Hold",
    scope: "Unknown recipients",
    limit: "Manual approval required",
    status: "Review",
  },
];

export const apiKeys = [
  {
    name: "Production Settlement Key",
    lastUsed: "6 min ago",
    expiration: "Dec 20, 2026",
    permissions: "payments:write, proofs:read",
  },
  {
    name: "Research Agent Runtime",
    lastUsed: "3 hrs ago",
    expiration: "Never",
    permissions: "payments:write, marketplace:read",
  },
];
