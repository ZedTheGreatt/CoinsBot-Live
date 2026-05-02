import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInPHT(timestamp: number, options: { showDate?: boolean, showSeconds?: boolean } = {}) {
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
    dateOptions.year = 'numeric';
    dateOptions.month = 'short';
    dateOptions.day = '2-digit';
  }

  return new Intl.DateTimeFormat('en-PH', dateOptions).format(new Date(timestamp));
}
