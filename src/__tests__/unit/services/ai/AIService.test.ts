import { AIService } from '../../../../services/ai/AIService';
import { MockProvider } from '../../../../services/ai/providers/MockProvider';
import { AIError, AIServiceConfig } from '../../../../services/ai/types';
import { createMockAIProvider, createMockCodeGenerationResponse, createMockAIResponse } from '../../../utils/test-utils';

describe('AIService', () => {
  let aiService: AIService;
  let mockProvider: any;
  let config: AIServiceConfig;

  beforeEach(() => {
    config = {
      defaultProvider: 'mock',
      providers: {
        mock: { enabled: true, config: {} }
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
    };

    aiService = new AIService(config);
    mockProvider = createMockAIProvider();
    aiService.registerProvider(mockProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Management', () => {
    test('should register a provider', () => {
      const newProvider = createMockAIProvider();
      newProvider.name = 'test-provider';
      
      aiService.registerProvider(newProvider);
      const retrievedProvider = aiService.getProvider('test-provider');
      
      expect(retrievedProvider).toBe(newProvider);
    });

    test('should get default provider when no name specified', () => {
      const provider = aiService.getProvider();
      expect(provider).toBe(mockProvider);
    });

    test('should return null for non-existent provider', () => {
      const provider = aiService.getProvider('non-existent');
      expect(provider).toBeNull();
    });

    test('should get available providers', async () => {
      mockProvider.isAvailable.mockResolvedValue(true);
      
      const available = await aiService.getAvailableProviders();
      
      expect(available).toContain('mock-provider');
      expect(mockProvider.isAvailable).toHaveBeenCalled();
    });

    test('should handle provider availability check failures', async () => {
      mockProvider.isAvailable.mockRejectedValue(new Error('Provider unavailable'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const available = await aiService.getAvailableProviders();
      
      expect(available).not.toContain('mock-provider');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider mock-provider is not available'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limits', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const response = await aiService.generateCode(request);
      
      expect(response).toBeDefined();
      expect(mockProvider.generate).toHaveBeenCalledWith(expect.objectContaining(request));
    });

    test('should reject requests when minute rate limit exceeded', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        await aiService.generateCode(request);
      }

      // This should fail due to rate limiting
      await expect(aiService.generateCode(request)).rejects.toThrow(AIError);
      await expect(aiService.generateCode(request)).rejects.toThrow('Rate limit exceeded');
    });

    test('should reset rate limits after time passes', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      // Mock Date to control time
      const originalDate = Date;
      let currentTime = Date.now();
      global.Date = jest.fn().mockImplementation(() => new originalDate(currentTime)) as any;
      global.Date.now = jest.fn(() => currentTime);

      // Make requests up to the limit
      for (let i = 0; i < 10; i++) {
        await aiService.generateCode(request);
      }

      // Advance time by more than a minute
      currentTime += 61 * 1000;

      // This should succeed after rate limit reset
      const response = await aiService.generateCode(request);
      expect(response).toBeDefined();

      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('Retry Logic', () => {
    test('should retry on retryable errors', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      const successResponse = createMockCodeGenerationResponse();

      mockProvider.generate
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(successResponse);

      const response = await aiService.generateCode(request);
      
      expect(response).toBe(successResponse);
      expect(mockProvider.generate).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable errors', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const nonRetryableError = new AIError('INVALID_REQUEST', 'Invalid request', null, false);
      mockProvider.generate.mockRejectedValue(nonRetryableError);

      await expect(aiService.generateCode(request)).rejects.toThrow(nonRetryableError);
      expect(mockProvider.generate).toHaveBeenCalledTimes(1);
    });

    test('should throw MAX_RETRIES_EXCEEDED after max retries', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      mockProvider.generate.mockRejectedValue(retryableError);

      await expect(aiService.generateCode(request)).rejects.toThrow(AIError);
      await expect(aiService.generateCode(request)).rejects.toThrow('Maximum retries exceeded');
      expect(mockProvider.generate).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test('should implement exponential backoff', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      mockProvider.generate.mockRejectedValue(retryableError);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout to track delays
      const delays: number[] = [];
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });

      try {
        await aiService.generateCode(request);
      } catch (error) {
        // Expected to fail
      }

      expect(delays).toHaveLength(3); // 3 retries
      expect(delays[0]).toBe(1000); // Base delay
      expect(delays[1]).toBe(2000); // 2x base delay
      expect(delays[2]).toBe(4000); // 4x base delay

      global.setTimeout = originalSetTimeout;
      setTimeoutSpy.mockRestore();
    });
  });

  describe('Code Generation', () => {
    test('should generate code successfully', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const expectedResponse = createMockCodeGenerationResponse();
      mockProvider.generate.mockResolvedValue(expectedResponse);

      const response = await aiService.generateCode(request);

      expect(response).toBe(expectedResponse);
      expect(mockProvider.generate).toHaveBeenCalledWith(expect.objectContaining(request));
    });

    test('should throw error when provider not found', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      await expect(aiService.generateCode(request, 'non-existent')).rejects.toThrow(AIError);
      await expect(aiService.generateCode(request, 'non-existent')).rejects.toThrow('Provider non-existent not found');
    });

    test('should enhance request with template', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      await aiService.generateCode(request);

      expect(mockProvider.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          ...request,
          prompt: expect.any(String)
        })
      );
    });
  });

  describe('Code Explanation', () => {
    test('should explain code successfully', async () => {
      const code = 'def hello(): print("Hello")';
      const language = 'python' as const;
      const expectedResponse = createMockAIResponse();
      
      mockProvider.explain.mockResolvedValue(expectedResponse);

      const response = await aiService.explainCode(code, language);

      expect(response).toBe(expectedResponse);
      expect(mockProvider.explain).toHaveBeenCalledWith(code, language);
    });

    test('should throw error when provider not found for explanation', async () => {
      const code = 'def hello(): print("Hello")';
      const language = 'python' as const;

      await expect(aiService.explainCode(code, language, 'non-existent')).rejects.toThrow(AIError);
    });
  });

  describe('Code Improvement', () => {
    test('should improve code successfully', async () => {
      const code = 'def hello(): print("Hello")';
      const language = 'python' as const;
      const expectedResponse = createMockAIResponse();
      
      mockProvider.improve.mockResolvedValue(expectedResponse);

      const response = await aiService.improveCode(code, language);

      expect(response).toBe(expectedResponse);
      expect(mockProvider.improve).toHaveBeenCalledWith(code, language);
    });
  });

  describe('Code Debugging', () => {
    test('should debug code successfully', async () => {
      const code = 'def hello(): print("Hello")';
      const language = 'python' as const;
      const expectedResponse = createMockAIResponse();
      
      mockProvider.debug.mockResolvedValue(expectedResponse);

      const response = await aiService.debugCode(code, language);

      expect(response).toBe(expectedResponse);
      expect(mockProvider.debug).toHaveBeenCalledWith(code, language);
    });
  });

  describe('Template Enhancement', () => {
    test('should generate function signature for Python', () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function',
        parameters: ['param1', 'param2'],
        returnType: 'str'
      };

      // Access private method through any type assertion for testing
      const signature = (aiService as any).generateFunctionSignature(request);
      
      expect(signature).toBe('def function_name(param1, param2) -> str:');
    });

    test('should generate function signature for JavaScript', () => {
      const request = {
        language: 'javascript' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function',
        parameters: ['param1', 'param2']
      };

      const signature = (aiService as any).generateFunctionSignature(request);
      
      expect(signature).toBe('function functionName(param1, param2) {');
    });

    test('should generate function signature for C++', () => {
      const request = {
        language: 'cpp' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function',
        parameters: ['int param1', 'string param2'],
        returnType: 'void'
      };

      const signature = (aiService as any).generateFunctionSignature(request);
      
      expect(signature).toBe('void functionName(int param1, string param2) {');
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration', () => {
      const newConfig = {
        rateLimiting: {
          requestsPerMinute: 20,
          requestsPerHour: 200
        }
      };

      aiService.updateConfig(newConfig);
      const updatedConfig = aiService.getConfig();

      expect(updatedConfig.rateLimiting.requestsPerMinute).toBe(20);
      expect(updatedConfig.rateLimiting.requestsPerHour).toBe(200);
      expect(updatedConfig.defaultProvider).toBe('mock'); // Should preserve other settings
    });

    test('should get current configuration', () => {
      const currentConfig = aiService.getConfig();
      
      expect(currentConfig).toEqual(config);
      expect(currentConfig).not.toBe(config); // Should be a copy
    });
  });

  describe('Health Check', () => {
    test('should perform health check on all providers', async () => {
      const secondProvider = createMockAIProvider();
      secondProvider.name = 'second-provider';
      secondProvider.isAvailable.mockResolvedValue(false);
      
      aiService.registerProvider(secondProvider);
      mockProvider.isAvailable.mockResolvedValue(true);

      const health = await aiService.healthCheck();

      expect(health).toEqual({
        'mock-provider': true,
        'second-provider': false
      });
    });

    test('should handle health check failures', async () => {
      mockProvider.isAvailable.mockRejectedValue(new Error('Health check failed'));

      const health = await aiService.healthCheck();

      expect(health).toEqual({
        'mock-provider': false
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle provider errors gracefully', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const providerError = new Error('Provider internal error');
      mockProvider.generate.mockRejectedValue(providerError);

      await expect(aiService.generateCode(request)).rejects.toThrow(AIError);
      await expect(aiService.generateCode(request)).rejects.toThrow('Maximum retries exceeded');
    });

    test('should preserve original error in retry failure', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const originalError = new Error('Original error');
      mockProvider.generate.mockRejectedValue(originalError);

      try {
        await aiService.generateCode(request);
      } catch (error) {
        expect(error).toBeInstanceOf(AIError);
        expect((error as AIError).originalError).toBe(originalError);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty request parameters', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function',
        parameters: [],
        returnType: undefined
      };

      const signature = (aiService as any).generateFunctionSignature(request);
      expect(signature).toBe('def function_name():');
    });

    test('should handle unsupported language in signature generation', () => {
      const request = {
        language: 'unsupported' as any,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const signature = (aiService as any).generateFunctionSignature(request);
      expect(signature).toBe('');
    });

    test('should handle concurrent requests', async () => {
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      const promises = Array.from({ length: 5 }, () => aiService.generateCode(request));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response).toBeDefined();
      });
    });
  });
});