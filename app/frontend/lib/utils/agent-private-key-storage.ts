const STORAGE_PREFIX = "velum-agent-private-key-";

function getStorageKey(agentId: string) {
  return `${STORAGE_PREFIX}${agentId}`;
}

export function saveAgentPrivateKey(agentId: string, privateKey: string) {
  if (typeof window === "undefined" || !agentId || !privateKey) {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(agentId), privateKey);
  } catch (error) {
    console.error("Failed to save agent private key:", error);
  }
}

export function getAgentPrivateKey(agentId: string | null) {
  if (typeof window === "undefined" || !agentId) {
    return null;
  }

  try {
    return window.localStorage.getItem(getStorageKey(agentId));
  } catch (error) {
    console.error("Failed to read agent private key:", error);
    return null;
  }
}
