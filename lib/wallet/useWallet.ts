"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type Address, type Hex } from "viem";
import { base } from "viem/chains";

/** The one wallet interface the app uses. Every signature and transaction is prompted in the user's wallet. */
export function useWallet() {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];

  async function client() {
    if (!wallet) throw new Error("No wallet connected");
    await wallet.switchChain(base.id);
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({ account: wallet.address as Address, chain: base, transport: custom(provider) });
  }

  return {
    ready,
    authenticated,
    login,
    logout,
    address: wallet?.address as Address | undefined,
    chainId: wallet ? Number(wallet.chainId.split(":").at(-1)) : undefined,

    /** Signs a JSON-stringified EIP-712 payload, as Flash returns it in orderTypedData / permitTypedData. */
    async signTypedData(typedDataJson: string): Promise<Hex> {
      const { domain, types, primaryType, message } = JSON.parse(typedDataJson);
      delete types.EIP712Domain; // viem derives the domain type itself
      return (await client()).signTypedData({ domain, types, primaryType, message });
    },

    async signMessage(message: string): Promise<Hex> {
      return (await client()).signMessage({ message });
    },

    async sendTransaction(tx: { to: Address; data?: Hex; value?: bigint }): Promise<Hex> {
      return (await client()).sendTransaction(tx);
    },

    /** fetch with the Privy access token, for every protected API route. */
    async authedFetch(input: string, init: RequestInit = {}) {
      const token = await getAccessToken();
      return fetch(input, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers, ...(token && { authorization: `Bearer ${token}` }) },
      });
    },
  };
}
