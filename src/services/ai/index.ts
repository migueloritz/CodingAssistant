// Export all AI service components
export { AIService } from './AIService';
export { MockProvider } from './providers/MockProvider';
export { OpenAIProvider } from './providers/OpenAIProvider';
export * from './types';
export * from './templates';

import { AIService } from './AIService';
import { MockProvider } from './providers/MockProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';

// Export common configurations
export const createDefaultAIConfig = () => ({
  defaultProvider: 'mock',
  providers: {
    mock: { enabled: true, config: {} },
    openai: { enabled: true, config: {} }
  },
  rateLimiting: {
    requestsPerMinute: 10,
    requestsPerHour: 100
  },
  retryPolicy: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
});

// Export utility functions
export const createAIMockService = () => {
  const service = new AIService(createDefaultAIConfig());
  service.registerProvider(new MockProvider(500));
  return service;
};

export const createAIServiceWithOpenAI = (apiKey: string) => {
  const service = new AIService({
    ...createDefaultAIConfig(),
    defaultProvider: 'openai'
  });
  
  service.registerProvider(new MockProvider(500));
  service.registerProvider(new OpenAIProvider({
    apiKey,
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000
  }));
  
  return service;
};