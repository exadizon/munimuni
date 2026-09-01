import type { Accent, Appearance } from './types';

const accents: Record<Accent, { accent: string; soft: string }> = {
  neutral: { accent: '#6F756A', soft: '#DCE1D9' },
  blue: { accent: '#537292', soft: '#DAE4ED' },
  green: { accent: '#6B8362', soft: '#DCE7D8' },
  amber: { accent: '#A27B40', soft: '#F0E2C7' },
  rose: { accent: '#9B6D6D', soft: '#EDDDDD' },
  violet: { accent: '#7D7097', soft: '#E5DFF0' },
};

export const palette = (appearance: Appearance, systemIsDark: boolean, accent: Accent) => {
  const dark = appearance === 'dark' || (appearance === 'system' && systemIsDark);
  const base = dark
    ? { bg: '#151916', panel: '#1D221E', paper: '#252B26', ink: '#F1EEE5', muted: '#BCC3B8', faint: '#424A43' }
    : { bg: '#F4F0E8', panel: '#ECE7DD', paper: '#FCFAF5', ink: '#2E332F', muted: '#70766E', faint: '#D5CFC3' };
  const selected = accents[accent];
  return { ...base, accent: dark && accent === 'neutral' ? '#E3B66D' : selected.accent, soft: dark ? '#343A35' : selected.soft, dark };
};
