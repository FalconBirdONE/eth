"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

// C mounts this once in app/layout.tsx. Only the public app ID reaches the browser.
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is not set");
  return (
    <PrivyProvider appId={appId} config={{ defaultChain: base, supportedChains: [base] }}>
      {children}
    </PrivyProvider>
  );
}
