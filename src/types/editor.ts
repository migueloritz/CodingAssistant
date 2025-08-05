export type SupportedLanguage = 'python' | 'javascript' | 'cpp';

export interface FileContent {
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage;
  lastModified: Date;
  id?: string;
  isModified?: boolean;
  size?: number;
}

export interface EditorState {
  content: string;
  language: SupportedLanguage;
  cursorPosition: number;
  selection: {
    from: number;
    to: number;
  } | null;
}

export interface EditorProps {
  content: string;
  language: SupportedLanguage;
  onChange: (content: string) => void;
  onCursorChange?: (position: number) => void;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
}

export interface AnalysisResult {
  type: 'error' | 'warning' | 'info' | 'suggestion';
  message: string;
  line?: number;
  column?: number;
  severity: 'low' | 'medium' | 'high';
  source?: 'syntax' | 'logic' | 'performance' | 'style';
}

export interface CodeAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  shortcut?: string;
}

export interface OutputResult {
  id: string;
  type: 'execution' | 'analysis' | 'explanation' | 'improvement';
  content: string;
  timestamp: Date;
  status: 'success' | 'error' | 'warning';
  language?: SupportedLanguage;
}