export type Appearance = 'system' | 'light' | 'dark';
export type Accent = 'neutral' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
export type WritingFont = 'serif' | 'sans' | 'mono';
export type WritingSize = 'small' | 'medium' | 'large';

export type Preferences = {
  appearance: Appearance;
  accent: Accent;
  writingFont: WritingFont;
  writingSize: WritingSize;
};

export const defaultPreferences: Preferences = {
  appearance: 'system',
  accent: 'neutral',
  writingFont: 'serif',
  writingSize: 'medium',
};
