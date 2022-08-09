import { Web3Provider } from "@ethersproject/providers";
import { useMemo } from "react";
import pool from "../lib/pool";

export default function usePool(provider?: Web3Provider) {
  return useMemo(() => provider && pool.connect(provider), [provider]);
}
