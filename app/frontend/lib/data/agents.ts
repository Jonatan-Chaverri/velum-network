export type AgentService = {
  id: string;
  price: string;
  pricingModel: string;
  currency: string;
  billingUnit: string;
  endpointUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  agentId: string;
  title: string;
  description: string;
  category: string;
  publicKey: string;
  erc8004AgentId?: string | null;
  erc8004TxHash?: string | null;
  erc8004Url?: string | null;
  createdAt: string;
  updatedAt: string;
  reputationScore?: number;
  service: AgentService | null;
};
