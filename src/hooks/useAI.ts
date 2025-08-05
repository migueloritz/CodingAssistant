import { useState, useCallback, useRef, useEffect } from 'react';
import { AIService } from '../services/ai/AIService';
import { MockProvider } from '../services/ai/providers/MockProvider';
import { OpenAIProvider } from '../services/ai/providers/OpenAIProvider';
import { CodeGenerationRequest, CodeGenerationResponse, AIResponse, AIError, AIServiceConfig } from '../services/ai/types';
import { SupportedLanguage } from '../types';

// Hook state interface
interface AIState {
  isLoading: boolean;
  error: string | null;
  currentProvider: string;
  availableProviders: string[];
  lastResponse: CodeGenerationResponse | AIResponse | null;
  streamingContent: string;
  isStreaming: boolean;
}

// Hook options
interface UseAIOptions {
  defaultProvider?: string;
  enableStreaming?: boolean;
  openAIApiKey?: string;
  autoRetry?: boolean;
  retryDelay?: number;
}

// Hook return type
interface UseAIReturn {
  // State
  state: AIState;
  
  // Actions
  generateCode: (request: CodeGenerationRequest) => Promise<CodeGenerationResponse | null>;
  explainCode: (code: string, language: SupportedLanguage) => Promise<AIResponse | null>;
  improveCode: (code: string, language: SupportedLanguage) => Promise<AIResponse | null>;
  debugCode: (code: string, language: SupportedLanguage) => Promise<AIResponse | null>;
  
  // Streaming
  generateCodeStream: (request: CodeGenerationRequest) => Promise<AsyncGenerator<string, void, unknown> | null>;
  stopStreaming: () => void;
  
  // Provider management
  switchProvider: (providerName: string) => Promise<boolean>;
  refreshProviders: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  clearResponse: () => void;
  
  // Service instance (for advanced usage)
  service: AIService | null;
}

// Default configuration
const defaultConfig: AIServiceConfig = {
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
};

export const useAI = (options: UseAIOptions = {}): UseAIReturn => {
  const {
    defaultProvider = 'mock',
    enableStreaming = true,
    openAIApiKey,
    autoRetry = true,
    retryDelay = 1000
  } = options;

  // Initialize AI service
  const serviceRef = useRef<AIService | null>(null);
  const streamingControllerRef = useRef<AbortController | null>(null);

  // State management
  const [state, setState] = useState<AIState>({
    isLoading: false,
    error: null,
    currentProvider: defaultProvider,
    availableProviders: [],
    lastResponse: null,
    streamingContent: '',
    isStreaming: false
  });

  // Initialize service
  useEffect(() => {
    const initializeService = async () => {
      try {
        const config = {
          ...defaultConfig,
          defaultProvider
        };

        const service = new AIService(config);

        // Register providers
        service.registerProvider(new MockProvider(500)); // 500ms delay for demo

        // Always register OpenAI provider - it will handle missing API key gracefully
        service.registerProvider(new OpenAIProvider({
          apiKey: openAIApiKey,
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2000
        }));

        serviceRef.current = service;

        // Get available providers
        const available = await service.getAvailableProviders();
        setState(prev => ({
          ...prev,
          availableProviders: available,
          currentProvider: available.includes(defaultProvider) ? defaultProvider : available[0] || 'mock'
        }));

      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        setState(prev => ({
          ...prev,
          error: `Failed to initialize AI service: ${error}`
        }));
      }
    };

    initializeService();

    // Cleanup on unmount
    return () => {
      if (streamingControllerRef.current) {
        streamingControllerRef.current.abort();
        streamingControllerRef.current = null;
      }
    };
  }, [defaultProvider, openAIApiKey]);

  // Error handler with retry logic
  const handleError = useCallback(async (error: any, operation: () => Promise<any>, retryCount = 0): Promise<any> => {
    const maxRetries = autoRetry ? 3 : 0;
    
    if (error instanceof AIError && error.retryable && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount);
      setState(prev => ({
        ...prev,
        error: `Retrying in ${delay/1000}s... (attempt ${retryCount + 1}/${maxRetries + 1})`
      }));
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        return await operation();
      } catch (retryError) {
        return handleError(retryError, operation, retryCount + 1);
      }
    }
    
    // Enhanced error message formatting with recovery suggestions
    let errorMessage = 'An unexpected error occurred.';
    let recoverySuggestion = '';
    
    if (error instanceof AIError) {
      errorMessage = error.message;
      
      // Add specific recovery suggestions based on error code
      switch (error.code) {
        case 'NETWORK_ERROR':
          recoverySuggestion = '\n\nRecovery suggestions:\n• Check your internet connection\n• Try switching to a different provider\n• Wait a moment and retry';
          break;
        case 'AUTH_ERROR':
        case 'INVALID_API_KEY':
          recoverySuggestion = '\n\nRecovery suggestions:\n• Verify your API key in settings\n• Check API key permissions\n• Try using the mock provider for testing';
          break;
        case 'RATE_LIMIT_EXCEEDED':
          recoverySuggestion = '\n\nRecovery suggestions:\n• Wait before making another request\n• Switch to a different provider\n• Reduce request frequency';
          break;
        case 'PROVIDER_UNAVAILABLE':
          recoverySuggestion = '\n\nRecovery suggestions:\n• Try a different AI provider\n• Check provider status\n• Use mock provider for testing';
          break;
        default:
          if (error.retryable) {
            recoverySuggestion = '\n\nThis error might be temporary. Try the operation again.';
          }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    }

    setState(prev => ({ 
      ...prev, 
      error: errorMessage + recoverySuggestion, 
      isLoading: false, 
      isStreaming: false 
    }));
    return null;
  }, [autoRetry, retryDelay]);

  // Generate code
  const generateCode = useCallback(async (request: CodeGenerationRequest): Promise<CodeGenerationResponse | null> => {
    if (!serviceRef.current) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, lastResponse: null }));

    const operation = async () => {
      const response = await serviceRef.current!.generateCode(request, state.currentProvider);
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastResponse: response
      }));
      return response;
    };

    try {
      return await operation();
    } catch (error) {
      return handleError(error, operation);
    }
  }, [state.currentProvider, handleError]);

  // Explain code
  const explainCode = useCallback(async (code: string, language: SupportedLanguage): Promise<AIResponse | null> => {
    if (!serviceRef.current) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, lastResponse: null }));

    const operation = async () => {
      const response = await serviceRef.current!.explainCode(code, language, state.currentProvider);
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastResponse: response
      }));
      return response;
    };

    try {
      return await operation();
    } catch (error) {
      return handleError(error, operation);
    }
  }, [state.currentProvider, handleError]);

  // Improve code
  const improveCode = useCallback(async (code: string, language: SupportedLanguage): Promise<AIResponse | null> => {
    if (!serviceRef.current) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, lastResponse: null }));

    const operation = async () => {
      const response = await serviceRef.current!.improveCode(code, language, state.currentProvider);
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastResponse: response
      }));
      return response;
    };

    try {
      return await operation();
    } catch (error) {
      return handleError(error, operation);
    }
  }, [state.currentProvider, handleError]);

  // Debug code
  const debugCode = useCallback(async (code: string, language: SupportedLanguage): Promise<AIResponse | null> => {
    if (!serviceRef.current) {
      setState(prev => ({ ...prev, error: 'AI service not initialized' }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, lastResponse: null }));

    const operation = async () => {
      const response = await serviceRef.current!.debugCode(code, language, state.currentProvider);
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastResponse: response
      }));
      return response;
    };

    try {
      return await operation();
    } catch (error) {
      return handleError(error, operation);
    }
  }, [state.currentProvider, handleError]);

  // Generate code with streaming
  const generateCodeStream = useCallback(async (request: CodeGenerationRequest): Promise<AsyncGenerator<string, void, unknown> | null> => {
    if (!serviceRef.current || !enableStreaming) {
      // Fall back to regular generation
      const response = await generateCode(request);
      if (response) {
        // Create a simple generator that yields the full response
        return (async function* () {
          yield response.code;
        })();
      }
      return null;
    }

    const provider = serviceRef.current.getProvider(state.currentProvider);
    if (!provider || !(provider as any).generateStream) {
      // Provider doesn't support streaming, use regular generation
      const response = await generateCode(request);
      if (response) {
        return (async function* () {
          yield response.code;
        })();
      }
      return null;
    }

    setState(prev => ({ ...prev, isStreaming: true, error: null, streamingContent: '' }));

    try {
      // Create abort controller for this streaming session
      streamingControllerRef.current = new AbortController();

      const stream = (provider as any).generateStream(request);
      
      return (async function* () {
        try {
          for await (const chunk of stream) {
            if (streamingControllerRef.current?.signal.aborted) {
              break;
            }
            
            setState(prev => ({
              ...prev,
              streamingContent: prev.streamingContent + chunk
            }));
            
            yield chunk;
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            error: `Streaming error: ${error}`,
            isStreaming: false
          }));
        } finally {
          setState(prev => ({ ...prev, isStreaming: false }));
          // Clean up the controller reference
          if (streamingControllerRef.current) {
            streamingControllerRef.current = null;
          }
        }
      })();

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Failed to start streaming: ${error}`,
        isStreaming: false
      }));
      return null;
    }
  }, [enableStreaming, state.currentProvider, generateCode]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (streamingControllerRef.current) {
      streamingControllerRef.current.abort();
      streamingControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  // Switch provider
  const switchProvider = useCallback(async (providerName: string): Promise<boolean> => {
    if (!serviceRef.current) {
      return false;
    }

    if (!state.availableProviders.includes(providerName)) {
      setState(prev => ({ ...prev, error: `Provider ${providerName} is not available` }));
      return false;
    }

    setState(prev => ({ ...prev, currentProvider: providerName, error: null }));
    return true;
  }, [state.availableProviders]);

  // Refresh available providers
  const refreshProviders = useCallback(async () => {
    if (!serviceRef.current) {
      return;
    }

    try {
      const available = await serviceRef.current.getAvailableProviders();
      setState(prev => ({
        ...prev,
        availableProviders: available,
        currentProvider: available.includes(prev.currentProvider) 
          ? prev.currentProvider 
          : available[0] || 'mock'
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: `Failed to refresh providers: ${error}` }));
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear response
  const clearResponse = useCallback(() => {
    setState(prev => ({ ...prev, lastResponse: null, streamingContent: '' }));
  }, []);

  return {
    state,
    generateCode,
    explainCode,
    improveCode,
    debugCode,
    generateCodeStream,
    stopStreaming,
    switchProvider,
    refreshProviders,
    clearError,
    clearResponse,
    service: serviceRef.current
  };
};

// Hook for provider health monitoring
export const useAIHealth = (service: AIService | null) => {
  const [health, setHealth] = useState<{ [providerName: string]: boolean }>({});
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!service) return;

    setIsChecking(true);
    try {
      const healthStatus = await service.healthCheck();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [service]);

  useEffect(() => {
    if (service) {
      checkHealth();
      
      // Check health every 5 minutes
      const interval = setInterval(checkHealth, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [service, checkHealth]);

  return { health, isChecking, checkHealth };
};