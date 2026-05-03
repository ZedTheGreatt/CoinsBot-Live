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

export function format24hChange(pricePHP: any, changePercent: any): string {
  const current = Number(String(pricePHP).replace(/,/g, ''));
  const pct = Number(changePercent) / 100; // Dividing by 100 as changePercent is passed as a percentage (e.g. 2.41)

  if (!Number.isFinite(current) || !Number.isFinite(pct)) {
    return 'N/A';
  }

  const denominator = 1 + pct;
  if (denominator <= 0) {
    return 'N/A';
  }

  const previous = current / denominator;
  const pesoChange = current - previous;

  const absPeso = Math.abs(pesoChange);
  const absPct = Math.abs(pct * 100);

  let sign = '';
  if (pesoChange > 0) sign = '+';
  else if (pesoChange < 0) sign = '-';

  const formattedPeso = absPeso.toLocaleString('en-PH', { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });

  return `₱${sign}${formattedPeso} (${sign}${absPct.toFixed(2)}%)`;
}
