import type { AddEthereumChainParameter } from "@web3-react/types";

const ETH: AddEthereumChainParameter["nativeCurrency"] = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
};

interface BasicChainInformation {
  urls: string[];
  name: string;
}

interface ExtendedChainInformation extends BasicChainInformation {
  nativeCurrency: AddEthereumChainParameter["nativeCurrency"];
  blockExplorerUrls: AddEthereumChainParameter["blockExplorerUrls"];
}

function isExtendedChainInformation(
  chainInformation: BasicChainInformation | ExtendedChainInformation
): chainInformation is ExtendedChainInformation {
  return !!(chainInformation as ExtendedChainInformation).nativeCurrency;
}

export function getAddChainParameters(
  chainId: number
): AddEthereumChainParameter | number {
  const chainInformation = CHAINS[chainId];
  if (isExtendedChainInformation(chainInformation)) {
    return {
      chainId,
      chainName: chainInformation.name,
      nativeCurrency: chainInformation.nativeCurrency,
      rpcUrls: chainInformation.urls,
      blockExplorerUrls: chainInformation.blockExplorerUrls,
    };
  } else {
    return chainId;
  }
}

export const CHAINS: {
  [chainId: number]: BasicChainInformation | ExtendedChainInformation;
} = {
  1337: {
    urls: ["http://127.0.0.1:8545"],
    name: "hardhat",
  },
  1: {
    urls: [
      process.env.infuraKey
        ? `https://mainnet.infura.io/v3/${process.env.infuraKey}`
        : "",
      process.env.alchemyKey
        ? `https://eth-mainnet.alchemyapi.io/v2/${process.env.alchemyKey}`
        : "",
      "https://cloudflare-eth.com",
    ].filter((url) => url !== ""),
    name: "Mainnet",
  },
  3: {
    urls: [
      process.env.infuraKey
        ? `https://ropsten.infura.io/v3/${process.env.infuraKey}`
        : "",
    ].filter((url) => url !== ""),
    name: "Ropsten",
  },
  4: {
    urls: [
      process.env.infuraKey
        ? `https://rinkeby.infura.io/v3/${process.env.infuraKey}`
        : "",
    ].filter((url) => url !== ""),
    name: "Rinkeby",
  },
  5: {
    urls: [
      process.env.infuraKey
        ? `https://goerli.infura.io/v3/${process.env.infuraKey}`
        : "",
    ].filter((url) => url !== ""),
    name: "Görli",
  },
  42: {
    urls: [
      process.env.infuraKey
        ? `https://kovan.infura.io/v3/${process.env.infuraKey}`
        : "",
    ].filter((url) => url !== ""),
    name: "Kovan",
  },
};

export const URLS: { [chainId: number]: string[] } = Object.keys(
  CHAINS
).reduce<{ [chainId: number]: string[] }>((accumulator, chainId) => {
  const validURLs: string[] = CHAINS[Number(chainId)].urls;

  if (validURLs.length) {
    accumulator[Number(chainId)] = validURLs;
  }

  return accumulator;
}, {});
