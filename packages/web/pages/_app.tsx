import "../styles/globals.css";
import type { AppProps } from "next/app";
import {
  useWeb3React,
  Web3ReactHooks,
  Web3ReactProvider,
} from "@web3-react/core";
import { Network } from "@web3-react/network";
import { MetaMask } from "@web3-react/metamask";
import { hooks as metaMaskHooks, metaMask } from "../lib/connectors/metamask";
import { hooks as networkHooks, network } from "../lib/connectors/network";

const connectors: [MetaMask | Network, Web3ReactHooks][] = [
  [metaMask, metaMaskHooks],
  [network, networkHooks],
];

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3ReactProvider connectors={connectors}>
      <Component {...pageProps} />
    </Web3ReactProvider>
  );
}

export default MyApp;
