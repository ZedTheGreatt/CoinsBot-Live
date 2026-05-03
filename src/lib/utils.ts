import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInPHT(timestamp: number, options: { showDate?: boolean, showSeconds?: boolean, concise?: boolean } = {}) {
  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  
  if (options.showSeconds) {
    dateOptions.second = '2-digit';
  }

  if (options.showDate) {
    if (!options.concise) {
      dateOptions.year = 'numeric';
    }
    dateOptions.month = 'short';
    dateOptions.day = '2-digit';
  }

  return new Intl.DateTimeFormat('en-PH', dateOptions).format(new Date(timestamp));
}

export function format24hChange(pricePHP: any, changePercent: any, nominalChange?: number): string {
  const current = Number(String(pricePHP).replace(/,/g, ''));
  const pct = Number(changePercent);

  if (!Number.isFinite(current) || !Number.isFinite(pct)) {
    return 'N/A';
  }

  // Use actual nominal change if provided, otherwise fallback to formula
  const pesoChange = typeof nominalChange === 'number' ? nominalChange : (current - (current / (1 + pct)));

  const absPeso = Math.abs(pesoChange);
  const absPct = Math.abs(pct * 100);

  let sign = '';
  if (pesoChange > 0) sign = '+';
  else if (pesoChange < 0) sign = '-';

  // Set precision to exactly 2 decimal points
  const pctPrecision = 2;

  const formattedPeso = absPeso.toLocaleString('en-PH', { 
    minimumFractionDigits: absPeso < 1 && absPeso > 0 ? 4 : 2, 
    maximumFractionDigits: absPeso < 1 && absPeso > 0 ? 4 : 2 
  });

  return `₱${sign}${formattedPeso} (${sign}${absPct.toFixed(pctPrecision)}%)`;
}
