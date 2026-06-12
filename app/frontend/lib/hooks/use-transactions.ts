"use client";

import { useEffect, useState } from "react";

import { getAccessTokenCookie } from "@/lib/auth/cookies";
import type { TransactionRecord } from "@/lib/data/transactions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const accessToken = getAccessTokenCookie();
        if (!accessToken) {
          throw new Error("You must be signed in to view your transactions.");
        }

        const response = await fetch(`${API_URL}/api/transaction`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.success) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Failed to load transactions.",
          );
        }

        if (!cancelled) {
          setTransactions(
            Array.isArray(data.transactions)
              ? (data.transactions as TransactionRecord[])
              : [],
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load transactions.");
          setTransactions([]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { transactions, error };
}
