import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(value: bigint | string | number) {
  const val = typeof value === 'bigint' ? value : BigInt(value);
  return (Number(val) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 4 });
}
