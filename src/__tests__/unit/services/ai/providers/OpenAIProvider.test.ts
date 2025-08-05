import { OpenAIProvider } from '../../../../../services/ai/providers/OpenAIProvider';
import { CodeGenerationRequest, AIError } from '../../../../../services/ai/types';
import { SupportedLanguage } from '../../../../../types';
import fetchMock from 'jest-fetch-mock';

// Mock fetch for all tests in this file
fetchMock.enableMocks();

describe('OpenAIProvider', () => {
  let openAIProvider: OpenAIProvider;
  let mockConfig: any;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockConfig = {
      apiKey: 'test-api-key',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2000
    };
    openAIProvider = new OpenAIProvider(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    test('should have correct name', () => {
      expect(openAIProvider.name).toBe('openai');
    });

    test('should use default configuration values', () => {
      const provider = new OpenAIProvider({ apiKey: 'test' });
      const config = provider.getConfig();
      
      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2000);
    });

    test('should allow custom base URL', () => {
      const customProvider = new OpenAIProvider({
        apiKey: 'test',
        baseURL: 'https://custom.openai.com/v1'
      });
      
      const config = customProvider.getConfig();
      expect(config.baseURL).toBe('https://custom.openai.com/v1');
    });

    test('should update configuration', () => {
      openAIProvider.updateConfig({ temperature: 0.9, maxTokens: 3000 });
      const config = openAIProvider.getConfig();
      
      expect(config.temperature).toBe(0.9);
      expect(config.maxTokens).toBe(3000);
      expect(config.apiKey).toBe('test-api-key'); // Should preserve other settings
    });
  });

  describe('Availability Check', () => {
    test('should return true when API is available', async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: [] }), { status: 200 });
      
      const isAvailable = await openAIProvider.isAvailable();
      
      expect(isAvailable).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should return false when API is unavailable', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const isAvailable = await openAIProvider.isAvailable();
      
      expect(isAvailable).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'OpenAI provider availability check failed:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should return false on HTTP error', async () => {
      fetchMock.mockResponseOnce('Unauthorized', { status: 401 });
      
      const isAvailable = await openAIProvider.isAvailable();
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('Code Generation', () => {
    const mockOpenAIResponse = {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: `Here's a Python function that creates a calculator:

\`\`\`python
def calculator(a: float, b: float, operation: str) -> float:
    """
    Performs basic arithmetic operations.
    
    Args:
        a: First number
        b: Second number  
        operation: Operation to perform (+, -, *, /)
        
    Returns:
        Result of the operation
        
    Raises:
        ValueError: If operation is not supported
        ZeroDivisionError: If dividing by zero
    """
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b
    else:
        raise ValueError(f"Unsupported operation: {operation}")

# Example usage
result = calculator(10, 5, '+')
print(result)  # Output: 15
\`\`\`

\`\`\`python
# Unit tests
import unittest

class TestCalculator(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(calculator(2, 3, '+'), 5)
    
    def test_division_by_zero(self):
        with self.assertRaises(ZeroDivisionError):
            calculator(10, 0, '/')

if __name__ == '__main__':
    unittest.main()
\`\`\`

This implementation includes:
- Type hints for better code documentation
- Comprehensive error handling
- Clear docstring documentation
- Example usage
- Unit tests for validation`
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 200,
        total_tokens: 250
      }
    };

    test('should generate code successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockOpenAIResponse));
      
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a calculator function',
        prompt: 'Create a calculator function'
      };

      const response = await openAIProvider.generate(request);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^openai_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('def calculator'),
        code: expect.stringContaining('def calculator'),
        tests: expect.stringContaining('TestCalculator'),
        documentation: expect.stringContaining('Function Documentation'),
        language: 'python',
        explanation: expect.any(String),
        suggestions: expect.any(Array),
        timestamp: expect.any(Date),
        provider: 'openai'
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"model":"gpt-3.5-turbo"')
        })
      );
    });

    test('should handle generation with custom parameters', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockOpenAIResponse));
      
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a calculator function',
        prompt: 'Create a calculator function',
        parameters: ['a: float', 'b: float', 'op: str'],
        returnType: 'float',
        context: 'For a web application',
        temperature: 0.9,
        maxTokens: 3000
      };

      await openAIProvider.generate(request);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.temperature).toBe(0.9);
      expect(requestBody.max_tokens).toBe(3000);
      expect(requestBody.messages[1].content).toContain('Parameters: a: float, b: float, op: str');
      expect(requestBody.messages[1].content).toContain('Return Type: float');
      expect(requestBody.messages[1].content).toContain('Context: For a web application');
    });

    test('should handle API errors during generation', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ error: { message: 'Invalid API key' } }),
        { status: 401 }
      );

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      await expect(openAIProvider.generate(request)).rejects.toThrow(AIError);
      await expect(openAIProvider.generate(request)).rejects.toThrow('Invalid API key');
    });

    test('should extract code blocks correctly', async () => {
      const responseWithMultipleBlocks = {
        ...mockOpenAIResponse,
        choices: [{
          ...mockOpenAIResponse.choices[0],
          message: {
            role: 'assistant' as const,
            content: `Here's the solution:

\`\`\`python
def main_function():
    return "main"
\`\`\`

And here are the tests:

\`\`\`python
def test_main_function():
    assert main_function() == "main"
\`\`\`

This implementation is efficient and well-tested.`
          }
        }]
      };

      fetchMock.mockResponseOnce(JSON.stringify(responseWithMultipleBlocks));
      
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const response = await openAIProvider.generate(request);

      expect(response.code).toContain('def main_function');
      expect(response.tests).toContain('def test_main_function');
    });
  });

  describe('Code Explanation', () => {
    const mockExplanationResponse = {
      ...{
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant' as const,
            content: `This Python function demonstrates a simple addition operation:

1. **Function Definition**: The function takes two parameters and returns their sum
2. **Type Safety**: Uses basic parameter validation
3. **Return Value**: Returns the arithmetic result

Key concepts used:
- Function definition syntax
- Parameter handling
- Return statements

Potential improvements:
- Add type hints for better documentation
- Include error handling for non-numeric inputs
- Add docstring documentation`
          },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 30, completion_tokens: 100, total_tokens: 130 }
      }
    };

    test('should explain code successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockExplanationResponse));
      
      const code = 'def add(a, b): return a + b';
      const language: SupportedLanguage = 'python';

      const response = await openAIProvider.explain(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^openai_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('function demonstrates'),
        language: 'python',
        explanation: expect.stringContaining('function demonstrates'),
        suggestions: expect.arrayContaining([
          expect.stringContaining('type hints'),
          expect.stringContaining('error handling'),
          expect.stringContaining('docstring')
        ]),
        timestamp: expect.any(Date),
        provider: 'openai'
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.messages[1].content).toContain('explain the following python code');
      expect(requestBody.messages[1].content).toContain(code);
    });

    test('should create appropriate system prompt for explanation', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockExplanationResponse));
      
      await openAIProvider.explain('def test(): pass', 'python');

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.messages[0].content).toContain('expert Python developer and teacher');
      expect(requestBody.messages[0].content).toContain('clear, detailed explanations');
    });
  });

  describe('Code Improvement', () => {
    const mockImprovementResponse = {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: `Analysis of the provided code:

**Issues Identified:**
- Missing type hints
- No error handling
- Lack of documentation

**Improved Version:**

\`\`\`python
def add_numbers(a: float, b: float) -> float:
    """
    Add two numbers together.
    
    Args:
        a: First number
        b: Second number
        
    Returns:
        The sum of a and b
        
    Raises:
        TypeError: If inputs are not numeric
    """
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("Both arguments must be numeric")
    
    return a + b
\`\`\`

**Changes Made:**
- Added comprehensive type hints
- Included proper error handling
- Added detailed docstring
- Improved function naming

**Best Practices Followed:**
- PEP 8 style guidelines
- Defensive programming
- Clear documentation`
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 40, completion_tokens: 150, total_tokens: 190 }
    };

    test('should improve code successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockImprovementResponse));
      
      const code = 'def add(a, b): return a + b';
      const language: SupportedLanguage = 'python';

      const response = await openAIProvider.improve(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^openai_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('Issues Identified'),
        language: 'python',
        explanation: expect.stringContaining('Issues Identified'),
        suggestions: expect.arrayContaining([
          expect.stringContaining('type hints'),
          expect.stringContaining('error handling'),
          expect.stringContaining('documentation')
        ]),
        timestamp: expect.any(Date),
        provider: 'openai'
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.messages[0].content).toContain('senior Python code reviewer');
      expect(requestBody.messages[1].content).toContain('analyze and improve');
    });
  });

  describe('Code Debugging', () => {
    const mockDebugResponse = {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-3.5-turbo',
      choices: [{
        index: 0,
        message: {
          role: 'assistant' as const,
          content: `Code Analysis Results:

**Potential Issues:**
- Division by zero not handled
- No input validation
- Missing error handling

**Syntax Errors:**
- None detected

**Performance Considerations:**
- Function is efficient for its purpose
- No major performance concerns

**Security Concerns:**
- Input validation missing could lead to runtime errors

**Debugging Recommendations:**
- Add try-catch blocks
- Validate input parameters
- Include unit tests
- Add logging for debugging`
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 35, completion_tokens: 120, total_tokens: 155 }
    };

    test('should debug code successfully', async () => {
      fetchMock.mockResponseOnce(JSON.stringify(mockDebugResponse));
      
      const code = 'def divide(a, b): return a / b';
      const language: SupportedLanguage = 'python';

      const response = await openAIProvider.debug(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^openai_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('Potential Issues'),
        language: 'python',
        explanation: expect.stringContaining('Potential Issues'),
        suggestions: expect.arrayContaining([
          expect.stringContaining('try-catch'),
          expect.stringContaining('input parameters'),
          expect.stringContaining('unit tests')
        ]),
        timestamp: expect.any(Date),
        provider: 'openai'
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.messages[0].content).toContain('expert Python debugger');
      expect(requestBody.messages[1].content).toContain('analyze the following python code for potential issues');
    });
  });

  describe('Streaming Generation', () => {
    test('should handle streaming response', async () => {
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"def"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":" hello"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"():"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      fetchMock.mockResponseOnce(mockStreamResponse as any, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' }
      });

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a hello function',
        prompt: 'Create a hello function'
      };

      const stream = openAIProvider.generateStream(request);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['def', ' hello', '():']);
      
      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
      expect(requestBody.stream).toBe(true);
    });

    test('should handle streaming errors', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const stream = openAIProvider.generateStream(request);

      await expect(async () => {
        for await (const chunk of stream) {
          // Should not reach here
        }
      }).rejects.toThrow(AIError);
    });

    test('should handle malformed streaming data', async () => {
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: invalid json\n\n'));
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"valid"}}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      fetchMock.mockResponseOnce(mockStreamResponse as any);

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const stream = openAIProvider.generateStream(request);
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Should skip invalid JSON and only process valid chunks
      expect(chunks).toEqual(['valid']);
    });
  });

  describe('Error Handling', () => {
    test('should handle 401 Unauthorized errors', async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({ error: { message: 'Invalid API key' } }),
        { status: 401 }
      );

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const error = await openAIProvider.generate(request).catch(e => e);
      
      expect(error).toBeInstanceOf(AIError);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.retryable).toBe(false);
    });

    test('should handle 429 Rate Limit errors', async () => {
      fetchMock.mockResponseOnce('Rate limit exceeded', { status: 429 });

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const error = await openAIProvider.generate(request).catch(e => e);
      
      expect(error).toBeInstanceOf(AIError);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryable).toBe(true);
    });

    test('should handle 500 Server errors', async () => {
      fetchMock.mockResponseOnce('Internal Server Error', { status: 500 });

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const error = await openAIProvider.generate(request).catch(e => e);
      
      expect(error).toBeInstanceOf(AIError);
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.retryable).toBe(true);
    });

    test('should handle network errors', async () => {
      fetchMock.mockRejectOnce(new Error('Network error'));

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const error = await openAIProvider.generate(request).catch(e => e);
      
      expect(error).toBeInstanceOf(AIError);
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });

    test('should preserve original error', async () => {
      const originalError = new Error('Original network error');
      fetchMock.mockRejectOnce(originalError);

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const error = await openAIProvider.generate(request).catch(e => e);
      
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('Helper Methods', () => {
    test('should extract suggestions from content', () => {
      const content = `Here are some improvements:
- Add error handling
- Include type hints
* Use better variable names
1. Add unit tests
2. Improve documentation

Some other text that shouldn't be a suggestion.`;

      const suggestions = (openAIProvider as any).extractSuggestions(content);
      
      expect(suggestions).toEqual([
        'Add error handling',
        'Include type hints',
        'Use better variable names',
        'Add unit tests',
        'Improve documentation'
      ]);
    });

    test('should limit suggestions to 5 items', () => {
      const content = Array.from({ length: 10 }, (_, i) => `- Suggestion ${i + 1}`).join('\n');
      
      const suggestions = (openAIProvider as any).extractSuggestions(content);
      
      expect(suggestions).toHaveLength(5);
    });

    test('should extract explanation from content', () => {
      const content = `# This is a title
      
This is the main explanation of the code functionality.
This continues the explanation with more details.

\`\`\`python
def example():
    pass
\`\`\`

This is additional explanation after the code block.`;

      const explanation = (openAIProvider as any).extractExplanation(content);
      
      expect(explanation).not.toContain('```');
      expect(explanation).toContain('main explanation');
    });

    test('should generate unique IDs', () => {
      const id1 = (openAIProvider as any).generateId();
      const id2 = (openAIProvider as any).generateId();
      
      expect(id1).toMatch(/^openai_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^openai_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should create system prompts for different languages', () => {
      const pythonPrompt = (openAIProvider as any).createSystemPrompt('python', 'generation');
      const jsPrompt = (openAIProvider as any).createSystemPrompt('javascript', 'generation');
      const cppPrompt = (openAIProvider as any).createSystemPrompt('cpp', 'generation');
      
      expect(pythonPrompt).toContain('Python');
      expect(pythonPrompt).toContain('type hints');
      expect(jsPrompt).toContain('JavaScript');
      expect(jsPrompt).toContain('ES6+');
      expect(cppPrompt).toContain('C++');
      expect(cppPrompt).toContain('modern C++');
    });

    test('should create generation prompts with all parameters', () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a calculator',
        prompt: 'Create a calculator function',
        parameters: ['a: int', 'b: int'],
        returnType: 'int',
        context: 'For a math application'
      };

      const prompt = (openAIProvider as any).createGenerationPrompt(request);
      
      expect(prompt).toContain('create a calculator');
      expect(prompt).toContain('Type: function');
      expect(prompt).toContain('Parameters: a: int, b: int');
      expect(prompt).toContain('Return Type: int');
      expect(prompt).toContain('Context: For a math application');
      expect(prompt).toContain('Follow python best practices');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty API responses', async () => {
      const emptyResponse = {
        id: 'test',
        object: 'chat.completion',
        created: 123,
        model: 'gpt-3.5-turbo',
        choices: [],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      };

      fetchMock.mockResponseOnce(JSON.stringify(emptyResponse));

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const response = await openAIProvider.generate(request);
      
      expect(response.content).toBe('');
      expect(response.code).toBe('');
    });

    test('should handle response without code blocks', async () => {
      const responseWithoutCode = {
        id: 'test',
        object: 'chat.completion',
        created: 123,
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: {
            role: 'assistant' as const,
            content: 'This is just text without any code blocks.'
          },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      };

      fetchMock.mockResponseOnce(JSON.stringify(responseWithoutCode));

      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function',
        prompt: 'Create a function'
      };

      const response = await openAIProvider.generate(request);
      
      expect(response.content).toBe('This is just text without any code blocks.');
      expect(response.code).toBe('This is just text without any code blocks.');
    });

    test('should handle concurrent requests', async () => {
      fetchMock.mockResponse(JSON.stringify({
        id: 'test',
        object: 'chat.completion',
        created: 123,
        model: 'gpt-3.5-turbo',
        choices: [{
          index: 0,
          message: { role: 'assistant' as const, content: 'def test(): pass' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      }));

      const requests = Array.from({ length: 3 }, (_, i) => ({
        language: 'python' as const,
        type: 'function',
        description: `create function ${i}`,
        prompt: `Create function ${i}`
      }));

      const promises = requests.map(request => openAIProvider.generate(request));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.provider).toBe('openai');
        expect(response.content).toContain('def test');
      });
    });
  });
});