"use client";

import { http, createConfig } from "wagmi";
import { blockdagPrimordial } from "@/chains";   // your local chain object
import { injected } from "wagmi/connectors";

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID; // keep for future, unused
export const metadata = {
  name: "MemFi",
  description: "AI Memory DeFi on BlockDAG",
  url: "https://memfi.app",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const config = createConfig({
  chains: [blockdagPrimordial],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [blockdagPrimordial.id]: http(process.env.NEXT_PUBLIC_BLOCKDAG_TESTNET_RPC),
  },
  ssr: true,
});