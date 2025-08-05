import { AIProvider, AIServiceConfig, CodeGenerationRequest, CodeGenerationResponse, AIResponse, AIError } from './types';
import { SupportedLanguage } from '../../types';
import { getTemplateByType, renderTemplate } from './templates';

export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIServiceConfig;
  private requestCounts: Map<string, { minute: number; hour: number; lastReset: Date }> = new Map();

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  // Provider management
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  getProvider(name?: string): AIProvider | null {
    const providerName = name || this.config.defaultProvider;
    return this.providers.get(providerName) || null;
  }

  async getAvailableProviders(): Promise<string[]> {
    const available: string[] = [];
    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(name);
        }
      } catch (error) {
        console.warn(`Provider ${name} is not available:`, error);
      }
    }
    return available;
  }

  // Rate limiting
  private checkRateLimit(providerName: string): boolean {
    const now = new Date();
    const key = providerName;
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, {
        minute: 0,
        hour: 0,
        lastReset: now
      });
    }

    const counts = this.requestCounts.get(key)!;
    
    // Reset counters if needed
    const minutesSinceReset = (now.getTime() - counts.lastReset.getTime()) / (1000 * 60);
    if (minutesSinceReset >= 60) {
      counts.hour = 0;
      counts.minute = 0;
      counts.lastReset = now;
    } else if (minutesSinceReset >= 1) {
      counts.minute = 0;
    }

    // Check limits
    if (counts.minute >= this.config.rateLimiting.requestsPerMinute ||
        counts.hour >= this.config.rateLimiting.requestsPerHour) {
      return false;
    }

    // Increment counters
    counts.minute++;
    counts.hour++;
    
    return true;
  }

  // Retry logic with exponential backoff
  private async withRetry<T>(
    operation: () => Promise<T>,
    providerName: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryPolicy.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if it's not retryable
        if (error instanceof AIError && !error.retryable) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === this.config.retryPolicy.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retryPolicy.baseDelay * Math.pow(2, attempt),
          this.config.retryPolicy.maxDelay
        );
        
        console.warn(`Attempt ${attempt + 1} failed for ${providerName}, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new AIError(
      'MAX_RETRIES_EXCEEDED',
      `Maximum retries exceeded for provider ${providerName}`,
      lastError,
      false
    );
  }

  // Core AI operations
  async generateCode(request: CodeGenerationRequest, providerName?: string): Promise<CodeGenerationResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new AIError(
        'PROVIDER_NOT_FOUND',
        `Provider ${providerName || this.config.defaultProvider} not found`,
        null,
        false
      );
    }

    if (!this.checkRateLimit(provider.name)) {
      throw new AIError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        null,
        true
      );
    }

    // Enhance request with template if available
    const enhancedRequest = await this.enhanceRequestWithTemplate(request);

    return this.withRetry(
      () => provider.generate(enhancedRequest),
      provider.name
    );
  }

  async explainCode(code: string, language: SupportedLanguage, providerName?: string): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new AIError(
        'PROVIDER_NOT_FOUND',
        `Provider ${providerName || this.config.defaultProvider} not found`,
        null,
        false
      );
    }

    if (!this.checkRateLimit(provider.name)) {
      throw new AIError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        null,
        true
      );
    }

    return this.withRetry(
      () => provider.explain(code, language),
      provider.name
    );
  }

  async improveCode(code: string, language: SupportedLanguage, providerName?: string): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new AIError(
        'PROVIDER_NOT_FOUND',
        `Provider ${providerName || this.config.defaultProvider} not found`,
        null,
        false
      );
    }

    if (!this.checkRateLimit(provider.name)) {
      throw new AIError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        null,
        true
      );
    }

    return this.withRetry(
      () => provider.improve(code, language),
      provider.name
    );
  }

  async debugCode(code: string, language: SupportedLanguage, providerName?: string): Promise<AIResponse> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new AIError(
        'PROVIDER_NOT_FOUND',
        `Provider ${providerName || this.config.defaultProvider} not found`,
        null,
        false
      );
    }

    if (!this.checkRateLimit(provider.name)) {
      throw new AIError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded. Please try again later.',
        null,
        true
      );
    }

    return this.withRetry(
      () => provider.debug(code, language),
      provider.name
    );
  }

  // Template enhancement
  private async enhanceRequestWithTemplate(request: CodeGenerationRequest): Promise<CodeGenerationRequest> {
    const template = getTemplateByType(request.language, request.type);
    
    if (!template) {
      return request;
    }

    const variables = {
      description: request.description,
      context: request.context || '',
      signature: this.generateFunctionSignature(request),
      algorithm: request.description.toLowerCase()
    };

    const enhancedPrompt = renderTemplate(template.template, variables);

    return {
      ...request,
      prompt: enhancedPrompt
    };
  }

  private generateFunctionSignature(request: CodeGenerationRequest): string {
    const { language, parameters = [], returnType } = request;
    
    switch (language) {
      case 'python':
        const pythonParams = parameters.join(', ');
        return returnType 
          ? `def function_name(${pythonParams}) -> ${returnType}:`
          : `def function_name(${pythonParams}):`;
          
      case 'javascript':
        const jsParams = parameters.join(', ');
        return `function functionName(${jsParams}) {`;
        
      case 'cpp':
        const cppParams = parameters.join(', ');
        const cppReturn = returnType || 'void';
        return `${cppReturn} functionName(${cppParams}) {`;
        
      default:
        return '';
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  // Health check
  async healthCheck(): Promise<{ [providerName: string]: boolean }> {
    const health: { [providerName: string]: boolean } = {};
    
    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.isAvailable();
      } catch (error) {
        health[name] = false;
      }
    }
    
    return health;
  }
}