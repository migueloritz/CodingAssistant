export * from './editor';
export * from './storage';
import type { SupportedLanguage, FileContent } from './editor';

export interface AppTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  defaultLanguage: SupportedLanguage;
}

export interface AppState {
  isLoading: boolean;
  error: string | null;
  currentFile: FileContent | null;
  recentFiles: FileContent[];
  preferences: UserPreferences;
}