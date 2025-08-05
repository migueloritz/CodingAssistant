/**
 * Supported programming languages in the coding assistant
 */
export type SupportedLanguage = 'python' | 'javascript' | 'cpp';

/**
 * Represents a file in the editor with metadata
 */
export interface FileContent {
  /** Display name of the file */
  name: string;
  /** Full path to the file */
  path: string;
  /** Current content of the file */
  content: string;
  /** Programming language of the file */
  language: SupportedLanguage;
  /** When the file was last modified */
  lastModified: Date;
  /** Unique identifier for the file */
  id?: string;
  /** Whether the file has unsaved changes */
  isModified?: boolean;
  /** File size in bytes */
  size?: number;
}

/**
 * Current state of the code editor
 */
export interface EditorState {
  /** Current text content */
  content: string;
  /** Programming language mode */
  language: SupportedLanguage;
  /** Current cursor position (character offset) */
  cursorPosition: number;
  /** Current text selection range */
  selection: {
    from: number;
    to: number;
  } | null;
}

/**
 * Props for the CodeEditor component
 */
export interface EditorProps {
  /** Initial/current content to display */
  content: string;
  /** Programming language for syntax highlighting */
  language: SupportedLanguage;
  /** Callback when content changes */
  onChange: (content: string) => void;
  /** Optional callback when cursor position changes */
  onCursorChange?: (position: number) => void;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Color theme for the editor */
  theme?: 'light' | 'dark';
}

/**
 * Result of code analysis (errors, warnings, suggestions)
 */
export interface AnalysisResult {
  /** Type of analysis result */
  type: 'error' | 'warning' | 'info' | 'suggestion';
  /** Human-readable message */
  message: string;
  /** Line number (1-based) where the issue occurs */
  line?: number;
  /** Column number (1-based) where the issue occurs */
  column?: number;
  /** Severity level of the issue */
  severity: 'low' | 'medium' | 'high';
  /** Source/category of the analysis */
  source?: 'syntax' | 'logic' | 'performance' | 'style';
}

/**
 * Represents an available action in the editor
 */
export interface CodeAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the action */
  label: string;
  /** Optional detailed description */
  description?: string;
  /** Optional icon identifier */
  icon?: string;
  /** Optional keyboard shortcut */
  shortcut?: string;
}

/**
 * Output from AI operations or code execution
 */
export interface OutputResult {
  /** Unique identifier for this output */
  id: string;
  /** Type of operation that generated this output */
  type: 'execution' | 'analysis' | 'explanation' | 'improvement';
  /** The actual output content */
  content: string;
  /** When this output was generated */
  timestamp: Date;
  /** Success/failure status */
  status: 'success' | 'error' | 'warning';
  /** Language this output relates to (optional) */
  language?: SupportedLanguage;
}