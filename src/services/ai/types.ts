import { SupportedLanguage } from '../../types';

export interface AIRequest {
  prompt: string;
  language: SupportedLanguage;
  context?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  id: string;
  content: string;
  language: SupportedLanguage;
  explanation?: string;
  suggestions?: string[];
  timestamp: Date;
  provider: string;
}

export interface CodeGenerationRequest extends AIRequest {
  type: 'function' | 'class' | 'algorithm' | 'snippet';
  description: string;
  parameters?: string[];
  returnType?: string;
}

export interface CodeGenerationResponse extends AIResponse {
  code: string;
  tests?: string;
  documentation?: string;
}

export class AIError extends Error {
  public code: string;
  public details?: any;
  public retryable: boolean;

  constructor(code: string, message: string, details?: any, retryable: boolean = true) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    
    // Maintain proper stack trace for where the error was thrown
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, AIError);
    }
  }
}

export interface AIProvider {
  name: string;
  generate(request: CodeGenerationRequest): Promise<CodeGenerationResponse>;
  explain(code: string, language: SupportedLanguage): Promise<AIResponse>;
  improve(code: string, language: SupportedLanguage): Promise<AIResponse>;
  debug(code: string, language: SupportedLanguage): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}

export interface AIServiceConfig {
  defaultProvider: string;
  providers: {
    [key: string]: {
      enabled: boolean;
      config: any;
    };
  };
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  retryPolicy: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export interface PromptTemplate {
  language: SupportedLanguage;
  type: string;
  template: string;
  variables: string[];
  examples?: string[];
}