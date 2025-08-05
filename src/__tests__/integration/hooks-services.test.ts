import { renderHook, act } from '@testing-library/react-hooks';
import { useAI } from '../../hooks/useAI';
import { useFileManager } from '../../hooks/useFileManager';
import { fileSystemService } from '../../services/storage';
import { mockIndexedDB, MockIDBDatabase } from '../mocks/indexeddb';
import { createMockFile, createMockProject, flushPromises } from '../utils/test-utils';

// Mock the file system service
jest.mock('../../services/storage', () => ({
  fileSystemService: {
    openFile: jest.fn(),
    openFiles: jest.fn(),
    saveFile: jest.fn(),
    saveFileAs: jest.fn(),
    createFile: jest.fn(),
    openProject: jest.fn(),
    addToRecentFiles: jest.fn(),
    createBackup: jest.fn(),
    enableAutoSave: jest.fn(),
    disableAutoSave: jest.fn()
  }
}));

const mockFileSystemService = fileSystemService as jest.Mocked<typeof fileSystemService>;

describe('Hooks - Services Integration', () => {
  let mockDB: MockIDBDatabase;

  beforeEach(async () => {
    jest.clearAllMocks();
    
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

    // Setup file system service defaults
    mockFileSystemService.createFile.mockImplementation((name, content, language) => 
      createMockFile({ 
        id: `file-${Date.now()}`,
        name,
        content: content || '',
        language: language || 'python'
      }) as any
    );

    mockFileSystemService.addToRecentFiles.mockResolvedValue();
    mockFileSystemService.enableAutoSave.mockImplementation(() => {});
    mockFileSystemService.disableAutoSave.mockImplementation(() => {});
    mockFileSystemService.saveFile.mockResolvedValue();
    mockFileSystemService.createBackup.mockResolvedValue({} as any);

    await flushPromises();
  });

  describe('useAI and useFileManager Integration', () => {
    test('should generate code and create file in integrated workflow', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      // Wait for AI service initialization
      await waitForAI();

      // Step 1: Generate code using AI hook
      const codeRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'calculate and display fibonacci numbers',
        prompt: 'Create a function that calculates fibonacci numbers and prints them'
      };      let generatedResponse: any;
      await act(async () => {
        generatedResponse = await aiResult.current.generateCode(codeRequest);
      });

      expect(generatedResponse).toBeDefined();
      expect(generatedResponse.code).toContain('def');
      expect(aiResult.current.state.lastResponse).toBe(generatedResponse);

      // Step 2: Create file with generated code using file manager hook
      let createdFile: any;
      act(() => {
        createdFile = fileResult.current.createNewFile(
          'fibonacci.py',
          generatedResponse.code,
          'python'
        );
      });

      expect(createdFile).toBeDefined();
      expect(createdFile.content).toBe(generatedResponse.code);
      expect(fileResult.current.openFiles).toHaveLength(1);
      expect(fileResult.current.activeFile).toBe(createdFile);

      // Verify service interactions
      expect(mockFileSystemService.createFile).toHaveBeenCalledWith(
        'fibonacci.py',
        generatedResponse.code,
        'python'
      );
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalled();
    });

    test('should handle code improvement workflow across hooks', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Step 1: Create initial file
      const originalCode = 'def add(a, b): return a + b';
      let originalFile: any;
      
      act(() => {
        originalFile = fileResult.current.createNewFile('add.py', originalCode, 'python');
      });

      expect(fileResult.current.openFiles).toHaveLength(1);

      // Step 2: Get AI improvement
      let improvedResponse: any;
      await act(async () => {
        improvedResponse = await aiResult.current.improveCode(originalCode, 'python');
      });

      expect(improvedResponse).toBeDefined();
      expect(aiResult.current.state.lastResponse).toBe(improvedResponse);

      // Step 3: Update file content with improved code
      act(() => {
        fileResult.current.updateFileContent(originalFile.id, improvedResponse.content);
      });

      expect(fileResult.current.openFiles[0].content).toBe(improvedResponse.content);
      expect(fileResult.current.openFiles[0].isModified).toBe(true);

      // Step 4: Save improved file
      await act(async () => {
        await fileResult.current.saveFile(fileResult.current.openFiles[0]);
      });

      expect(mockFileSystemService.saveFile).toHaveBeenCalled();
      expect(fileResult.current.openFiles[0].isModified).toBe(false);
    });

    test('should handle debugging workflow with hooks integration', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Step 1: Open existing file with potential issues
      const buggyCode = `def divide(a, b):
    return a / b  # No zero division check`;

      let buggyFile: any;
      act(() => {
        buggyFile = fileResult.current.createNewFile('divide.py', buggyCode, 'python');
      });

      // Step 2: Debug the code using AI
      let debugResponse: any;
      await act(async () => {
        debugResponse = await aiResult.current.debugCode(buggyCode, 'python');
      });

      expect(debugResponse).toBeDefined();
      expect(debugResponse.content).toContain('debug');

      // Step 3: Create debug notes file
      const debugNotes = `${buggyCode}\n\n# Debug Analysis:\n# ${debugResponse.content}`;
      
      let debugFile: any;
      act(() => {
        debugFile = fileResult.current.createNewFile('divide_debug.py', debugNotes, 'python');
      });

      expect(fileResult.current.openFiles).toHaveLength(2);
      expect(debugFile.content).toContain('Debug Analysis');

      // Step 4: Switch between files
      act(() => {
        fileResult.current.switchToFile(buggyFile);
      });

      expect(fileResult.current.activeFileId).toBe(buggyFile.id);

      act(() => {
        fileResult.current.switchToFile(debugFile);
      });

      expect(fileResult.current.activeFileId).toBe(debugFile.id);
    });

    test('should handle error scenarios across hooks', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock', autoRetry: false })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Step 1: Simulate AI service error
      jest.spyOn(aiResult.current.service!, 'generateCode').mockRejectedValue(
        new Error('AI service temporarily unavailable')
      );

      const codeRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'test function',
        prompt: 'Create a test function'
      };

      let generatedResponse: any;
      await act(async () => {
        generatedResponse = await aiResult.current.generateCode(codeRequest);
      });

      expect(generatedResponse).toBe(null);
      expect(aiResult.current.state.error).toContain('AI service temporarily unavailable');

      // Step 2: File manager should still work
      let fallbackFile: any;
      act(() => {
        fallbackFile = fileResult.current.createNewFile(
          'fallback.py',
          '# Fallback code when AI fails\nprint("Hello, World!")',
          'python'
        );
      });

      expect(fallbackFile).toBeDefined();
      expect(fileResult.current.openFiles).toHaveLength(1);
      expect(fileResult.current.error).toBe(null);

      // Step 3: Clear AI error and try file save error
      act(() => {
        aiResult.current.clearError();
      });

      expect(aiResult.current.state.error).toBe(null);

      // Simulate file save error
      mockFileSystemService.saveFile.mockRejectedValue(new Error('Disk full'));

      await act(async () => {
        await fileResult.current.saveFile(fallbackFile);
      });

      expect(fileResult.current.error).toContain('Failed to save file: Disk full');
    });
  });

  describe('Complex Workflows', () => {
    test('should handle multi-file project workflow', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Step 1: Create project
      const mockProject = createMockProject({ id: 'test-project', name: 'Calculator App' });
      mockFileSystemService.openProject.mockResolvedValue(mockProject as any);

      let project: any;
      await act(async () => {
        project = await fileResult.current.openProject('/projects/calculator');
      });

      expect(project).toBe(mockProject);
      expect(fileResult.current.activeProject).toBe(mockProject);

      // Step 2: Generate main module
      const mainRequest = {
        language: 'python' as const,
        type: 'class' as const,
        description: 'calculator with basic operations',
        prompt: 'Create a Calculator class'
      };

      let mainResponse: any;
      await act(async () => {
        mainResponse = await aiResult.current.generateCode(mainRequest);
      });

      act(() => {
        fileResult.current.createNewFile('calculator.py', mainResponse.code, 'python');
      });

      // Step 3: Generate test module
      const testRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'unit tests for calculator',
        prompt: 'Create unit tests'
      };

      let testResponse: any;
      await act(async () => {
        testResponse = await aiResult.current.generateCode(testRequest);
      });

      act(() => {
        fileResult.current.createNewFile('test_calculator.py', testResponse.code, 'python');
      });

      // Step 4: Generate documentation
      let docResponse: any;
      await act(async () => {
        docResponse = await aiResult.current.explainCode(mainResponse.code, 'python');
      });

      act(() => {
        fileResult.current.createNewFile('README.md', docResponse.content, 'python');
      });

      // Verify all files are managed
      expect(fileResult.current.openFiles).toHaveLength(3);
      expect(fileResult.current.openFiles.map(f => f.name)).toEqual([
        'calculator.py',
        'test_calculator.py',
        'README.md'
      ]);

      // Step 5: Save all files
      for (const file of fileResult.current.openFiles) {
        await act(async () => {
          await fileResult.current.saveFile(file);
        });
      }

      expect(mockFileSystemService.saveFile).toHaveBeenCalledTimes(3);
    });

    test('should handle streaming code generation with file management', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock', enableStreaming: true })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Mock streaming provider
      const mockStreamProvider = {
        name: 'mock-stream',
        generateStream: jest.fn().mockImplementation(async function* () {
          yield 'def ';
          yield 'stream_function';
          yield '():\n';
          yield '    print("Streaming code generation")';
        }),
        generate: jest.fn(),
        explain: jest.fn(),
        improve: jest.fn(),
        debug: jest.fn(),
        isAvailable: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(aiResult.current.service!, 'getProvider').mockReturnValue(mockStreamProvider as any);

      // Step 1: Create file for streaming content
      let streamFile: any;
      act(() => {
        streamFile = fileResult.current.createNewFile('stream_code.py', '', 'python');
      });

      // Step 2: Start streaming generation
      const streamRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'streaming function',
        prompt: 'Create a streaming function'
      };

      let streamedContent = '';
      await act(async () => {
        const stream = await aiResult.current.generateCodeStream(streamRequest);
        if (stream) {
          for await (const chunk of stream) {
            streamedContent += chunk;
            // Update file content as stream progresses
            fileResult.current.updateFileContent(streamFile.id, streamedContent);
          }
        }
      });

      // Verify streaming worked
      expect(streamedContent).toBe('def stream_function():\n    print("Streaming code generation")');
      expect(fileResult.current.openFiles[0].content).toBe(streamedContent);
      expect(fileResult.current.openFiles[0].isModified).toBe(true);
    });

    test('should handle auto-save integration with AI operations', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => 
        useFileManager({ autoSaveInterval: 1000 })
      );

      await waitForAI();

      // Step 1: Create file with auto-save enabled
      let autoSaveFile: any;
      act(() => {
        autoSaveFile = fileResult.current.createNewFile('auto_save.py', 'initial content', 'python');
      });

      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith(autoSaveFile.id, 1000);

      // Step 2: Generate code and update file
      const codeRequest = {
        language: 'python' as const,
        type: 'function' as const,
        description: 'auto-saved function',
        prompt: 'Create an auto-saved function'
      };

      let generatedResponse: any;
      await act(async () => {
        generatedResponse = await aiResult.current.generateCode(codeRequest);
      });

      act(() => {
        fileResult.current.updateFileContent(autoSaveFile.id, generatedResponse.code);
      });

      expect(fileResult.current.openFiles[0].isModified).toBe(true);

      // Step 3: Toggle auto-save off
      act(() => {
        fileResult.current.toggleAutoSave();
      });

      expect(fileResult.current.autoSaveEnabled).toBe(false);
      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledWith(autoSaveFile.id);

      // Step 4: Toggle auto-save back on
      act(() => {
        fileResult.current.toggleAutoSave();
      });

      expect(fileResult.current.autoSaveEnabled).toBe(true);
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith(autoSaveFile.id, 1000);
    });
  });

  describe('State Synchronization', () => {
    test('should maintain consistent state across hooks during concurrent operations', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Create multiple files
      const files: any[] = [];
      for (let i = 0; i < 3; i++) {
        act(() => {
          const file = fileResult.current.createNewFile(`file_${i}.py`, `# File ${i}`, 'python');
          files.push(file);
        });
      }

      expect(fileResult.current.openFiles).toHaveLength(3);

      // Perform concurrent AI operations
      const operations = files.map(async (file, index) => {
        const request = {
          language: 'python' as const,
          type: 'function' as const,
          description: `function for file ${index}`,
          prompt: `Create function ${index}`
        };

        const response = await aiResult.current.generateCode(request);
        return { file, response };
      });

      const results = await Promise.all(operations);

      // Verify all operations completed
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.response).toBeDefined();
        expect(result.file.name).toBe(`file_${index}.py`);
      });

      // Update files with generated content
      results.forEach(({ file, response }) => {
        if (response) {
          act(() => {
            fileResult.current.updateFileContent(file.id, response.code);
          });
        }
      });

      // Verify all files are updated
      fileResult.current.openFiles.forEach((file, index) => {
        expect(file.isModified).toBe(true);
        if (results[index].response) {
          expect(file.content).toBe(results[index].response.code);
        }
      });
    });

    test('should handle cleanup properly when hooks are unmounted', async () => {
      const { waitForNextUpdate: waitForAI, unmount: unmountAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult, unmount: unmountFile } = renderHook(() => useFileManager());

      await waitForAI();

      // Create some files
      act(() => {
        fileResult.current.createNewFile('cleanup1.py', 'content1', 'python');
        fileResult.current.createNewFile('cleanup2.py', 'content2', 'python');
      });

      expect(fileResult.current.openFiles).toHaveLength(2);
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledTimes(2);

      // Unmount hooks
      unmountAI();
      unmountFile();

      // Verify cleanup
      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle code refactoring workflow', async () => {
      const { result: aiResult, waitForNextUpdate: waitForAI } = renderHook(() => 
        useAI({ defaultProvider: 'mock' })
      );
      
      const { result: fileResult } = renderHook(() => useFileManager());

      await waitForAI();

      // Step 1: Start with legacy code
      const legacyCode = `def old_function(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result`;

      let legacyFile: any;
      act(() => {
        legacyFile = fileResult.current.createNewFile('legacy.py', legacyCode, 'python');
      });

      // Step 2: Get improvement suggestions
      let improvedResponse: any;
      await act(async () => {
        improvedResponse = await aiResult.current.improveCode(legacyCode, 'python');
      });

      // Step 3: Create improved version
      let improvedFile: any;
      act(() => {
        improvedFile = fileResult.current.createNewFile('improved.py', improvedResponse.content, 'python');
      });

      // Step 4: Get explanation of changes
      let explanationResponse: any;
      await act(async () => {
        explanationResponse = await aiResult.current.explainCode(improvedResponse.content, 'python');
      });

      // Step 5: Create documentation file
      let docFile: any;
      act(() => {
        const docContent = `# Refactoring Documentation\n\n## Original Code\n${legacyCode}\n\n## Improved Code\n${improvedResponse.content}\n\n## Explanation\n${explanationResponse.content}`;
        docFile = fileResult.current.createNewFile('refactoring_notes.md', docContent, 'python');
      });

      // Verify workflow
      expect(fileResult.current.openFiles).toHaveLength(3);
      expect(fileResult.current.openFiles.map(f => f.name)).toEqual([
        'legacy.py',
        'improved.py',
        'refactoring_notes.md'
      ]);

      // Step 6: Create backups before finalizing
      await act(async () => {
        await fileResult.current.saveFile(legacyFile);
        await fileResult.current.saveFile(improvedFile);
        await fileResult.current.saveFile(docFile);
      });

      expect(mockFileSystemService.saveFile).toHaveBeenCalledTimes(3);
      expect(mockFileSystemService.createBackup).toHaveBeenCalledTimes(3);
    });

    test('should handle collaborative development simulation', async () => {
      // Simulate multiple developers using the same system
      const dev1AI = renderHook(() => useAI({ defaultProvider: 'mock' }));
      const dev1Files = renderHook(() => useFileManager());
      
      const dev2AI = renderHook(() => useAI({ defaultProvider: 'mock' }));
      const dev2Files = renderHook(() => useFileManager());

      await dev1AI.waitForNextUpdate();
      await dev2AI.waitForNextUpdate();

      // Dev 1: Creates main module
      const mainRequest = {
        language: 'python' as const,
        type: 'class' as const,
        description: 'user authentication system',
        prompt: 'Create authentication class'
      };

      let mainResponse: any;
      await act(async () => {
        mainResponse = await dev1AI.result.current.generateCode(mainRequest);
      });

      act(() => {
        dev1Files.result.current.createNewFile('auth.py', mainResponse.code, 'python');
      });

      // Dev 2: Creates utility functions based on main module
      let utilsResponse: any;
      await act(async () => {
        utilsResponse = await dev2AI.result.current.generateCode({
          language: 'python' as const,
          type: 'function' as const,
          description: 'utility functions for authentication',
          prompt: 'Create auth utilities'
        });
      });

      act(() => {
        dev2Files.result.current.createNewFile('auth_utils.py', utilsResponse.code, 'python');
      });

      // Both developers work independently
      expect(dev1Files.result.current.openFiles).toHaveLength(1);
      expect(dev2Files.result.current.openFiles).toHaveLength(1);
      expect(dev1Files.result.current.openFiles[0].name).toBe('auth.py');
      expect(dev2Files.result.current.openFiles[0].name).toBe('auth_utils.py');

      // Simulate integration - dev 1 explains their code to dev 2
      let explanationResponse: any;
      await act(async () => {
        explanationResponse = await dev1AI.result.current.explainCode(mainResponse.code, 'python');
      });

      // Dev 2 creates integration notes
      act(() => {
        dev2Files.result.current.createNewFile(
          'integration_notes.md',
          `# Integration Notes\n\n${explanationResponse.content}`,
          'python'
        );
      });

      expect(dev2Files.result.current.openFiles).toHaveLength(2);

      // Cleanup both environments
      dev1AI.unmount();
      dev1Files.unmount();
      dev2AI.unmount();
      dev2Files.unmount();
    });
  });
});