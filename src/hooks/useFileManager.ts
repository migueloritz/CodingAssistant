import { useState, useCallback, useEffect } from 'react';
import { FileContent, ProjectFile, Project, SupportedLanguage } from '../types';
import { fileSystemService } from '../services/storage';

export interface UseFileManagerOptions {
  autoSaveInterval?: number;
  maxRecentFiles?: number;
  enableVersioning?: boolean;
}

export interface FileManagerState {
  openFiles: FileContent[];
  activeFileId: string | null;
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
}

export const useFileManager = (options: UseFileManagerOptions = {}) => {
  const {
    autoSaveInterval = 30000,
    maxRecentFiles = 20,
    enableVersioning = true
  } = options;

  const [state, setState] = useState<FileManagerState>({
    openFiles: [],
    activeFileId: null,
    activeProject: null,
    isLoading: false,
    error: null,
    autoSaveEnabled: true
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Convert FileContent to ProjectFile
  const toProjectFile = useCallback((file: FileContent): ProjectFile => {
    return {
      id: file.id || `file-${Date.now()}`,
      name: file.name,
      path: file.path,
      relativePath: file.name,
      content: file.content,
      language: file.language,
      lastModified: file.lastModified,
      size: file.size || new Blob([file.content]).size,
      isModified: file.isModified || false,
      projectId: state.activeProject?.id
    };
  }, [state.activeProject?.id]);

  // Convert ProjectFile to FileContent
  const toFileContent = useCallback((projectFile: ProjectFile): FileContent => {
    return {
      id: projectFile.id,
      name: projectFile.name,
      path: projectFile.path,
      content: projectFile.content || '',
      language: projectFile.language as SupportedLanguage,
      lastModified: projectFile.lastModified,
      isModified: projectFile.isModified,
      size: projectFile.size
    };
  }, []);

  // Get the currently active file
  const activeFile = useCallback((): FileContent | null => {
    if (!state.activeFileId) return null;
    return state.openFiles.find(file => file.id === state.activeFileId) || null;
  }, [state.openFiles, state.activeFileId]);

  // Open a file
  const openFile = useCallback(async (file?: FileContent) => {
    setLoading(true);
    setError(null);

    try {
      let fileToOpen: FileContent;

      if (file) {
        fileToOpen = file;
      } else {
        // Use file system service to open a file
        const projectFile = await fileSystemService.openFile();
        fileToOpen = toFileContent(projectFile);
      }

      // Check if file is already open
      const existingIndex = state.openFiles.findIndex(f => 
        f.id === fileToOpen.id || f.path === fileToOpen.path
      );

      if (existingIndex >= 0) {
        // File already open, just activate it
        setState(prev => ({
          ...prev,
          activeFileId: state.openFiles[existingIndex].id || state.openFiles[existingIndex].name
        }));
      } else {
        // Add new file to open files
        setState(prev => ({
          ...prev,
          openFiles: [...prev.openFiles, fileToOpen],
          activeFileId: fileToOpen.id || fileToOpen.name
        }));

        // Enable auto-save if needed
        if (state.autoSaveEnabled && fileToOpen.id) {
          fileSystemService.enableAutoSave(fileToOpen.id, autoSaveInterval);
        }
      }

      // Add to recent files
      const projectFile = toProjectFile(fileToOpen);
      await fileSystemService.addToRecentFiles(projectFile);
      
    } catch (error: any) {
      setError('Failed to open file: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [state.openFiles, state.autoSaveEnabled, autoSaveInterval, toFileContent, toProjectFile]);

  // Open multiple files
  const openMultipleFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const projectFiles = await fileSystemService.openFiles();
      const fileContents = projectFiles.map(toFileContent);
      
      const newFiles: FileContent[] = [];
      
      for (const fileContent of fileContents) {
        // Check if file is already open
        const existingIndex = state.openFiles.findIndex(f => 
          f.id === fileContent.id || f.path === fileContent.path
        );

        if (existingIndex < 0) {
          newFiles.push(fileContent);
          
          // Enable auto-save if needed
          if (state.autoSaveEnabled && fileContent.id) {
            fileSystemService.enableAutoSave(fileContent.id, autoSaveInterval);
          }
        }
      }

      if (newFiles.length > 0) {
        setState(prev => ({
          ...prev,
          openFiles: [...prev.openFiles, ...newFiles],
          activeFileId: newFiles[0].id || newFiles[0].name
        }));

        // Add to recent files
        for (const file of newFiles) {
          const projectFile = toProjectFile(file);
          await fileSystemService.addToRecentFiles(projectFile);
        }
      }
    } catch (error: any) {
      setError('Failed to open files: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [state.openFiles, state.autoSaveEnabled, autoSaveInterval, toFileContent, toProjectFile]);

  // Save a file
  const saveFile = useCallback(async (file: FileContent) => {
    setLoading(true);
    setError(null);

    try {
      const projectFile = toProjectFile(file);
      await fileSystemService.saveFile(projectFile);

      // Update the file in open files
      setState(prev => ({
        ...prev,
        openFiles: prev.openFiles.map(f => 
          f.id === file.id ? { ...file, isModified: false } : f
        )
      }));

      // Create version if enabled
      if (enableVersioning) {
        await fileSystemService.createBackup(projectFile);
      }

    } catch (error: any) {
      setError('Failed to save file: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [toProjectFile, enableVersioning]);

  // Save as
  const saveFileAs = useCallback(async (file: FileContent) => {
    setLoading(true);
    setError(null);

    try {
      const projectFile = toProjectFile(file);
      await fileSystemService.saveFileAs(projectFile);

      // Update the file in open files
      setState(prev => ({
        ...prev,
        openFiles: prev.openFiles.map(f => 
          f.id === file.id ? { ...file, isModified: false } : f
        )
      }));

    } catch (error: any) {
      setError('Failed to save file: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [toProjectFile]);

  // Create new file
  const createNewFile = useCallback((name?: string, content?: string, language?: SupportedLanguage) => {
    const projectFile = fileSystemService.createFile(
      name || 'untitled.py',
      content || '# New file\nprint("Hello, World!")',
      language || 'python'
    );

    const fileContent = toFileContent(projectFile);

    setState(prev => ({
      ...prev,
      openFiles: [...prev.openFiles, fileContent],
      activeFileId: fileContent.id || fileContent.name
    }));

    // Enable auto-save if needed
    if (state.autoSaveEnabled && fileContent.id) {
      fileSystemService.enableAutoSave(fileContent.id, autoSaveInterval);
    }

    return fileContent;
  }, [state.autoSaveEnabled, autoSaveInterval, toFileContent]);

  // Close file
  const closeFile = useCallback((fileId: string) => {
    setState(prev => {
      const fileIndex = prev.openFiles.findIndex(f => (f.id || f.name) === fileId);
      if (fileIndex < 0) return prev;

      const newOpenFiles = prev.openFiles.filter((_, index) => index !== fileIndex);
      let newActiveFileId = prev.activeFileId;

      // If closing the active file, switch to another file
      if (prev.activeFileId === fileId) {
        if (newOpenFiles.length > 0) {
          // Switch to the next file, or previous if it was the last one
          const nextIndex = fileIndex < newOpenFiles.length ? fileIndex : fileIndex - 1;
          newActiveFileId = newOpenFiles[nextIndex]?.id || newOpenFiles[nextIndex]?.name || null;
        } else {
          newActiveFileId = null;
        }
      }

      // Disable auto-save for the closed file
      fileSystemService.disableAutoSave(fileId);

      return {
        ...prev,
        openFiles: newOpenFiles,
        activeFileId: newActiveFileId
      };
    });
  }, []);

  // Switch to a file
  const switchToFile = useCallback((file: FileContent) => {
    setState(prev => ({
      ...prev,
      activeFileId: file.id || file.name
    }));
  }, []);

  // Update file content
  const updateFileContent = useCallback((fileId: string, content: string) => {
    setState(prev => ({
      ...prev,
      openFiles: prev.openFiles.map(file => 
        (file.id || file.name) === fileId 
          ? { ...file, content, isModified: true, lastModified: new Date() }
          : file
      )
    }));
  }, []);

  // Open project
  const openProject = useCallback(async (projectPath?: string) => {
    setLoading(true);
    setError(null);

    try {
      const project = await fileSystemService.openProject(projectPath);
      
      setState(prev => ({
        ...prev,
        activeProject: project
      }));

      return project;
    } catch (error: any) {
      setError('Failed to open project: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Close project
  const closeProject = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeProject: null
    }));
  }, []);

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setState(prev => {
      const newAutoSaveEnabled = !prev.autoSaveEnabled;
      
      // Enable/disable auto-save for all open files
      prev.openFiles.forEach(file => {
        if (file.id) {
          if (newAutoSaveEnabled) {
            fileSystemService.enableAutoSave(file.id, autoSaveInterval);
          } else {
            fileSystemService.disableAutoSave(file.id);
          }
        }
      });

      return {
        ...prev,
        autoSaveEnabled: newAutoSaveEnabled
      };
    });
  }, [autoSaveInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Disable auto-save for all files
      state.openFiles.forEach(file => {
        if (file.id) {
          fileSystemService.disableAutoSave(file.id);
        }
      });
    };
  }, [state.openFiles]);

  return {
    // State
    ...state,
    activeFile: activeFile(),

    // Actions
    openFile,
    openMultipleFiles,
    saveFile,
    saveFileAs,
    createNewFile,
    closeFile,
    switchToFile,
    updateFileContent,
    openProject,
    closeProject,
    toggleAutoSave,
    setError,

    // File system service for advanced operations
    fileSystemService
  };
};