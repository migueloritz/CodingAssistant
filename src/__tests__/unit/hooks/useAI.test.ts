import { renderHook, act } from '@testing-library/react-hooks';
import { useAI, useAIHealth } from '../../../hooks/useAI';
import { AIService } from '../../../services/ai/AIService';
import { MockProvider } from '../../../services/ai/providers/MockProvider';
import { OpenAIProvider } from '../../../services/ai/providers/OpenAIProvider';
import { AIError } from '../../../services/ai/types';
import { createMockAIProvider, createMockCodeGenerationResponse, createMockAIResponse } from '../../utils/test-utils';

// Mock the AI service and providers
jest.mock('../../../services/ai/AIService');
jest.mock('../../../services/ai/providers/MockProvider');
jest.mock('../../../services/ai/providers/OpenAIProvider');

const MockedAIService = AIService as jest.MockedClass<typeof AIService>;
const MockedMockProvider = MockProvider as jest.MockedClass<typeof MockProvider>;
const MockedOpenAIProvider = OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>;

describe('useAI Hook', () => {
  let mockAIService: jest.Mocked<AIService>;
  let mockProvider: ReturnType<typeof createMockAIProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock service instance
    mockAIService = {
      registerProvider: jest.fn(),
      getProvider: jest.fn(),
      getAvailableProviders: jest.fn(),
      generateCode: jest.fn(),
      explainCode: jest.fn(),
      improveCode: jest.fn(),
      debugCode: jest.fn(),
      healthCheck: jest.fn(),
      updateConfig: jest.fn(),
      getConfig: jest.fn()
    } as any;

    MockedAIService.mockImplementation(() => mockAIService);
    
    // Create mock provider
    mockProvider = createMockAIProvider();
    MockedMockProvider.mockImplementation(() => mockProvider as any);
    
    // Setup default mock responses
    mockAIService.getAvailableProviders.mockResolvedValue(['mock-provider']);
    mockAIService.getProvider.mockReturnValue(mockProvider as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAI());

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.currentProvider).toBe('mock');
      expect(result.current.state.availableProviders).toEqual([]);
      expect(result.current.state.lastResponse).toBe(null);
      expect(result.current.state.isStreaming).toBe(false);

      // Wait for initialization to complete
      await waitForNextUpdate();

      expect(mockAIService.registerProvider).toHaveBeenCalledWith(expect.any(MockProvider));
      expect(result.current.state.availableProviders).toEqual(['mock-provider']);
    });

    test('should initialize with custom options', async () => {
      const options = {
        defaultProvider: 'openai',
        enableStreaming: false,
        openAIApiKey: 'test-key',
        autoRetry: false,
        retryDelay: 2000
      };

      const { result, waitForNextUpdate } = renderHook(() => useAI(options));

      expect(result.current.state.currentProvider).toBe('openai');

      await waitForNextUpdate();

      expect(mockAIService.registerProvider).toHaveBeenCalledWith(expect.any(MockProvider));
      expect(mockAIService.registerProvider).toHaveBeenCalledWith(expect.any(OpenAIProvider));
    });

    test('should handle service initialization failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAIService.getAvailableProviders.mockRejectedValue(new Error('Service initialization failed'));

      const { result, waitForNextUpdate } = renderHook(() => useAI());

      await waitForNextUpdate();

      expect(result.current.state.error).toContain('Failed to initialize AI service');
      
      consoleErrorSpy.mockRestore();
    });

    test('should register OpenAI provider when API key provided', async () => {
      const { waitForNextUpdate } = renderHook(() => 
        useAI({ openAIApiKey: 'test-api-key' })
      );

      await waitForNextUpdate();

      expect(MockedOpenAIProvider).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2000
      });
      expect(mockAIService.registerProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Code Generation', () => {
    test('should generate code successfully', async () => {
      const mockResponse = createMockCodeGenerationResponse();
      mockAIService.generateCode.mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate(); // Wait for initialization

      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'Test function',
        prompt: 'Create a test function'
      };

      let response: any;
      await act(async () => {
        response = await result.current.generateCode(request);
      });

      expect(response).toBe(mockResponse);
      expect(result.current.state.lastResponse).toBe(mockResponse);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(mockAIService.generateCode).toHaveBeenCalledWith(request, 'mock-provider');
    });

    test('should handle generation errors with retry', async () => {
      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      const successResponse = createMockCodeGenerationResponse();

      mockAIService.generateCode
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce(successResponse);

      const { result, waitForNextUpdate } = renderHook(() => 
        useAI({ autoRetry: true, retryDelay: 100 })
      );
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'Test function',
        prompt: 'Create a test function'
      };

      let response: any;
      await act(async () => {
        response = await result.current.generateCode(request);
      });

      expect(response).toBe(successResponse);
      expect(mockAIService.generateCode).toHaveBeenCalledTimes(3);
    });

    test('should handle non-retryable errors', async () => {
      const nonRetryableError = new AIError('INVALID_REQUEST', 'Invalid request', null, false);
      mockAIService.generateCode.mockRejectedValue(nonRetryableError);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'Test function',
        prompt: 'Create a test function'
      };

      let response: any;
      await act(async () => {
        response = await result.current.generateCode(request);
      });

      expect(response).toBe(null);
      expect(result.current.state.error).toBe('Invalid request');
      expect(mockAIService.generateCode).toHaveBeenCalledTimes(1);
    });

    test('should handle service not initialized error', async () => {
      const { result } = renderHook(() => useAI());

      // Clear the service ref to simulate uninitialized state
      (result.current as any).service = null;

      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'Test function',
        prompt: 'Create a test function'
      };

      let response: any;
      await act(async () => {
        response = await result.current.generateCode(request);
      });

      expect(response).toBe(null);
      expect(result.current.state.error).toBe('AI service not initialized');
    });
  });

  describe('Code Explanation', () => {
    test('should explain code successfully', async () => {
      const mockResponse = createMockAIResponse();
      mockAIService.explainCode.mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let response: any;
      await act(async () => {
        response = await result.current.explainCode('def test(): pass', 'python');
      });

      expect(response).toBe(mockResponse);
      expect(result.current.state.lastResponse).toBe(mockResponse);
      expect(mockAIService.explainCode).toHaveBeenCalledWith('def test(): pass', 'python', 'mock-provider');
    });

    test('should handle explanation errors', async () => {
      const error = new Error('Explanation failed');
      mockAIService.explainCode.mockRejectedValue(error);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let response: any;
      await act(async () => {
        response = await result.current.explainCode('def test(): pass', 'python');
      });

      expect(response).toBe(null);
      expect(result.current.state.error).toContain('An unexpected error occurred');
    });
  });

  describe('Code Improvement', () => {
    test('should improve code successfully', async () => {
      const mockResponse = createMockAIResponse();
      mockAIService.improveCode.mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let response: any;
      await act(async () => {
        response = await result.current.improveCode('def test(): pass', 'python');
      });

      expect(response).toBe(mockResponse);
      expect(mockAIService.improveCode).toHaveBeenCalledWith('def test(): pass', 'python', 'mock-provider');
    });
  });

  describe('Code Debugging', () => {
    test('should debug code successfully', async () => {
      const mockResponse = createMockAIResponse();
      mockAIService.debugCode.mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let response: any;
      await act(async () => {
        response = await result.current.debugCode('def test(): pass', 'python');
      });

      expect(response).toBe(mockResponse);
      expect(mockAIService.debugCode).toHaveBeenCalledWith('def test(): pass', 'python', 'mock-provider');
    });
  });

  describe('Streaming Generation', () => {
    test('should handle streaming generation', async () => {
      const mockStreamProvider = {
        ...mockProvider,
        generateStream: jest.fn().mockImplementation(async function* () {
          yield 'def ';
          yield 'hello';
          yield '():';
          yield '\n    pass';
        })
      };

      mockAIService.getProvider.mockReturnValue(mockStreamProvider as any);

      const { result, waitForNextUpdate } = renderHook(() => 
        useAI({ enableStreaming: true })
      );
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Hello function',
        prompt: 'Create a hello function'
      };

      let chunks: string[] = [];
      await act(async () => {
        const stream = await result.current.generateCodeStream(request);
        if (stream) {
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }
      });

      expect(chunks).toEqual(['def ', 'hello', '():', '\n    pass']);
      expect(result.current.state.isStreaming).toBe(false);
    });

    test('should fallback to regular generation when streaming unavailable', async () => {
      const mockResponse = createMockCodeGenerationResponse();
      mockAIService.generateCode.mockResolvedValue(mockResponse);

      const { result, waitForNextUpdate } = renderHook(() => 
        useAI({ enableStreaming: false })
      );
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      let chunks: string[] = [];
      await act(async () => {
        const stream = await result.current.generateCodeStream(request);
        if (stream) {
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
        }
      });

      expect(chunks).toEqual([mockResponse.code]);
    });

    test('should stop streaming', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.state.isStreaming).toBe(false);
    });
  });

  describe('Provider Management', () => {
    test('should switch providers successfully', async () => {
      mockAIService.getAvailableProviders.mockResolvedValue(['mock-provider', 'openai']);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let switchResult: boolean;
      await act(async () => {
        switchResult = await result.current.switchProvider('openai');
      });

      expect(switchResult).toBe(true);
      expect(result.current.state.currentProvider).toBe('openai');
      expect(result.current.state.error).toBe(null);
    });

    test('should fail to switch to unavailable provider', async () => {
      mockAIService.getAvailableProviders.mockResolvedValue(['mock-provider']);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      let switchResult: boolean;
      await act(async () => {
        switchResult = await result.current.switchProvider('unavailable');
      });

      expect(switchResult).toBe(false);
      expect(result.current.state.error).toContain('Provider unavailable is not available');
    });

    test('should refresh available providers', async () => {
      mockAIService.getAvailableProviders
        .mockResolvedValueOnce(['mock-provider'])
        .mockResolvedValueOnce(['mock-provider', 'openai']);

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      expect(result.current.state.availableProviders).toEqual(['mock-provider']);

      await act(async () => {
        await result.current.refreshProviders();
      });

      expect(result.current.state.availableProviders).toEqual(['mock-provider', 'openai']);
    });

    test('should handle refresh providers error', async () => {
      mockAIService.getAvailableProviders
        .mockResolvedValueOnce(['mock-provider'])
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.refreshProviders();
      });

      expect(result.current.state.error).toContain('Failed to refresh providers');
    });
  });

  describe('Utility Functions', () => {
    test('should clear error', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      // Set an error first
      act(() => {
        (result.current as any).state.error = 'Test error';
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });

    test('should clear response', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      // Set a response first
      const mockResponse = createMockCodeGenerationResponse();
      act(() => {
        (result.current as any).state.lastResponse = mockResponse;
        (result.current as any).state.streamingContent = 'test content';
      });

      act(() => {
        result.current.clearResponse();
      });

      expect(result.current.state.lastResponse).toBe(null);
      expect(result.current.state.streamingContent).toBe('');
    });

    test('should provide service instance', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useAI());
      await waitForNextUpdate();

      expect(result.current.service).toBe(mockAIService);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', async () => {
      const { result, waitForNextUpdate, unmount } = renderHook(() => useAI());
      await waitForNextUpdate();

      // Mock AbortController
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false }
      };
      (global as any).AbortController = jest.fn(() => mockAbortController);

      // Start streaming to create abort controller
      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      await act(async () => {
        await result.current.generateCodeStream(request);
      });

      unmount();

      // Should abort any ongoing streaming
      expect(mockAbortController.abort).toHaveBeenCalled();
    });
  });

  describe('Error Retry Logic', () => {
    test('should implement exponential backoff', async () => {
      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      mockAIService.generateCode.mockRejectedValue(retryableError);

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const originalSetTimeout = global.setTimeout;
      
      const delays: number[] = [];
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      const { result, waitForNextUpdate } = renderHook(() => 
        useAI({ autoRetry: true, retryDelay: 1000 })
      );
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      await act(async () => {
        await result.current.generateCode(request);
      });

      expect(delays).toEqual([1000, 2000, 4000]);

      global.setTimeout = originalSetTimeout;
      setTimeoutSpy.mockRestore();
    });

    test('should show retry progress in error message', async () => {
      const retryableError = new AIError('NETWORK_ERROR', 'Network error', null, true);
      mockAIService.generateCode.mockRejectedValue(retryableError);

      const { result, waitForNextUpdate } = renderHook(() => 
        useAI({ autoRetry: true, retryDelay: 100 })
      );
      await waitForNextUpdate();

      const request = {
        language: 'python' as const,
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      };

      await act(async () => {
        await result.current.generateCode(request);
      });

      // Should show final error after all retries
      expect(result.current.state.error).toBe('Network error');
    });
  });
});

describe('useAIHealth Hook', () => {
  let mockAIService: jest.Mocked<AIService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAIService = {
      healthCheck: jest.fn()
    } as any;
  });

  test('should check health on mount and periodically', async () => {
    const healthStatus = { 'mock-provider': true, 'openai': false };
    mockAIService.healthCheck.mockResolvedValue(healthStatus);

    const { result, waitForNextUpdate } = renderHook(() => 
      useAIHealth(mockAIService)
    );

    expect(result.current.isChecking).toBe(true);

    await waitForNextUpdate();

    expect(result.current.health).toEqual(healthStatus);
    expect(result.current.isChecking).toBe(false);
    expect(mockAIService.healthCheck).toHaveBeenCalledTimes(1);
  });

  test('should handle health check errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockAIService.healthCheck.mockRejectedValue(new Error('Health check failed'));

    const { result, waitForNextUpdate } = renderHook(() => 
      useAIHealth(mockAIService)
    );

    await waitForNextUpdate();

    expect(result.current.isChecking).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });

  test('should not check health when service is null', () => {
    const { result } = renderHook(() => useAIHealth(null));

    expect(result.current.health).toEqual({});
    expect(result.current.isChecking).toBe(false);
    expect(mockAIService.healthCheck).not.toHaveBeenCalled();
  });

  test('should allow manual health check', async () => {
    const healthStatus = { 'mock-provider': true };
    mockAIService.healthCheck.mockResolvedValue(healthStatus);

    const { result, waitForNextUpdate } = renderHook(() => 
      useAIHealth(mockAIService)
    );

    await waitForNextUpdate();

    // Reset call count
    mockAIService.healthCheck.mockClear();

    await act(async () => {
      await result.current.checkHealth();
    });

    expect(mockAIService.healthCheck).toHaveBeenCalledTimes(1);
  });

  test('should cleanup interval on unmount', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    mockAIService.healthCheck.mockResolvedValue({});

    const { unmount, waitForNextUpdate } = renderHook(() => 
      useAIHealth(mockAIService)
    );

    await waitForNextUpdate();
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});