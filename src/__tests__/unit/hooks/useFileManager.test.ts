import { renderHook, act } from '@testing-library/react-hooks';
import { useFileManager } from '../../../hooks/useFileManager';
import { fileSystemService } from '../../../services/storage';
import { FileContent, ProjectFile, Project } from '../../../types';
import { createMockFile, createMockProject, flushPromises } from '../../utils/test-utils';

// Mock the file system service
jest.mock('../../../services/storage', () => ({
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

describe('useFileManager Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const { result } = renderHook(() => useFileManager());

      expect(result.current.openFiles).toEqual([]);
      expect(result.current.activeFileId).toBe(null);
      expect(result.current.activeProject).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.autoSaveEnabled).toBe(true);
      expect(result.current.activeFile).toBe(null);
    });

    test('should initialize with custom options', () => {
      const options = {
        autoSaveInterval: 60000,
        maxRecentFiles: 50,
        enableVersioning: false
      };

      const { result } = renderHook(() => useFileManager(options));

      expect(result.current.autoSaveEnabled).toBe(true);
    });
  });

  describe('File Opening', () => {
    test('should open file successfully', async () => {
      const mockProjectFile = createMockFile({ 
        id: 'file-1',
        name: 'test.py',
        content: 'print("Hello")'
      });

      mockFileSystemService.openFile.mockResolvedValue(mockProjectFile as ProjectFile);
      mockFileSystemService.addToRecentFiles.mockResolvedValue();
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFile();
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.openFiles[0]).toMatchObject({
        id: 'file-1',
        name: 'test.py',
        content: 'print("Hello")'
      });
      expect(result.current.activeFileId).toBe('file-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);

      expect(mockFileSystemService.openFile).toHaveBeenCalled();
      expect(mockFileSystemService.addToRecentFiles).toHaveBeenCalled();
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith('file-1', 30000);
    });

    test('should open specific file when provided', async () => {
      const fileContent: FileContent = {
        id: 'specific-file',
        name: 'specific.py',
        path: '/path/specific.py',
        content: 'print("Specific")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      mockFileSystemService.addToRecentFiles.mockResolvedValue();
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFile(fileContent);
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.openFiles[0]).toMatchObject(fileContent);
      expect(result.current.activeFileId).toBe('specific-file');
      expect(mockFileSystemService.openFile).not.toHaveBeenCalled();
    });

    test('should activate existing file instead of opening duplicate', async () => {
      const existingFile: FileContent = {
        id: 'existing-file',
        name: 'existing.py',
        path: '/path/existing.py',
        content: 'print("Existing")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      const { result } = renderHook(() => useFileManager());

      // Add file to state manually
      act(() => {
        (result.current as any).openFiles = [existingFile];
        (result.current as any).activeFileId = null;
      });

      await act(async () => {
        await result.current.openFile(existingFile);
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.activeFileId).toBe('existing-file');
      expect(mockFileSystemService.openFile).not.toHaveBeenCalled();
    });

    test('should handle file opening error', async () => {
      mockFileSystemService.openFile.mockRejectedValue(new Error('File access denied'));

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFile();
      });

      expect(result.current.openFiles).toHaveLength(0);
      expect(result.current.error).toBe('Failed to open file: File access denied');
      expect(result.current.isLoading).toBe(false);
    });

    test('should open multiple files successfully', async () => {
      const mockFiles = [
        createMockFile({ id: 'file-1', name: 'file1.py' }),
        createMockFile({ id: 'file-2', name: 'file2.js' })
      ];

      mockFileSystemService.openFiles.mockResolvedValue(mockFiles as ProjectFile[]);
      mockFileSystemService.addToRecentFiles.mockResolvedValue();
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFiles();
      });

      expect(result.current.openFiles).toHaveLength(2);
      expect(result.current.activeFileId).toBe('file-1');
      expect(mockFileSystemService.addToRecentFiles).toHaveBeenCalledTimes(2);
    });

    test('should skip already open files when opening multiple', async () => {
      const existingFile = createMockFile({ id: 'existing', name: 'existing.py' });
      const newFile = createMockFile({ id: 'new', name: 'new.py' });

      const { result } = renderHook(() => useFileManager());

      // Set existing file
      act(() => {
        (result.current as any).openFiles = [existingFile];
      });

      mockFileSystemService.openFiles.mockResolvedValue([existingFile, newFile] as ProjectFile[]);
      mockFileSystemService.addToRecentFiles.mockResolvedValue();
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      await act(async () => {
        await result.current.openFiles();
      });

      expect(result.current.openFiles).toHaveLength(2);
      expect(mockFileSystemService.addToRecentFiles).toHaveBeenCalledTimes(1); // Only for new file
    });
  });

  describe('File Saving', () => {
    test('should save file successfully', async () => {
      const fileToSave: FileContent = {
        id: 'save-file',
        name: 'save.py',
        path: '/path/save.py',
        content: 'print("Save me")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      mockFileSystemService.saveFile.mockResolvedValue();
      mockFileSystemService.createBackup.mockResolvedValue({} as any);

      const { result } = renderHook(() => useFileManager({ enableVersioning: true }));

      // Set the file in open files
      act(() => {
        (result.current as any).openFiles = [fileToSave];
      });

      await act(async () => {
        await result.current.saveFile(fileToSave);
      });

      expect(mockFileSystemService.saveFile).toHaveBeenCalled();
      expect(mockFileSystemService.createBackup).toHaveBeenCalled();
      expect(result.current.openFiles[0].isModified).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('should save file without versioning when disabled', async () => {
      const fileToSave: FileContent = {
        id: 'save-file',
        name: 'save.py',
        path: '/path/save.py',
        content: 'print("Save me")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      mockFileSystemService.saveFile.mockResolvedValue();

      const { result } = renderHook(() => useFileManager({ enableVersioning: false }));

      act(() => {
        (result.current as any).openFiles = [fileToSave];
      });

      await act(async () => {
        await result.current.saveFile(fileToSave);
      });

      expect(mockFileSystemService.saveFile).toHaveBeenCalled();
      expect(mockFileSystemService.createBackup).not.toHaveBeenCalled();
    });

    test('should handle save file error', async () => {
      const fileToSave: FileContent = {
        id: 'save-file',
        name: 'save.py',
        path: '/path/save.py',
        content: 'print("Save me")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      mockFileSystemService.saveFile.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.saveFile(fileToSave);
      });

      expect(result.current.error).toBe('Failed to save file: Save failed');
      expect(result.current.isLoading).toBe(false);
    });

    test('should save file as with new name', async () => {
      const fileToSave: FileContent = {
        id: 'save-as-file',
        name: 'original.py',
        path: '/path/original.py',
        content: 'print("Save as")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: true
      };

      mockFileSystemService.saveFileAs.mockResolvedValue();

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [fileToSave];
      });

      await act(async () => {
        await result.current.saveFileAs(fileToSave);
      });

      expect(mockFileSystemService.saveFileAs).toHaveBeenCalled();
      expect(result.current.openFiles[0].isModified).toBe(false);
    });
  });

  describe('File Creation', () => {
    test('should create new file with defaults', () => {
      const mockCreatedFile = createMockFile({ 
        id: 'new-file',
        name: 'untitled.py',
        content: '# New file\nprint("Hello, World!")'
      });

      mockFileSystemService.createFile.mockReturnValue(mockCreatedFile as ProjectFile);
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      let createdFile: FileContent;
      act(() => {
        createdFile = result.current.createNewFile();
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.activeFileId).toBe('new-file');
      expect(mockFileSystemService.createFile).toHaveBeenCalledWith(
        'untitled.py',
        '# New file\nprint("Hello, World!")',
        'python'
      );
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith('new-file', 30000);
    });

    test('should create new file with custom parameters', () => {
      const mockCreatedFile = createMockFile({ 
        id: 'custom-file',
        name: 'custom.js',
        content: 'console.log("Custom");'
      });

      mockFileSystemService.createFile.mockReturnValue(mockCreatedFile as ProjectFile);
      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      act(() => {
        result.current.createNewFile('custom.js', 'console.log("Custom");', 'javascript');
      });

      expect(mockFileSystemService.createFile).toHaveBeenCalledWith(
        'custom.js',
        'console.log("Custom");',
        'javascript'
      );
    });
  });

  describe('File Management', () => {
    test('should close file successfully', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py' });
      const file2 = createMockFile({ id: 'file-2', name: 'file2.py' });

      mockFileSystemService.disableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      // Set initial files
      act(() => {
        (result.current as any).openFiles = [file1, file2];
        (result.current as any).activeFileId = 'file-1';
      });

      act(() => {
        result.current.closeFile('file-1');
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.openFiles[0].id).toBe('file-2');
      expect(result.current.activeFileId).toBe('file-2');
      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledWith('file-1');
    });

    test('should handle closing last file', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py' });

      mockFileSystemService.disableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1];
        (result.current as any).activeFileId = 'file-1';
      });

      act(() => {
        result.current.closeFile('file-1');
      });

      expect(result.current.openFiles).toHaveLength(0);
      expect(result.current.activeFileId).toBe(null);
    });

    test('should switch to file successfully', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py' });
      const file2 = createMockFile({ id: 'file-2', name: 'file2.py' });

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1, file2];
        (result.current as any).activeFileId = 'file-1';
      });

      act(() => {
        result.current.switchToFile(file2);
      });

      expect(result.current.activeFileId).toBe('file-2');
    });

    test('should update file content', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py', content: 'old content' });

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1];
      });

      act(() => {
        result.current.updateFileContent('file-1', 'new content');
      });

      expect(result.current.openFiles[0].content).toBe('new content');
      expect(result.current.openFiles[0].isModified).toBe(true);
      expect(result.current.openFiles[0].lastModified).toBeInstanceOf(Date);
    });
  });

  describe('Project Management', () => {
    test('should open project successfully', async () => {
      const mockProject = createMockProject({ id: 'project-1', name: 'Test Project' });

      mockFileSystemService.openProject.mockResolvedValue(mockProject as Project);

      const { result } = renderHook(() => useFileManager());

      let project: Project | null = null;
      await act(async () => {
        project = await result.current.openProject('/test/project');
      });

      expect(project).toBe(mockProject);
      expect(result.current.activeProject).toBe(mockProject);
      expect(result.current.error).toBe(null);
      expect(mockFileSystemService.openProject).toHaveBeenCalledWith('/test/project');
    });

    test('should handle project opening error', async () => {
      mockFileSystemService.openProject.mockRejectedValue(new Error('Project open failed'));

      const { result } = renderHook(() => useFileManager());

      let project: Project | null = null;
      await act(async () => {
        project = await result.current.openProject('/test/project');
      });

      expect(project).toBe(null);
      expect(result.current.error).toBe('Failed to open project: Project open failed');
    });

    test('should close project successfully', () => {
      const mockProject = createMockProject();

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).activeProject = mockProject;
      });

      act(() => {
        result.current.closeProject();
      });

      expect(result.current.activeProject).toBe(null);
    });
  });

  describe('Auto-save Management', () => {
    test('should toggle auto-save on', () => {
      const file1 = createMockFile({ id: 'file-1' });
      const file2 = createMockFile({ id: 'file-2' });

      mockFileSystemService.enableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager({ autoSaveInterval: 60000 }));

      act(() => {
        (result.current as any).openFiles = [file1, file2];
        (result.current as any).autoSaveEnabled = false;
      });

      act(() => {
        result.current.toggleAutoSave();
      });

      expect(result.current.autoSaveEnabled).toBe(true);
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith('file-1', 60000);
      expect(mockFileSystemService.enableAutoSave).toHaveBeenCalledWith('file-2', 60000);
    });

    test('should toggle auto-save off', () => {
      const file1 = createMockFile({ id: 'file-1' });

      mockFileSystemService.disableAutoSave.mockImplementation(() => {});

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1];
        (result.current as any).autoSaveEnabled = true;
      });

      act(() => {
        result.current.toggleAutoSave();
      });

      expect(result.current.autoSaveEnabled).toBe(false);
      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledWith('file-1');
    });
  });

  describe('Active File', () => {
    test('should return active file when available', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py' });
      const file2 = createMockFile({ id: 'file-2', name: 'file2.py' });

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1, file2];
        (result.current as any).activeFileId = 'file-2';
      });

      expect(result.current.activeFile).toBe(file2);
    });

    test('should return null when no active file', () => {
      const { result } = renderHook(() => useFileManager());

      expect(result.current.activeFile).toBe(null);
    });

    test('should return null when active file not found', () => {
      const file1 = createMockFile({ id: 'file-1', name: 'file1.py' });

      const { result } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1];
        (result.current as any).activeFileId = 'non-existent';
      });

      expect(result.current.activeFile).toBe(null);
    });
  });

  describe('Cleanup', () => {
    test('should disable auto-save for all files on unmount', () => {
      const file1 = createMockFile({ id: 'file-1' });
      const file2 = createMockFile({ id: 'file-2' });

      mockFileSystemService.disableAutoSave.mockImplementation(() => {});

      const { result, unmount } = renderHook(() => useFileManager());

      act(() => {
        (result.current as any).openFiles = [file1, file2];
      });

      unmount();

      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledWith('file-1');
      expect(mockFileSystemService.disableAutoSave).toHaveBeenCalledWith('file-2');
    });
  });

  describe('Error Handling', () => {
    test('should set error when operation fails', async () => {
      mockFileSystemService.openFile.mockRejectedValue(new Error('Operation failed'));

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFile();
      });

      expect(result.current.error).toBe('Failed to open file: Operation failed');
    });

    test('should clear error manually', () => {
      const { result } = renderHook(() => useFileManager());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('File Conversion Utilities', () => {
    test('should convert FileContent to ProjectFile correctly', () => {
      const fileContent: FileContent = {
        id: 'test-file',
        name: 'test.py',
        path: '/path/test.py',
        content: 'print("test")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      const { result } = renderHook(() => useFileManager());

      // Access private method for testing
      const toProjectFile = (result.current as any).toProjectFile;
      const projectFile = toProjectFile(fileContent);

      expect(projectFile).toMatchObject({
        id: 'test-file',
        name: 'test.py',
        path: '/path/test.py',
        relativePath: 'test.py',
        content: 'print("test")',
        language: 'python',
        lastModified: fileContent.lastModified,
        size: 100,
        isModified: false,
        projectId: undefined
      });
    });

    test('should convert ProjectFile to FileContent correctly', () => {
      const projectFile: ProjectFile = {
        id: 'test-file',
        name: 'test.py',
        path: '/path/test.py',
        relativePath: 'test.py',
        content: 'print("test")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      const { result } = renderHook(() => useFileManager());

      const toFileContent = (result.current as any).toFileContent;
      const fileContent = toFileContent(projectFile);

      expect(fileContent).toMatchObject({
        id: 'test-file',
        name: 'test.py',
        path: '/path/test.py',
        content: 'print("test")',
        language: 'python',
        lastModified: projectFile.lastModified,
        isModified: false,
        size: 100
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle files without IDs', async () => {
      const fileWithoutId: FileContent = {
        name: 'no-id.py',
        path: '/path/no-id.py',
        content: 'print("no id")',
        language: 'python',
        lastModified: new Date(),
        size: 100,
        isModified: false
      };

      mockFileSystemService.addToRecentFiles.mockResolvedValue();

      const { result } = renderHook(() => useFileManager());

      await act(async () => {
        await result.current.openFile(fileWithoutId);
      });

      expect(result.current.openFiles).toHaveLength(1);
      expect(result.current.activeFileId).toBe('no-id.py'); // Should use name as fallback
    });

    test('should handle closing non-existent file', () => {
      const { result } = renderHook(() => useFileManager());

      act(() => {
        result.current.closeFile('non-existent');
      });

      expect(result.current.openFiles).toHaveLength(0);
      expect(result.current.activeFileId).toBe(null);
    });

    test('should handle updating content of non-existent file', () => {
      const { result } = renderHook(() => useFileManager());

      act(() => {
        result.current.updateFileContent('non-existent', 'new content');
      });

      expect(result.current.openFiles).toHaveLength(0);
    });
  });
});