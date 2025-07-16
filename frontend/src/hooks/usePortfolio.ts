import useSWR from 'swr';
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePortfolio(userAddress?: string) {
  return useSWR(
    userAddress ? `/api/portfolio?user=${userAddress}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
}