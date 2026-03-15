// Free API, no key needed
export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'AUD' | 'CHF' | 'MXN';

export async function getCADRate(from: SupportedCurrency): Promise<number> {
  try {
    const series = `FX${from}CAD`;
    const res = await fetch(`https://www.bankofcanada.ca/valet/observations/${series}/json?recent=1`);
    const data = await res.json();
    return parseFloat(data.observations[0][series].v);
  } catch {
    // Fallback rates if API is down (approximate)
    const fallback: Record<SupportedCurrency, number> = { 
      USD: 1.38, 
      EUR: 1.50, 
      GBP: 1.75, 
      JPY: 0.009, 
      CNY: 0.19, 
      AUD: 0.90, 
      CHF: 1.55, 
      MXN: 0.08 
    };
    return fallback[from];
  }
}

export function formatCAD(amount: number): string {
  return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount);
}