import { Pipe, PipeTransform } from '@angular/core';

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: unknown): string {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) {
    return '—';
  }
  if (value === 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), UNITS.length - 1);
  const size = value / Math.pow(1024, exponent);
  const decimals = exponent === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${UNITS[exponent]}`;
}

@Pipe({
  name: 'formatBytes',
})
export class FormatBytesPipe implements PipeTransform {
  transform(bytes: unknown): string {
    return formatBytes(bytes);
  }
}
