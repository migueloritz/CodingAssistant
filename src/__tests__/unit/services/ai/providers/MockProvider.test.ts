import { MockProvider } from '../../../../../services/ai/providers/MockProvider';
import { CodeGenerationRequest } from '../../../../../services/ai/types';
import { SupportedLanguage } from '../../../../../types';

describe('MockProvider', () => {
  let mockProvider: MockProvider;

  beforeEach(() => {
    mockProvider = new MockProvider(100); // Short delay for tests
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    test('should have correct name', () => {
      expect(mockProvider.name).toBe('mock');
    });

    test('should be always available', async () => {
      const isAvailable = await mockProvider.isAvailable();
      expect(isAvailable).toBe(true);
    });

    test('should respect custom delay', async () => {
      const slowProvider = new MockProvider(200);
      const start = Date.now();
      
      await slowProvider.generate({
        language: 'python',
        type: 'function',
        description: 'Test function',
        prompt: 'Create a test function'
      });
      
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Code Generation', () => {
    test('should generate Python function code', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a hello world function',
        prompt: 'Create a hello world function'
      };

      const response = await mockProvider.generate(request);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^mock_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('def'),
        code: expect.stringContaining('def'),
        tests: expect.stringContaining('test_'),
        documentation: expect.stringContaining('# Hello World Function'),
        language: 'python',
        explanation: expect.stringContaining('function'),
        suggestions: expect.arrayContaining([expect.any(String)]),
        timestamp: expect.any(Date),
        provider: 'mock'
      });
    });

    test('should generate Python class code', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'class',
        description: 'create a data manager class',
        prompt: 'Create a data manager class'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('class DataManager');
      expect(response.code).toContain('def __init__');
      expect(response.code).toContain('def get_data');
      expect(response.code).toContain('def set_data');
    });

    test('should generate Python algorithm code', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'algorithm',
        description: 'sorting algorithm',
        prompt: 'Create a sorting algorithm'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('def sorting_algorithm');
      expect(response.code).toContain('Time Complexity');
      expect(response.code).toContain('Space Complexity');
    });

    test('should generate JavaScript function code', async () => {
      const request: CodeGenerationRequest = {
        language: 'javascript',
        type: 'function',
        description: 'create a data processor function',
        prompt: 'Create a data processor function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('function dataProcessor');
      expect(response.code).toContain('/**');
      expect(response.code).toContain('@param');
      expect(response.code).toContain('@returns');
      expect(response.code).toContain('export');
    });

    test('should generate JavaScript class code', async () => {
      const request: CodeGenerationRequest = {
        language: 'javascript',
        type: 'class',
        description: 'create a user manager class',
        prompt: 'Create a user manager class'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('class UserManager');
      expect(response.code).toContain('constructor');
      expect(response.code).toContain('getData()');
      expect(response.code).toContain('setData(');
    });

    test('should generate React component code', async () => {
      const request: CodeGenerationRequest = {
        language: 'javascript',
        type: 'class',
        description: 'create a user profile component',
        prompt: 'Create a user profile component'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('const UserProfile');
      expect(response.code).toContain('useState');
      expect(response.code).toContain('useEffect');
      expect(response.code).toContain('PropTypes');
      expect(response.code).toContain('export default');
    });

    test('should generate C++ function code', async () => {
      const request: CodeGenerationRequest = {
        language: 'cpp',
        type: 'function',
        description: 'create a string parser function',
        prompt: 'Create a string parser function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('std::string stringParser');
      expect(response.code).toContain('#include');
      expect(response.code).toContain('/**');
      expect(response.code).toContain('@param');
      expect(response.code).toContain('@return');
    });

    test('should generate C++ class code', async () => {
      const request: CodeGenerationRequest = {
        language: 'cpp',
        type: 'class',
        description: 'create a string parser class',
        prompt: 'Create a string parser class'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('class StringParser');
      expect(response.code).toContain('public:');
      expect(response.code).toContain('private:');
      expect(response.code).toContain('StringParser(');
      expect(response.code).toContain('~StringParser()');
    });

    test('should generate default code for unsupported language', async () => {
      const request: CodeGenerationRequest = {
        language: 'unsupported' as any,
        type: 'function',
        description: 'test function',
        prompt: 'Create a test function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('// Code generation not implemented for this language');
    });

    test('should include tests in generation response', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a calculator function',
        prompt: 'Create a calculator function'
      };

      const response = await mockProvider.generate(request);

      expect(response.tests).toContain('import unittest');
      expect(response.tests).toContain('class TestCalculator');
      expect(response.tests).toContain('def test_calculator');
      expect(response.tests).toContain('self.assert');
    });

    test('should include documentation in generation response', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a data validator function',
        prompt: 'Create a data validator function'
      };

      const response = await mockProvider.generate(request);

      expect(response.documentation).toContain('# DataValidator Documentation');
      expect(response.documentation).toContain('## Overview');
      expect(response.documentation).toContain('## Features');
      expect(response.documentation).toContain('## Usage Examples');
    });
  });

  describe('Code Explanation', () => {
    test('should explain Python code', async () => {
      const code = 'def add(a, b): return a + b';
      const language: SupportedLanguage = 'python';

      const response = await mockProvider.explain(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^mock_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('python'),
        language: 'python',
        explanation: expect.stringContaining('programming concepts'),
        suggestions: expect.arrayContaining([
          'Consider adding error handling',
          'Add more descriptive variable names',
          'Include unit tests for better reliability'
        ]),
        timestamp: expect.any(Date),
        provider: 'mock'
      });
    });

    test('should explain JavaScript code', async () => {
      const code = 'const multiply = (a, b) => a * b;';
      const language: SupportedLanguage = 'javascript';

      const response = await mockProvider.explain(code, language);

      expect(response.language).toBe('javascript');
      expect(response.content).toContain('javascript');
    });

    test('should explain C++ code', async () => {
      const code = 'int divide(int a, int b) { return a / b; }';
      const language: SupportedLanguage = 'cpp';

      const response = await mockProvider.explain(code, language);

      expect(response.language).toBe('cpp');
      expect(response.content).toContain('cpp');
    });
  });

  describe('Code Improvement', () => {
    test('should provide code improvements', async () => {
      const code = 'def bad_function(x): return x + 1';
      const language: SupportedLanguage = 'python';

      const response = await mockProvider.improve(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^mock_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('Improvement Suggestions'),
        language: 'python',
        explanation: 'Here are some suggested improvements to make your code more efficient and maintainable.',
        suggestions: expect.arrayContaining([
          'Optimize algorithm complexity',
          'Improve code readability',
          'Follow language-specific best practices',
          'Add comprehensive error handling'
        ]),
        timestamp: expect.any(Date),
        provider: 'mock'
      });
    });

    test('should include language-specific improvements', async () => {
      const code = 'function test() { var x = 1; }';
      const language: SupportedLanguage = 'javascript';

      const response = await mockProvider.improve(code, language);

      expect(response.content).toContain('Modern Syntax');
      expect(response.content).toContain('ES6+');
      expect(response.content).toContain('async/await');
    });
  });

  describe('Code Debugging', () => {
    test('should provide debugging information', async () => {
      const code = 'def broken_function():\n    print("debug")\n    # TODO: fix this';
      const language: SupportedLanguage = 'python';

      const response = await mockProvider.debug(code, language);

      expect(response).toMatchObject({
        id: expect.stringMatching(/^mock_\d+_[a-z0-9]+$/),
        content: expect.stringContaining('Debug Analysis'),
        language: 'python',
        explanation: 'Code analysis completed. Here are potential issues and debugging suggestions.',
        suggestions: expect.arrayContaining([
          'Check for syntax errors',
          'Verify variable scope',
          'Review logic flow',
          'Test edge cases'
        ]),
        timestamp: expect.any(Date),
        provider: 'mock'
      });
    });

    test('should detect TODO comments', async () => {
      const code = 'def test():\n    # TODO: implement this\n    pass';
      const language: SupportedLanguage = 'python';

      const response = await mockProvider.debug(code, language);

      expect(response.content).toContain('TODO/FIXME comment found');
    });

    test('should detect print statements', async () => {
      const code = 'def test():\n    print("debug info")\n    return True';
      const language: SupportedLanguage = 'python';

      const response = await mockProvider.debug(code, language);

      expect(response.content).toContain('Consider removing debug print statements');
    });

    test('should provide language-specific debugging tips', async () => {
      const code = 'var x = 1; console.log(x);';
      const language: SupportedLanguage = 'javascript';

      const response = await mockProvider.debug(code, language);

      expect(response.content).toContain("Consider using 'let' or 'const' instead of 'var'");
    });
  });

  describe('Helper Methods', () => {
    test('should extract function names from descriptions', () => {
      // Access private method for testing
      const extractFunctionName = (mockProvider as any).extractFunctionName;
      
      expect(extractFunctionName('create a user authentication function')).toBe('create_user_authentication');
      expect(extractFunctionName('sort the array')).toBe('sort_array');
      expect(extractFunctionName('calculate total price')).toBe('calculate_total_price');
      expect(extractFunctionName('')).toBe('generated_function');
    });

    test('should extract class names from descriptions', () => {
      const extractClassName = (mockProvider as any).extractClassName;
      
      expect(extractClassName('create a user manager class')).toBe('UserManager');
      expect(extractClassName('data processor service')).toBe('DataProcessor');
      expect(extractClassName('api client handler')).toBe('ApiClient');
      expect(extractClassName('')).toBe('GeneratedClass');
    });

    test('should generate unique IDs', () => {
      const generateId = (mockProvider as any).generateId;
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toMatch(/^mock_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^mock_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should simulate delay correctly', async () => {
      const provider = new MockProvider(50);
      const start = Date.now();
      
      await (provider as any).simulateDelay();
      
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty descriptions', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: '',
        prompt: 'Create a function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('def generated_function');
    });

    test('should handle special characters in descriptions', async () => {
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: 'create a function with @#$%^&*() characters!',
        prompt: 'Create a function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('def create_function_with');
    });

    test('should handle very long descriptions', async () => {
      const longDescription = 'create a very long function name with many words that might cause issues in code generation and should be handled gracefully by the mock provider implementation';
      
      const request: CodeGenerationRequest = {
        language: 'python',
        type: 'function',
        description: longDescription,
        prompt: 'Create a function'
      };

      const response = await mockProvider.generate(request);

      expect(response.code).toContain('def create_very_long');
    });

    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        language: 'python' as const,
        type: 'function',
        description: `test function ${i}`,
        prompt: `Create test function ${i}`
      }));

      const promises = requests.map(request => mockProvider.generate(request));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach((response) => {
        expect(response.code).toContain('def test_function');
        expect(response.id).toMatch(/^mock_\d+_[a-z0-9]+$/);
      });
    });
  });
});