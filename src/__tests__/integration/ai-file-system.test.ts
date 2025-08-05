import { AIService } from '../../services/ai/AIService';
import { MockProvider } from '../../services/ai/providers/MockProvider';
import { FileSystemService } from '../../services/storage/FileSystemService';
import { FileAnalysisService } from '../../services/storage/FileAnalysisService';
import { AIServiceConfig } from '../../services/ai/types';
import { mockIndexedDB, MockIDBDatabase } from '../mocks/indexeddb';
import mockFileSystemAPI from '../mocks/file-system-api';
import { flushPromises } from '../utils/test-utils';

describe('AI Service - File System Integration', () => {
  let aiService: AIService;
  let fileSystemService: FileSystemService;
  let fileAnalysisService: FileAnalysisService;
  let mockDB: MockIDBDatabase;

  beforeEach(async () => {
    // Setup mock database
    mockDB = new MockIDBDatabase('CodingAssistantDB', 1);
    mockIndexedDB.open.mockImplementation(() => {
      const request = new (mockIndexedDB as any).MockIDBOpenDBRequest(mockDB);
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request });
        }
        if (request.onsuccess) {
          request.onsuccess({ target: request });
        }
      }, 0);
      return request;
    });

    // Initialize services
    const config: AIServiceConfig = {
      defaultProvider: 'mock',
      providers: {
        mock: { enabled: true, config: {} }
      },
      rateLimiting: {
        requestsPerMinute: 100,
        requestsPerHour: 1000
      },
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 1000
      }
    };

    aiService = new AIService(config);
    aiService.registerProvider(new MockProvider(50)); // Fast for tests

    // Reset singleton instances
    (FileSystemService as any).instance = undefined;
    (FileAnalysisService as any).instance = undefined;
    
    fileSystemService = FileSystemService.getInstance();
    fileAnalysisService = FileAnalysisService.getInstance();

    await flushPromises();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Code Generation and File Management', () => {
    test('should generate code, analyze it, and save to file system', async () => {
      // Step 1: Generate code using AI service
      const codeRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'calculate factorial of a number',
        prompt: 'Create a factorial function'
      };

      const generatedCode = await aiService.generateCode(codeRequest);
      expect(generatedCode).toBeDefined();
      expect(generatedCode.code).toContain('def');
      expect(generatedCode.language).toBe('python');

      // Step 2: Create file with generated code
      const fileName = 'factorial.py';
      const projectFile = fileSystemService.createFile(fileName, generatedCode.code, 'python');
      
      expect(projectFile.name).toBe(fileName);
      expect(projectFile.content).toBe(generatedCode.code);
      expect(projectFile.language).toBe('python');

      // Step 3: Analyze the generated code
      const analysis = fileAnalysisService.analyzeFile(generatedCode.code, 'python');
      
      expect(analysis.language).toBe('python');
      expect(analysis.functions.length).toBeGreaterThan(0);
      expect(analysis.complexity).toMatch(/^(low|medium|high)$/);
      expect(analysis.readability).toBeGreaterThan(0);
      expect(analysis.syntax.isValid).toBe(true);

      // Step 4: Mock file system save operation
      mockFileSystemAPI.mockShowSaveFilePicker.mockResolvedValue(
        new mockFileSystemAPI.MockFileSystemFileHandle(fileName)
      );

      await expect(fileSystemService.saveFile(projectFile)).resolves.not.toThrow();
      expect(projectFile.isModified).toBe(false);
    });

    test('should handle code improvement workflow', async () => {
      // Start with basic code
      const basicCode = 'def add(a, b): return a + b';
      
      // Step 1: Analyze original code
      const originalAnalysis = fileAnalysisService.analyzeFile(basicCode, 'python');
      expect(originalAnalysis.functions).toContain('add');
      
      // Step 2: Get AI improvement suggestions
      const improvedResponse = await aiService.improveCode(basicCode, 'python');
      expect(improvedResponse).toBeDefined();
      expect(improvedResponse.content).toContain('improved');
      
      // Step 3: Create file with improved code
      const improvedFile = fileSystemService.createFile(
        'improved_add.py',
        improvedResponse.content,
        'python'
      );
      
      // Step 4: Analyze improved code
      const improvedAnalysis = fileAnalysisService.analyzeFile(
        improvedResponse.content,
        'python'
      );
      
      expect(improvedAnalysis.language).toBe('python');
      expect(improvedAnalysis.readability).toBeGreaterThan(0);
      
      // Step 5: Save both versions
      const originalFile = fileSystemService.createFile('original_add.py', basicCode, 'python');
      
      await fileSystemService.addToRecentFiles(originalFile);
      await fileSystemService.addToRecentFiles(improvedFile);
      
      const recentFiles = await fileSystemService.getRecentFiles();
      expect(recentFiles.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle debugging workflow', async () => {
      // Code with potential issues
      const buggyCode = `def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)`;

      // Step 1: Initial analysis
      const analysis = fileAnalysisService.analyzeFile(buggyCode, 'python');
      expect(analysis.functions).toContain('calculate_average');
      
      // Step 2: Get debugging suggestions
      const debugResponse = await aiService.debugCode(buggyCode, 'python');
      expect(debugResponse).toBeDefined();
      expect(debugResponse.content).toContain('debug');
      
      // Step 3: Create file with debug notes
      const debuggedFile = fileSystemService.createFile(
        'debugged_average.py',
        `${buggyCode}\n\n# Debug notes:\n# ${debugResponse.content}`,
        'python'
      );
      
      expect(debuggedFile.content).toContain('Debug notes');
      
      // Step 4: Create backup version
      const backup = await fileSystemService.createBackup(debuggedFile);
      expect(backup.fileId).toBe(debuggedFile.id);
      expect(backup.content).toBe(debuggedFile.content);
    });
  });

  describe('Multi-Language Code Generation', () => {
    test('should generate and manage files in different languages', async () => {
      const languages: Array<{ lang: 'python' | 'javascript' | 'cpp', ext: string }> = [
        { lang: 'python', ext: '.py' },
        { lang: 'javascript', ext: '.js' },
        { lang: 'cpp', ext: '.cpp' }
      ];

      const generatedFiles = [];

      for (const { lang, ext } of languages) {
        // Generate code for each language
        const request = {
          language: lang,
          type: 'function' as const,
          description: 'sort an array of numbers',
          prompt: `Create a sorting function in ${lang}`
        };

        const response = await aiService.generateCode(request);
        expect(response.language).toBe(lang);
        expect(response.code).toBeDefined();

        // Create file
        const fileName = `sort_function${ext}`;
        const file = fileSystemService.createFile(fileName, response.code, lang);
        generatedFiles.push(file);

        // Analyze the code
        const analysis = fileAnalysisService.analyzeFile(response.code, lang);
        expect(analysis.language).toBe(lang);
        expect(analysis.functions.length).toBeGreaterThan(0);
      }

      expect(generatedFiles).toHaveLength(3);
      
      // Test language detection
      generatedFiles.forEach(file => {
        const detectedLanguage = fileAnalysisService.detectLanguage(file.name);
        expect(detectedLanguage).toBe(file.language);
      });
    });

    test('should handle cross-language code explanation', async () => {
      const codeSnippets = [
        { code: 'def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)', lang: 'python' as const },
        { code: 'const fibonacci = n => n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2);', lang: 'javascript' as const },
        { code: 'int fibonacci(int n) { return n <= 1 ? n : fibonacci(n-1) + fibonacci(n-2); }', lang: 'cpp' as const }
      ];

      for (const { code, lang } of codeSnippets) {
        // Explain code
        const explanation = await aiService.explainCode(code, lang);
        expect(explanation.content).toContain('fibonacci');
        expect(explanation.language).toBe(lang);

        // Analyze code structure
        const analysis = fileAnalysisService.analyzeFile(code, lang);
        expect(analysis.functions).toContain('fibonacci');
        expect(analysis.complexity).toMatch(/^(low|medium|high)$/);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle AI service errors gracefully with file system operations', async () => {
      // Create a mock provider that fails
      const failingProvider = new MockProvider(10);
      jest.spyOn(failingProvider, 'generate').mockRejectedValue(new Error('AI service failed'));
      
      aiService.registerProvider(failingProvider);

      // Try to generate code with failing service
      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'test function',
        prompt: 'Create a test function'
      };

      await expect(aiService.generateCode(request)).rejects.toThrow('Maximum retries exceeded');

      // File system should still work
      const fallbackFile = fileSystemService.createFile(
        'fallback.py',
        '# Fallback code when AI fails\nprint("Hello, World!")',
        'python'
      );

      expect(fallbackFile).toBeDefined();
      expect(fallbackFile.content).toContain('Fallback code');

      // Analysis should still work
      const analysis = fileAnalysisService.analyzeFile(fallbackFile.content || '', 'python');
      expect(analysis.syntax.isValid).toBe(true);
    });

    test('should handle file system errors with AI operations still functional', async () => {
      // Mock file system operation failure
      jest.spyOn(fileSystemService, 'saveFile').mockRejectedValue(new Error('Save failed'));

      // Generate code (should still work)
      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'test function',
        prompt: 'Create a test function'
      };

      const response = await aiService.generateCode(request);
      expect(response).toBeDefined();

      // Create file in memory (should work)
      const file = fileSystemService.createFile('test.py', response.code, 'python');
      expect(file).toBeDefined();

      // Save operation should fail
      await expect(fileSystemService.saveFile(file)).rejects.toThrow('Save failed');

      // But analysis should still work
      const analysis = fileAnalysisService.analyzeFile(file.content || '', 'python');
      expect(analysis).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle multiple concurrent operations efficiently', async () => {
      const concurrentOperations = [];

      // Generate multiple code snippets concurrently
      for (let i = 0; i < 5; i++) {
        const operation = async () => {
          const request = {
            language: 'python' as const,
            type: 'function' as const,
            description: `test function ${i}`,
            prompt: `Create test function ${i}`
          };

          const response = await aiService.generateCode(request);
          const file = fileSystemService.createFile(`test_${i}.py`, response.code, 'python');
          const analysis = fileAnalysisService.analyzeFile(file.content || '', 'python');

          return { response, file, analysis };
        };

        concurrentOperations.push(operation());
      }

      const results = await Promise.all(concurrentOperations);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.response).toBeDefined();
        expect(result.file.name).toBe(`test_${index}.py`);
        expect(result.analysis.language).toBe('python');
      });
    });

    test('should manage memory efficiently with large code files', async () => {
      // Generate large code content
      const largeCode = [
        '# Large Python file',
        'import sys',
        'import os',
        '',
        'class DataProcessor:',
        '    def __init__(self):',
        '        self.data = []',
        ''
      ];

      // Add many functions
      for (let i = 0; i < 100; i++) {
        largeCode.push(`    def process_${i}(self, data):`);
        largeCode.push(`        # Process data ${i}`);
        largeCode.push(`        return data * ${i}`);
        largeCode.push('');
      }

      const largeCodeContent = largeCode.join('\n');

      // Create and analyze large file
      const startTime = Date.now();
      
      const largeFile = fileSystemService.createFile('large_file.py', largeCodeContent, 'python');
      const analysis = fileAnalysisService.analyzeFile(largeCodeContent, 'python');
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(largeFile).toBeDefined();
      expect(analysis.functions.length).toBeGreaterThan(90);
      expect(analysis.lines).toBeGreaterThan(400);
      expect(processingTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Workflow Integration', () => {
    test('should support complete development workflow', async () => {
      // Step 1: Create project
      const project = await fileSystemService.openProject('/test/calculator-app');
      expect(project.name).toBe('calculator-app');

      // Step 2: Generate main module code
      const mainModuleRequest = {
        language: 'python' as const,
        type: 'class' as const,
        description: 'calculator with basic arithmetic operations',
        prompt: 'Create a Calculator class'
      };

      const mainCode = await aiService.generateCode(mainModuleRequest);
      const mainFile = fileSystemService.createFile('calculator.py', mainCode.code, 'python');

      // Step 3: Generate test code
      const testRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'unit tests for calculator class',
        prompt: 'Create unit tests for Calculator'
      };

      const testCode = await aiService.generateCode(testRequest);
      const testFile = fileSystemService.createFile('test_calculator.py', testCode.code, 'python');

      // Step 4: Analyze both files
      const mainAnalysis = fileAnalysisService.analyzeFile(mainFile.content || '', 'python');
      const testAnalysis = fileAnalysisService.analyzeFile(testFile.content || '', 'python');

      expect(mainAnalysis.classes.length).toBeGreaterThan(0);
      expect(testAnalysis.functions.length).toBeGreaterThan(0);

      // Step 5: Create backups
      const mainBackup = await fileSystemService.createBackup(mainFile);
      const testBackup = await fileSystemService.createBackup(testFile);

      expect(mainBackup.fileId).toBe(mainFile.id);
      expect(testBackup.fileId).toBe(testFile.id);

      // Step 6: Save project
      await fileSystemService.saveProject(project);

      // Step 7: Add to recent files
      await fileSystemService.addToRecentFiles(mainFile);
      await fileSystemService.addToRecentFiles(testFile);

      const recentFiles = await fileSystemService.getRecentFiles();
      expect(recentFiles.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle iterative code improvement cycle', async () => {
      let currentCode = 'def add(a, b): return a + b';
      const improvementHistory = [];

      // Perform 3 iterations of improvement
      for (let iteration = 0; iteration < 3; iteration++) {
        // Analyze current code
        const analysis = fileAnalysisService.analyzeFile(currentCode, 'python');
        
        // Get improvement suggestions
        const improvement = await aiService.improveCode(currentCode, 'python');
        
        // Create file for this iteration
        const file = fileSystemService.createFile(
          `add_v${iteration + 1}.py`,
          improvement.content,
          'python'
        );

        // Store improvement history
        improvementHistory.push({
          iteration: iteration + 1,
          analysis,
          improvement,
          file
        });

        // Update current code for next iteration
        currentCode = improvement.content;
      }

      expect(improvementHistory).toHaveLength(3);
      
      // Each iteration should show some kind of improvement information
      improvementHistory.forEach((entry, index) => {
        expect(entry.iteration).toBe(index + 1);
        expect(entry.analysis.language).toBe('python');
        expect(entry.improvement.content).toBeDefined();
        expect(entry.file.name).toBe(`add_v${index + 1}.py`);
      });
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain data consistency across service boundaries', async () => {
      // Generate code
      const request = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'data validation function',
        prompt: 'Create a data validation function'
      };

      const response = await aiService.generateCode(request);
      
      // Create file
      const originalFile = fileSystemService.createFile(
        'validator.py',
        response.code,
        'python'
      );

      // Analyze original
      const originalAnalysis = fileAnalysisService.analyzeFile(
        originalFile.content || '',
        originalFile.language as 'python'
      );

      // Create backup
      const backup = await fileSystemService.createBackup(originalFile);

      // Modify file content
      const modifiedContent = `${originalFile.content || ''}\n\n# Modified version`;
      originalFile.content = modifiedContent;
      originalFile.isModified = true;

      // Analyze modified
      const modifiedAnalysis = fileAnalysisService.analyzeFile(
        originalFile.content || '',
        originalFile.language as 'python'
      );

      // Verify data consistency
      expect(backup.content).not.toBe(originalFile.content);
      expect(backup.content).toBe(response.code);
      expect(originalAnalysis.lines).toBeLessThan(modifiedAnalysis.lines);
      expect(originalFile.isModified).toBe(true);

      // Restore from backup
      const restoredFile = await fileSystemService.restoreVersion(backup.id);
      
      expect(restoredFile.content).toBe(backup.content);
      expect(restoredFile.isModified).toBe(true); // Marked as modified after restore
    });

    test('should handle service state consistency during errors', async () => {
      // Start with working state
      const workingRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'working function',
        prompt: 'Create a working function'
      };

      const workingResponse = await aiService.generateCode(workingRequest);
      const workingFile = fileSystemService.createFile('working.py', workingResponse.code, 'python');

      // Verify initial state is good
      expect(workingFile.content).toBe(workingResponse.code);
      expect(workingFile.isModified).toBe(false);

      // Simulate error in file system
      jest.spyOn(fileSystemService, 'saveFile').mockRejectedValueOnce(new Error('Save failed'));

      // Try to save (should fail)
      await expect(fileSystemService.saveFile(workingFile)).rejects.toThrow('Save failed');

      // File state should remain consistent
      expect(workingFile.content).toBe(workingResponse.code);
      expect(workingFile.isModified).toBe(false); // Should not change due to failed save

      // Restore original method and try again
      (fileSystemService.saveFile as jest.Mock).mockRestore();
      
      // Should work now
      await expect(fileSystemService.saveFile(workingFile)).resolves.not.toThrow();
    });
  });
});