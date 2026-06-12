export type TransactionParty = {
  id: string;
  agentId: string;
  title: string;
  isMine: boolean;
};

export type TransactionRecord = {
  id: string;
  txHash: string;
  type: "deposit" | "transfer" | "withdraw";
  status: "pending" | "confirmed" | "failed";
  token: string | null;
  /** Token amount in wei (18 decimals), null for legacy rows. */
  amount: string | null;
  associatedWallet: string | null;
  createdAt: string;
  senderAgent: TransactionParty | null;
  receiverAgent: TransactionParty | null;
};

export type TransactionDirection = "in" | "out" | "internal";

/**
 * Direction of value flow from the signed-in user's point of view:
 * deposits fund an agent ("in"), withdrawals leave it ("out"), transfers
 * depend on which side the user owns.
 */
export function transactionDirection(
  transaction: TransactionRecord,
): TransactionDirection {
  if (transaction.type === "deposit") return "in";
  if (transaction.type === "withdraw") return "out";

  const senderIsMine = transaction.senderAgent?.isMine ?? false;
  const receiverIsMine = transaction.receiverAgent?.isMine ?? false;

  if (senderIsMine && receiverIsMine) return "internal";
  return senderIsMine ? "out" : "in";
}
