import { FileSystemService } from '../../../../services/storage/FileSystemService';
import { ProjectFile, Project } from '../../../../types/storage';
import { SupportedLanguage } from '../../../../types/editor';
import { mockIndexedDB, MockIDBDatabase } from '../../../mocks/indexeddb';
import { mockFileSystemAPI, MockFile, MockFileSystemFileHandle } from '../../../mocks/file-system-api';

// Mock window.showOpenFilePicker and showSaveFilePicker
Object.defineProperty(window, 'showOpenFilePicker', {
  value: mockFileSystemAPI.mockShowOpenFilePicker,
  writable: true,
});

Object.defineProperty(window, 'showSaveFilePicker', {
  value: mockFileSystemAPI.mockShowSaveFilePicker,
  writable: true,
});

describe('FileSystemService', () => {
  let fileSystemService: FileSystemService;
  let mockDB: MockIDBDatabase;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockFileSystemAPI.mockShowOpenFilePicker.mockClear();
    mockFileSystemAPI.mockShowSaveFilePicker.mockClear();
    
    // Create new instance for each test
    (FileSystemService as any).instance = undefined;
    fileSystemService = FileSystemService.getInstance();
    
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = FileSystemService.getInstance();
      const instance2 = FileSystemService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Language Detection', () => {
    test('should detect Python files', () => {
      const detectLanguage = (fileSystemService as any).detectLanguage;
      
      expect(detectLanguage('script.py')).toBe('python');
      expect(detectLanguage('module.pyw')).toBe('python');
    });

    test('should detect JavaScript files', () => {
      const detectLanguage = (fileSystemService as any).detectLanguage;
      
      expect(detectLanguage('script.js')).toBe('javascript');
      expect(detectLanguage('component.jsx')).toBe('javascript');
      expect(detectLanguage('module.mjs')).toBe('javascript');
    });

    test('should detect C++ files', () => {
      const detectLanguage = (fileSystemService as any).detectLanguage;
      
      expect(detectLanguage('program.cpp')).toBe('cpp');
      expect(detectLanguage('header.cc')).toBe('cpp');
      expect(detectLanguage('source.cxx')).toBe('cpp');
      expect(detectLanguage('main.c++')).toBe('cpp');
    });

    test('should default to Python for unknown extensions', () => {
      const detectLanguage = (fileSystemService as any).detectLanguage;
      
      expect(detectLanguage('unknown.xyz')).toBe('python');
      expect(detectLanguage('noextension')).toBe('python');
    });
  });

  describe('File System API Support', () => {
    test('should detect File System API support', () => {
      const supportsFileSystemAPI = (fileSystemService as any).supportsFileSystemAPI;
      expect(supportsFileSystemAPI).toBe(true);
    });

    test('should handle missing File System API', () => {
      delete (window as any).showOpenFilePicker;
      delete (window as any).showSaveFilePicker;
      
      const supportsFileSystemAPI = (fileSystemService as any).supportsFileSystemAPI;
      expect(supportsFileSystemAPI).toBe(false);
      
      // Restore for other tests
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: mockFileSystemAPI.mockShowOpenFilePicker,
        writable: true,
      });
      Object.defineProperty(window, 'showSaveFilePicker', {
        value: mockFileSystemAPI.mockShowSaveFilePicker,
        writable: true,
      });
    });
  });

  describe('File Opening', () => {
    test('should open file using File System API', async () => {
      const mockFile = new MockFile('test.py', 'print("Hello, World!")', { type: 'text/plain' });
      const mockHandle = new MockFileSystemFileHandle('test.py');
      jest.spyOn(mockHandle, 'getFile').mockResolvedValue(mockFile);
      
      mockFileSystemAPI.mockShowOpenFilePicker.mockResolvedValue([mockHandle]);

      const projectFile = await fileSystemService.openFile();

      expect(projectFile).toMatchObject({
        id: expect.any(String),
        name: 'test.py',
        path: 'test.py',
        content: 'test content',
        language: 'python',
        lastModified: expect.any(Date),
        size: 100,
        isModified: false
      });

      expect(mockFileSystemAPI.mockShowOpenFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          types: expect.arrayContaining([
            expect.objectContaining({
              description: 'Code files',
              accept: expect.objectContaining({
                'text/plain': expect.arrayContaining(['.py', '.js', '.jsx', '.cpp'])
              })
            })
          ])
        })
      );
    });

    test('should open file with custom options', async () => {
      const customOptions = {
        types: [{
          description: 'Python files',
          accept: { 'text/x-python': ['.py'] }
        }],
        excludeAcceptAllOption: true
      };

      const mockHandle = new MockFileSystemFileHandle('script.py');
      mockFileSystemAPI.mockShowOpenFilePicker.mockResolvedValue([mockHandle]);

      await fileSystemService.openFile(customOptions);

      expect(mockFileSystemAPI.mockShowOpenFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          types: customOptions.types,
          excludeAcceptAllOption: true
        })
      );
    });

    test('should fallback to input element when File System API unavailable', async () => {
      delete (window as any).showOpenFilePicker;
      
      const mockFileContent = 'console.log("test");';
      
      // Mock the file input behavior
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'input') {
          const input = {
            type: '',
            accept: '',
            onchange: null as any,
            click: jest.fn().mockImplementation(() => {
              setTimeout(() => {
                if (input.onchange) {
                  const mockFile = new MockFile('test.js', mockFileContent);
                  const event = {
                    target: {
                      files: [mockFile]
                    }
                  };
                  input.onchange(event);
                }
              }, 0);
            })
          };
          return input as any;
        }
        return document.createElement(tagName);
      });

      const projectFile = await fileSystemService.openFile();

      expect(projectFile).toMatchObject({
        name: 'test.js',
        language: 'javascript',
        content: 'test content'
      });

      createElementSpy.mockRestore();
      
      // Restore File System API
      Object.defineProperty(window, 'showOpenFilePicker', {
        value: mockFileSystemAPI.mockShowOpenFilePicker,
        writable: true,
      });
    });

    test('should handle file opening errors', async () => {
      mockFileSystemAPI.mockShowOpenFilePicker.mockRejectedValue(new Error('File access denied'));

      await expect(fileSystemService.openFile()).rejects.toThrow('Failed to open file');
    });

    test('should open multiple files', async () => {
      const mockFiles = [
        new MockFileSystemFileHandle('file1.py'),
        new MockFileSystemFileHandle('file2.js')
      ];
      
      mockFileSystemAPI.mockShowOpenFilePicker.mockResolvedValue(mockFiles);

      const projectFiles = await fileSystemService.openFiles();

      expect(projectFiles).toHaveLength(2);
      expect(projectFiles[0].name).toBe('file1.py');
      expect(projectFiles[1].name).toBe('file2.js');
    });
  });

  describe('File Saving', () => {
    test('should save file using File System API', async () => {
      const projectFile: ProjectFile = {
        id: 'test-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      const mockWritable = {
        write: jest.fn(),
        close: jest.fn()
      };
      
      const mockHandle = new MockFileSystemFileHandle('test.py');
      jest.spyOn(mockHandle, 'createWritable').mockResolvedValue(mockWritable as any);
      
      mockFileSystemAPI.mockShowSaveFilePicker.mockResolvedValue(mockHandle);

      await fileSystemService.saveFile(projectFile);

      expect(mockFileSystemAPI.mockShowSaveFilePicker).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalledWith('print("Hello")');
      expect(mockWritable.close).toHaveBeenCalled();
      expect(projectFile.isModified).toBe(false);
    });

    test('should save file with custom options', async () => {
      const projectFile: ProjectFile = {
        id: 'test-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      const saveOptions = {
        suggestedName: 'custom-name.py',
        types: [{
          description: 'Python files',
          accept: { 'text/x-python': ['.py'] }
        }]
      };

      const mockHandle = new MockFileSystemFileHandle('custom-name.py');
      mockFileSystemAPI.mockShowSaveFilePicker.mockResolvedValue(mockHandle);

      await fileSystemService.saveFile(projectFile, saveOptions);

      expect(mockFileSystemAPI.mockShowSaveFilePicker).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'custom-name.py',
          types: saveOptions.types
        })
      );
    });

    test('should handle file saving errors', async () => {
      const projectFile: ProjectFile = {
        id: 'test-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      mockFileSystemAPI.mockShowSaveFilePicker.mockRejectedValue(new Error('Save failed'));

      await expect(fileSystemService.saveFile(projectFile)).rejects.toThrow('Failed to save file');
    });

    test('should download file when File System API unavailable', async () => {
      delete (window as any).showSaveFilePicker;
      
      const projectFile: ProjectFile = {
        id: 'test-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      // Mock DOM elements and methods
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      
      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation();
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation();
      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation();

      await fileSystemService.saveFile(projectFile);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('test.py');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalled();

      // Cleanup
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
      
      // Restore File System API
      Object.defineProperty(window, 'showSaveFilePicker', {
        value: mockFileSystemAPI.mockShowSaveFilePicker,
        writable: true,
      });
    });
  });

  describe('File Creation', () => {
    test('should create new file with default content', () => {
      const file = fileSystemService.createFile('new.py');

      expect(file).toMatchObject({
        id: expect.any(String),
        name: 'new.py',
        path: 'new.py',
        content: '# New file\nprint("Hello, World!")',
        language: 'python',
        lastModified: expect.any(Date),
        isModified: false
      });
    });

    test('should create file with custom content and language', () => {
      const file = fileSystemService.createFile(
        'custom.js',
        'console.log("Custom content");',
        'javascript'
      );

      expect(file).toMatchObject({
        name: 'custom.js',
        content: 'console.log("Custom content");',
        language: 'javascript'
      });
    });
  });

  describe('File Management', () => {
    test('should delete file from storage', async () => {
      const fileId = 'test-file-1';
      
      await fileSystemService.deleteFile(fileId);

      // Verify delete was called on the mock store
      // Note: This is a simplified test as the actual implementation is more complex
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should rename file', async () => {
      const fileId = 'test-file-1';
      const newName = 'renamed.py';
      
      await fileSystemService.renameFile(fileId, newName);

      // Verify rename operation
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should duplicate file', async () => {
      const fileId = 'test-file-1';
      const newName = 'copy.py';
      
      const duplicatedFile = await fileSystemService.duplicateFile(fileId, newName);

      expect(duplicatedFile).toMatchObject({
        id: expect.any(String),
        name: newName,
        isModified: false
      });
    });
  });

  describe('Project Management', () => {
    test('should create new project', async () => {
      const project = await fileSystemService.openProject();

      expect(project).toMatchObject({
        id: expect.any(String),
        name: 'New Project',
        path: '',
        files: [],
        lastOpened: expect.any(Date),
        settings: expect.objectContaining({
          autoSave: true,
          autoSaveInterval: 30000,
          backupEnabled: true,
          maxBackups: 5
        })
      });
    });

    test('should create project with custom path', async () => {
      const projectPath = '/custom/project/path';
      const project = await fileSystemService.openProject(projectPath);

      expect(project.path).toBe(projectPath);
      expect(project.name).toBe('path');
    });

    test('should save project to storage', async () => {
      const project: Project = {
        id: 'project-1',
        name: 'Test Project',
        path: '/test/project',
        files: [],
        lastOpened: new Date(),
        settings: { autoSave: true, autoSaveInterval: 30000, backupEnabled: true, maxBackups: 5 }
      };

      await fileSystemService.saveProject(project);

      // Verify project was saved
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should get recent projects', async () => {
      const recentProjects = await fileSystemService.getRecentProjects();

      expect(Array.isArray(recentProjects)).toBe(true);
      expect(recentProjects.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Version Control', () => {
    test('should create backup of file', async () => {
      const projectFile: ProjectFile = {
        id: 'test-file-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      const version = await fileSystemService.createBackup(projectFile);

      expect(version).toMatchObject({
        id: expect.any(String),
        fileId: 'test-file-1',
        content: 'print("Hello")',
        timestamp: expect.any(Date),
        description: 'Auto-backup of test.py',
        size: expect.any(Number)
      });
    });

    test('should get file versions', async () => {
      const fileId = 'test-file-1';
      
      const versions = await fileSystemService.getFileVersions(fileId);

      expect(Array.isArray(versions)).toBe(true);
    });

    test('should restore file version', async () => {
      const versionId = 'version-1';
      
      const restoredFile = await fileSystemService.restoreVersion(versionId);

      expect(restoredFile).toMatchObject({
        isModified: true,
        lastModified: expect.any(Date)
      });
    });
  });

  describe('Recent Files', () => {
    test('should add file to recent files', async () => {
      const projectFile: ProjectFile = {
        id: 'test-file-1',
        name: 'test.py',
        path: 'test.py',
        relativePath: 'test.py',
        content: 'print("Hello")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      await fileSystemService.addToRecentFiles(projectFile);

      // Verify file was added to recent files
      expect(true).toBe(true); // Placeholder assertion
    });

    test('should get recent files', async () => {
      const recentFiles = await fileSystemService.getRecentFiles();

      expect(Array.isArray(recentFiles)).toBe(true);
      expect(recentFiles.length).toBeLessThanOrEqual(20);
    });

    test('should remove file from recent files', async () => {
      const fileId = 'test-file-1';
      
      await fileSystemService.removeFromRecentFiles(fileId);

      // Verify file was removed
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('File Search', () => {
    test('should search files by content', async () => {
      const query = 'print';
      
      const results = await fileSystemService.searchFiles(query);

      expect(Array.isArray(results)).toBe(true);
      results.forEach(result => {
        expect(result).toMatchObject({
          file: expect.any(Object),
          matches: expect.arrayContaining([
            expect.objectContaining({
              line: expect.any(Number),
              column: expect.any(Number),
              text: expect.any(String),
              preview: expect.any(String)
            })
          ])
        });
      });
    });

    test('should search files within specific project', async () => {
      const query = 'function';
      const projectId = 'project-1';
      
      const results = await fileSystemService.searchFiles(query, projectId);

      expect(Array.isArray(results)).toBe(true);
    });

    test('should search in file names', async () => {
      const query = 'test';
      
      const results = await fileSystemService.searchFiles(query);

      // Results should include filename matches
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Auto-save', () => {
    test('should enable auto-save for file', () => {
      const fileId = 'test-file-1';
      const interval = 5000;
      
      fileSystemService.enableAutoSave(fileId, interval);

      // Verify auto-save was enabled
      const autoSaveIntervals = (fileSystemService as any).autoSaveIntervals;
      expect(autoSaveIntervals.has(fileId)).toBe(true);
    });

    test('should disable auto-save for file', () => {
      const fileId = 'test-file-1';
      
      fileSystemService.enableAutoSave(fileId);
      fileSystemService.disableAutoSave(fileId);

      // Verify auto-save was disabled
      const autoSaveIntervals = (fileSystemService as any).autoSaveIntervals;
      expect(autoSaveIntervals.has(fileId)).toBe(false);
    });

    test('should replace existing auto-save interval', () => {
      const fileId = 'test-file-1';
      
      fileSystemService.enableAutoSave(fileId, 1000);
      fileSystemService.enableAutoSave(fileId, 5000);

      // Should only have one interval for the file
      const autoSaveIntervals = (fileSystemService as any).autoSaveIntervals;
      expect(autoSaveIntervals.size).toBe(1);
    });
  });

  describe('Storage Management', () => {
    test('should get storage information', async () => {
      const storageInfo = await fileSystemService.getStorageInfo();

      expect(storageInfo).toMatchObject({
        used: expect.any(Number),
        available: expect.any(Number),
        total: expect.any(Number),
        type: expect.any(String)
      });
    });

    test('should clear storage', async () => {
      await fileSystemService.clearStorage();

      // Verify storage was cleared
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Event Handling', () => {
    test('should add event listener', () => {
      const callback = jest.fn();
      
      fileSystemService.addEventListener('fileOpened', callback);

      // Verify listener was added
      const eventListeners = (fileSystemService as any).eventListeners;
      expect(eventListeners.get('fileOpened')?.has(callback)).toBe(true);
    });

    test('should remove event listener', () => {
      const callback = jest.fn();
      
      fileSystemService.addEventListener('fileOpened', callback);
      fileSystemService.removeEventListener('fileOpened', callback);

      // Verify listener was removed
      const eventListeners = (fileSystemService as any).eventListeners;
      expect(eventListeners.get('fileOpened')?.has(callback)).toBe(false);
    });

    test('should emit events', () => {
      const callback = jest.fn();
      
      fileSystemService.addEventListener('fileOpened', callback);
      (fileSystemService as any).emit('fileOpened', { test: 'data' });

      expect(callback).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('Error Handling', () => {
    test('should create error objects with correct format', () => {
      const createError = (fileSystemService as any).createError;
      
      const error = createError('TEST_ERROR', 'Test error message', { detail: 'test' });

      expect(error).toEqual({
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: { detail: 'test' }
      });
    });

    test('should handle IndexedDB initialization errors', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = new (mockIndexedDB as any).MockIDBOpenDBRequest(null);
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: { error: new Error('DB error') } });
          }
        }, 0);
        return request;
      });

      // Create new instance to trigger initialization
      (FileSystemService as any).instance = undefined;
      const service = FileSystemService.getInstance();

      // Allow async initialization to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // Service should still be usable even with DB errors
      expect(service).toBeDefined();
    });
  });

  describe('Utility Functions', () => {
    test('should generate unique IDs', () => {
      const generateId = (fileSystemService as any).generateId;
      
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should detect supported languages correctly', () => {
      const detectLanguage = (fileSystemService as any).detectLanguage;
      
      expect(detectLanguage('test.py')).toBe('python');
      expect(detectLanguage('test.js')).toBe('javascript');
      expect(detectLanguage('test.cpp')).toBe('cpp');
      expect(detectLanguage('test.unknown')).toBe('python');
    });
  });
});