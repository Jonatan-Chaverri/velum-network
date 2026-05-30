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
  createdAt: string;
  updatedAt: string;
  reputationScore?: number;
  service: AgentService | null;
};
