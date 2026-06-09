"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WalletConfig = {
  chainId: number;
  rpcUrl: string;
  confidentialErc20Address: string;
};

type TransactionRequest = {
  to: string;
  data: string;
};

type WalletContextValue = {
  address: string | null;
  chainId: number | null;
  config: WalletConfig;
  error: string | null;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  isInstalled: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  sendTransaction: (request: TransactionRequest) => Promise<{ txHash: string }>;
};

type EthereumProvider = {
  isMetaMask?: boolean;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const DEFAULT_CONFIG: WalletConfig = {
  chainId: 421614,
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  confidentialErc20Address: "",
};

const WalletContext = createContext<WalletContextValue | null>(null);
const DISCONNECTED_WALLET_KEY = "velum_wallet_disconnected";
const DEFAULT_REGISTER_AGENT_GAS_LIMIT = BigInt(1_000_000);
const DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI = BigInt(20_000_000);
const DEFAULT_MIN_MAX_FEE_PER_GAS_WEI = BigInt(100_000_000);

function normalizeHexChainId(value: string) {
  return Number.parseInt(value, 16);
}

function bigintToHex(value: bigint) {
  return `0x${value.toString(16)}`;
}

function hexToBigint(value: string) {
  return BigInt(value);
}

function getWalletProvider() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.ethereum ?? null;
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatWalletError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const errorObject = error as {
      shortMessage?: string;
      message?: string;
      data?: { message?: string; data?: string; code?: number; cause?: unknown };
    };

    const maybeMessage = errorObject.shortMessage
      ?? errorObject.data?.message
      ?? errorObject.message;

    if (maybeMessage) {
      return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown wallet error";
    }
  }

  return typeof error === "string" ? error : "Unknown wallet error";
}

async function waitForReceipt(provider: EthereumProvider, txHash: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 120_000) {
    const receipt = (await provider.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    })) as { status?: string } | null;

    if (receipt) {
      if (receipt.status === "0x1") {
        return receipt;
      }

      throw new Error("The wallet transaction reverted on-chain.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, 2_000));
  }

  throw new Error("Timed out waiting for the wallet transaction confirmation.");
}

async function getTransactionFeeConfig(
  provider: EthereumProvider,
  request: TransactionRequest & { from: string },
) {
  let gasLimit = DEFAULT_REGISTER_AGENT_GAS_LIMIT;

  try {
    const estimatedGas = (await provider.request({
      method: "eth_estimateGas",
      params: [request],
    })) as string;

    gasLimit = (hexToBigint(estimatedGas) * BigInt(12)) / BigInt(10);
  } catch (estimateError) {
    console.warn("Gas estimation failed, using fallback gas limit:", estimateError);
  }

  let maxPriorityFeePerGas = DEFAULT_MAX_PRIORITY_FEE_PER_GAS_WEI;

  try {
    const suggestedPriorityFee = (await provider.request({
      method: "eth_maxPriorityFeePerGas",
    })) as string;

    maxPriorityFeePerGas = hexToBigint(suggestedPriorityFee);
  } catch (priorityFeeError) {
    console.warn(
      "Priority fee fetch failed, using fallback priority fee:",
      priorityFeeError,
    );
  }

  let baseFeePerGas = BigInt(0);

  try {
    const latestBlock = (await provider.request({
      method: "eth_getBlockByNumber",
      params: ["latest", false],
    })) as { baseFeePerGas?: string | null };

    if (latestBlock?.baseFeePerGas) {
      baseFeePerGas = hexToBigint(latestBlock.baseFeePerGas);
    }
  } catch (baseFeeError) {
    console.warn("Base fee fetch failed, using fallback fee floor:", baseFeeError);
  }

  const maxFeePerGas = baseFeePerGas > BigInt(0)
    ? (baseFeePerGas * BigInt(2)) + maxPriorityFeePerGas
    : DEFAULT_MIN_MAX_FEE_PER_GAS_WEI;

  return {
    gas: bigintToHex(gasLimit),
    maxFeePerGas: bigintToHex(maxFeePerGas),
    maxPriorityFeePerGas: bigintToHex(maxPriorityFeePerGas),
    baseFeePerGas: bigintToHex(baseFeePerGas),
    estimatedFeeWei: gasLimit * maxFeePerGas,
  };
}

async function preflightTransaction(
  provider: EthereumProvider,
  request: TransactionRequest & {
    from: string;
    gas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  },
) {
  await provider.request({
    method: "eth_call",
    params: [
      {
        from: request.from,
        to: request.to,
        data: request.data,
        gas: request.gas,
        maxFeePerGas: request.maxFeePerGas,
        maxPriorityFeePerGas: request.maxPriorityFeePerGas,
      },
      "latest",
    ],
  });
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<WalletConfig>(DEFAULT_CONFIG);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

  const isInstalled = typeof window !== "undefined" && !!getWalletProvider();
  const isCorrectNetwork = chainId === null ? false : chainId === config.chainId;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsManuallyDisconnected(window.sessionStorage.getItem(DISCONNECTED_WALLET_KEY) === "1");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/config`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Could not load wallet configuration.");
        }

        const payload = (await response.json()) as {
          config?: {
            chain_id?: number;
            rpc_url?: string;
            confidential_erc20?: string;
          };
        };

        if (!cancelled && payload.config) {
          setConfig({
            chainId: payload.config.chain_id ?? DEFAULT_CONFIG.chainId,
            rpcUrl: payload.config.rpc_url ?? DEFAULT_CONFIG.rpcUrl,
            confidentialErc20Address:
              payload.config.confidential_erc20 ?? DEFAULT_CONFIG.confidentialErc20Address,
          });
        }
      } catch (configError) {
        if (!cancelled) {
          console.error(configError);
        }
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const syncWalletState = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      setAddress(null);
      setChainId(null);
      return;
    }

    try {
      const [accounts, currentChainId] = await Promise.all([
        provider.request({ method: "eth_accounts" }) as Promise<string[]>,
        provider.request({ method: "eth_chainId" }) as Promise<string>,
      ]);

      setAddress(isManuallyDisconnected ? null : accounts[0]?.toLowerCase() ?? null);
      setChainId(normalizeHexChainId(currentChainId));
    } catch (walletError) {
      console.error(walletError);
    }
  }, [isManuallyDisconnected]);

  useEffect(() => {
    syncWalletState();
  }, [syncWalletState]);

  useEffect(() => {
    const provider = getWalletProvider();

    if (!provider?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const nextAccounts = Array.isArray(accounts) ? (accounts as string[]) : [];
      if (nextAccounts.length === 0) {
        setAddress(null);
        setIsManuallyDisconnected(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(DISCONNECTED_WALLET_KEY);
        }
      } else if (!isManuallyDisconnected) {
        setAddress(nextAccounts[0]?.toLowerCase() ?? null);
      }
      setError(null);
    };

    const handleChainChanged = (nextChainId: unknown) => {
      if (typeof nextChainId === "string") {
        setChainId(normalizeHexChainId(nextChainId));
      }
      setError(null);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [isManuallyDisconnected]);

  const switchNetwork = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      throw new Error("MetaMask is not installed.");
    }

    const chainIdHex = `0x${config.chainId.toString(16)}`;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      const maybeCode = (switchError as { code?: number }).code;

      if (maybeCode !== 4902) {
        throw switchError;
      }

      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: "Arbitrum Sepolia",
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: ["https://sepolia.arbiscan.io"],
          },
        ],
      });
    }

    await syncWalletState();
  }, [config.chainId, config.rpcUrl, syncWalletState]);

  const connectWallet = useCallback(async () => {
    const provider = getWalletProvider();

    if (!provider) {
      setError("MetaMask is not installed in this browser.");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      setIsManuallyDisconnected(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(DISCONNECTED_WALLET_KEY);
      }

      await switchNetwork();
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];

      setAddress(accounts[0]?.toLowerCase() ?? null);

      const currentChainId = (await provider.request({
        method: "eth_chainId",
      })) as string;
      setChainId(normalizeHexChainId(currentChainId));
    } catch (connectError) {
      const message =
        connectError instanceof Error ? connectError.message : "Could not connect your wallet.";
      setError(message);
      throw connectError;
    } finally {
      setIsConnecting(false);
    }
  }, [switchNetwork]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setError(null);
    setIsManuallyDisconnected(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISCONNECTED_WALLET_KEY, "1");
    }
  }, []);

  const sendTransaction = useCallback(
    async (request: TransactionRequest) => {
      const provider = getWalletProvider();

      if (!provider) {
        throw new Error("MetaMask is not installed.");
      }

      if (!address) {
        throw new Error("Connect your wallet before signing this transaction.");
      }

      setError(null);
      await switchNetwork();

      try {
        const feeConfig = await getTransactionFeeConfig(provider, {
          ...request,
          from: address,
        });

        console.log("[wallet] sending transaction", {
          from: address,
          to: request.to,
          gas: feeConfig.gas,
          baseFeePerGas: feeConfig.baseFeePerGas,
          maxFeePerGas: feeConfig.maxFeePerGas,
          maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas,
          estimatedFeeWei: feeConfig.estimatedFeeWei.toString(),
          dataLength: request.data.length,
        });

        await preflightTransaction(provider, {
          from: address,
          to: request.to,
          data: request.data,
          gas: feeConfig.gas,
          maxFeePerGas: feeConfig.maxFeePerGas,
          maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas,
        });

        console.log("[wallet] preflight eth_call passed");

        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: request.to,
              data: request.data,
              gas: feeConfig.gas,
              maxFeePerGas: feeConfig.maxFeePerGas,
              maxPriorityFeePerGas: feeConfig.maxPriorityFeePerGas,
            },
          ],
        })) as string;

        console.log("[wallet] transaction submitted", { txHash });
        await waitForReceipt(provider, txHash);
        console.log("[wallet] transaction confirmed", { txHash });

        return { txHash };
      } catch (transactionError) {
        const message = formatWalletError(transactionError);
        console.error("[wallet] transaction failed", {
          from: address,
          to: request.to,
          message,
          error: transactionError,
        });
        setError(message);
        throw new Error(message);
      }
    },
    [address, switchNetwork],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      chainId,
      config,
      error,
      isConnecting,
      isCorrectNetwork,
      isInstalled,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      sendTransaction,
    }),
    [
      address,
      chainId,
      config,
      error,
      isConnecting,
      isCorrectNetwork,
      isInstalled,
      connectWallet,
      disconnectWallet,
      switchNetwork,
      sendTransaction,
    ],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }

  return {
    ...context,
    shortAddress: context.address ? shortenAddress(context.address) : null,
  };
}
