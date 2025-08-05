import { 
  ProjectFile, 
  Project, 
  FileVersion, 
  RecentFile, 
  StorageInfo, 
  FileSearchResult, 
  StorageService,
  FileSystemOptions,
  SaveFileOptions,
  FileOperationResult,
  FileOperationError,
  ProjectSettings
} from '../../types/storage';
import { SupportedLanguage } from '../../types/editor';

export class FileSystemService implements StorageService {
  private static instance: FileSystemService;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();
  private autoSaveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dbName = 'CodingAssistantDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initIndexedDB();
  }

  public static getInstance(): FileSystemService {
    if (!FileSystemService.instance) {
      FileSystemService.instance = new FileSystemService();
    }
    return FileSystemService.instance;
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('projectId', 'projectId', { unique: false });
          fileStore.createIndex('path', 'path', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('path', 'path', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('versions')) {
          const versionStore = db.createObjectStore('versions', { keyPath: 'id' });
          versionStore.createIndex('fileId', 'fileId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('recentFiles')) {
          const recentStore = db.createObjectStore('recentFiles', { keyPath: 'id' });
          recentStore.createIndex('lastOpened', 'lastOpened', { unique: false });
        }
      };
    });
  }

  private detectLanguage(filename: string): SupportedLanguage {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'mjs':
        return 'javascript';
      case 'py':
      case 'pyw':
        return 'python';
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c++':
        return 'cpp';
      default:
        return 'python'; // default
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // File System API support check
  private get supportsFileSystemAPI(): boolean {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  async openFile(options?: FileSystemOptions): Promise<ProjectFile> {
    try {
      if (this.supportsFileSystemAPI) {
        return await this.openFileWithFileSystemAPI(options);
      } else {
        return await this.openFileWithInput(options);
      }
    } catch (error) {
      throw this.createError('OPEN_FILE_FAILED', 'Failed to open file', error);
    }
  }

  private async openFileWithFileSystemAPI(options?: FileSystemOptions): Promise<ProjectFile> {
    const fileSystemOptions = {
      types: options?.types || [
        {
          description: 'Code files',
          accept: {
            'text/plain': ['.py', '.js', '.jsx', '.cpp', '.cc', '.cxx', '.txt'],
            'application/javascript': ['.js', '.jsx'],
            'text/x-python': ['.py'],
            'text/x-c++src': ['.cpp', '.cc', '.cxx']
          }
        }
      ],
      multiple: false,
      excludeAcceptAllOption: options?.excludeAcceptAllOption || false
    };

    const [fileHandle] = await (window as any).showOpenFilePicker(fileSystemOptions);
    const file = await fileHandle.getFile();
    const content = await file.text();

    const projectFile: ProjectFile = {
      id: this.generateId(),
      name: file.name,
      path: file.name, // In browser, we don't have full path
      relativePath: file.name,
      content,
      language: this.detectLanguage(file.name),
      lastModified: new Date(file.lastModified),
      size: file.size,
      isModified: false,
      metadata: {
        name: file.name,
        path: file.name,
        size: file.size,
        lastModified: new Date(file.lastModified),
        type: file.type || 'text/plain',
        language: this.detectLanguage(file.name)
      }
    };

    await this.addToRecentFiles(projectFile);
    this.emit('fileOpened', projectFile);
    
    return projectFile;
  }

  private async openFileWithInput(options?: FileSystemOptions): Promise<ProjectFile> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      
      // Set accept attribute based on options
      if (options?.types && options.types.length > 0) {
        const extensions = options.types.flatMap(type => 
          Object.values(type.accept).flat()
        );
        input.accept = extensions.join(',');
      } else {
        input.accept = '.py,.js,.jsx,.cpp,.cc,.cxx,.txt';
      }

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        try {
          const content = await file.text();
          const projectFile: ProjectFile = {
            id: this.generateId(),
            name: file.name,
            path: file.name,
            relativePath: file.name,
            content,
            language: this.detectLanguage(file.name),
            lastModified: new Date(file.lastModified),
            size: file.size,
            isModified: false,
            metadata: {
              name: file.name,
              path: file.name,
              size: file.size,
              lastModified: new Date(file.lastModified),
              type: file.type || 'text/plain',
              language: this.detectLanguage(file.name)
            }
          };

          await this.addToRecentFiles(projectFile);
          this.emit('fileOpened', projectFile);
          resolve(projectFile);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  async openFiles(options?: FileSystemOptions): Promise<ProjectFile[]> {
    try {
      if (this.supportsFileSystemAPI) {
        return await this.openFilesWithFileSystemAPI(options);
      } else {
        return await this.openFilesWithInput(options);
      }
    } catch (error) {
      throw this.createError('OPEN_FILES_FAILED', 'Failed to open files', error);
    }
  }

  private async openFilesWithFileSystemAPI(options?: FileSystemOptions): Promise<ProjectFile[]> {
    const fileSystemOptions = {
      ...options,
      multiple: true
    };

    const fileHandles = await (window as any).showOpenFilePicker(fileSystemOptions);
    const projectFiles: ProjectFile[] = [];

    for (const fileHandle of fileHandles) {
      const file = await fileHandle.getFile();
      const content = await file.text();

      const projectFile: ProjectFile = {
        id: this.generateId(),
        name: file.name,
        path: file.name,
        relativePath: file.name,
        content,
        language: this.detectLanguage(file.name),
        lastModified: new Date(file.lastModified),
        size: file.size,
        isModified: false,
        metadata: {
          name: file.name,
          path: file.name,
          size: file.size,
          lastModified: new Date(file.lastModified),
          type: file.type || 'text/plain',
          language: this.detectLanguage(file.name)
        }
      };

      projectFiles.push(projectFile);
      await this.addToRecentFiles(projectFile);
    }

    this.emit('filesOpened', projectFiles);
    return projectFiles;
  }

  private async openFilesWithInput(options?: FileSystemOptions): Promise<ProjectFile[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      
      if (options?.types && options.types.length > 0) {
        const extensions = options.types.flatMap(type => 
          Object.values(type.accept).flat()
        );
        input.accept = extensions.join(',');
      } else {
        input.accept = '.py,.js,.jsx,.cpp,.cc,.cxx,.txt';
      }

      input.onchange = async (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);
        if (files.length === 0) {
          reject(new Error('No files selected'));
          return;
        }

        try {
          const projectFiles: ProjectFile[] = [];

          for (const file of files) {
            const content = await file.text();
            const projectFile: ProjectFile = {
              id: this.generateId(),
              name: file.name,
              path: file.name,
              relativePath: file.name,
              content,
              language: this.detectLanguage(file.name),
              lastModified: new Date(file.lastModified),
              size: file.size,
              isModified: false,
              metadata: {
                name: file.name,
                path: file.name,
                size: file.size,
                lastModified: new Date(file.lastModified),
                type: file.type || 'text/plain',
                language: this.detectLanguage(file.name)
              }
            };

            projectFiles.push(projectFile);
            await this.addToRecentFiles(projectFile);
          }

          this.emit('filesOpened', projectFiles);
          resolve(projectFiles);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  async saveFile(file: ProjectFile, options?: SaveFileOptions): Promise<void> {
    try {
      if (this.supportsFileSystemAPI) {
        await this.saveFileWithFileSystemAPI(file, options);
      } else {
        await this.downloadFile(file);
      }
      
      file.isModified = false;
      file.lastModified = new Date();
      
      // Create backup if enabled
      const settings = await this.getProjectSettings(file.projectId);
      if (settings?.backupEnabled) {
        await this.createBackup(file);
      }
      
      this.emit('fileSaved', file);
    } catch (error) {
      throw this.createError('SAVE_FILE_FAILED', 'Failed to save file', error);
    }
  }

  private async saveFileWithFileSystemAPI(file: ProjectFile, options?: SaveFileOptions): Promise<void> {
    const saveOptions = {
      suggestedName: options?.suggestedName || file.name,
      types: options?.types || [
        {
          description: 'Code files',
          accept: {
            'text/plain': ['.py', '.js', '.jsx', '.cpp', '.cc', '.cxx', '.txt']
          }
        }
      ]
    };

    const fileHandle = await (window as any).showSaveFilePicker(saveOptions);
    const writable = await fileHandle.createWritable();
    await writable.write(file.content || '');
    await writable.close();
  }

  async saveFileAs(file: ProjectFile, options?: SaveFileOptions): Promise<void> {
    return this.saveFile(file, options);
  }

  private async downloadFile(file: ProjectFile): Promise<void> {
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async openProject(path?: string): Promise<Project> {
    // For browser implementation, we'll create a basic project structure
    const project: Project = {
      id: this.generateId(),
      name: path ? path.split('/').pop() || 'Untitled Project' : 'New Project',
      path: path || '',
      files: [],
      lastOpened: new Date(),
      settings: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        backupEnabled: true,
        maxBackups: 5
      }
    };

    await this.saveProject(project);
    this.emit('projectOpened', project);
    return project;
  }

  async saveProject(project: Project): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      
      const request = store.put(project);
      request.onsuccess = () => {
        this.emit('projectSaved', project);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentProjects(): Promise<Project[]> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      
      const request = store.getAll();
      request.onsuccess = () => {
        const projects = request.result.sort((a, b) => 
          b.lastOpened.getTime() - a.lastOpened.getTime()
        );
        resolve(projects.slice(0, 10)); // Return last 10 projects
      };
      request.onerror = () => reject(request.error);
    });
  }

  createFile(name: string, content = '', language?: string): ProjectFile {
    const file: ProjectFile = {
      id: this.generateId(),
      name,
      path: name,
      relativePath: name,
      content,
      language: language as SupportedLanguage || this.detectLanguage(name),
      lastModified: new Date(),
      size: new Blob([content]).size,
      isModified: false,
      metadata: {
        name,
        path: name,
        size: new Blob([content]).size,
        lastModified: new Date(),
        type: 'text/plain',
        language: language || this.detectLanguage(name)
      }
    };

    this.emit('fileCreated', file);
    return file;
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const request = store.delete(fileId);
      request.onsuccess = () => {
        this.emit('fileDeleted', { fileId });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const getRequest = store.get(fileId);
      getRequest.onsuccess = () => {
        const file = getRequest.result;
        if (file) {
          file.name = newName;
          file.language = this.detectLanguage(newName);
          file.lastModified = new Date();
          
          const putRequest = store.put(file);
          putRequest.onsuccess = () => {
            this.emit('fileRenamed', { fileId, newName });
            resolve();
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('File not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async duplicateFile(fileId: string, newName?: string): Promise<ProjectFile> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      
      const getRequest = store.get(fileId);
      getRequest.onsuccess = () => {
        const originalFile = getRequest.result;
        if (originalFile) {
          const duplicatedFile: ProjectFile = {
            ...originalFile,
            id: this.generateId(),
            name: newName || `Copy of ${originalFile.name}`,
            lastModified: new Date(),
            isModified: false
          };
          
          const putRequest = store.put(duplicatedFile);
          putRequest.onsuccess = () => {
            this.emit('fileDuplicated', duplicatedFile);
            resolve(duplicatedFile);
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('File not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async createBackup(file: ProjectFile): Promise<FileVersion> {
    if (!this.db) await this.initIndexedDB();
    
    const version: FileVersion = {
      id: this.generateId(),
      fileId: file.id,
      content: file.content || '',
      timestamp: new Date(),
      description: `Auto-backup of ${file.name}`,
      size: new Blob([file.content || '']).size
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['versions'], 'readwrite');
      const store = transaction.objectStore('versions');
      
      const request = store.put(version);
      request.onsuccess = () => {
        this.emit('backupCreated', version);
        resolve(version);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['versions'], 'readonly');
      const store = transaction.objectStore('versions');
      const index = store.index('fileId');
      
      const request = index.getAll(fileId);
      request.onsuccess = () => {
        const versions = request.result.sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async restoreVersion(versionId: string): Promise<ProjectFile> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['versions', 'files'], 'readwrite');
      const versionStore = transaction.objectStore('versions');
      const fileStore = transaction.objectStore('files');
      
      const getVersionRequest = versionStore.get(versionId);
      getVersionRequest.onsuccess = () => {
        const version = getVersionRequest.result;
        if (version) {
          const getFileRequest = fileStore.get(version.fileId);
          getFileRequest.onsuccess = () => {
            const file = getFileRequest.result;
            if (file) {
              file.content = version.content;
              file.lastModified = new Date();
              file.isModified = true;
              
              const putRequest = fileStore.put(file);
              putRequest.onsuccess = () => {
                this.emit('versionRestored', { versionId, file });
                resolve(file);
              };
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              reject(new Error('File not found'));
            }
          };
          getFileRequest.onerror = () => reject(getFileRequest.error);
        } else {
          reject(new Error('Version not found'));
        }
      };
      getVersionRequest.onerror = () => reject(getVersionRequest.error);
    });
  }

  async getStorageInfo(): Promise<StorageInfo> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        total: estimate.quota || 0,
        type: 'indexedDB'
      };
    } else {
      // Fallback for browsers that don't support storage API
      return {
        used: 0,
        available: 5 * 1024 * 1024, // 5MB estimate
        total: 5 * 1024 * 1024,
        type: 'localStorage'
      };
    }
  }

  async clearStorage(): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files', 'projects', 'versions', 'recentFiles'], 'readwrite');
      
      Promise.all([
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('files').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('projects').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('versions').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        }),
        new Promise<void>((res, rej) => {
          const req = transaction.objectStore('recentFiles').clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        })
      ]).then(() => {
        this.emit('storageCleared', {});
        resolve();
      }).catch(reject);
    });
  }

  async addToRecentFiles(file: ProjectFile): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    const recentFile: RecentFile = {
      id: file.id,
      name: file.name,
      path: file.path,
      language: file.language || 'python',
      lastOpened: new Date(),
      projectId: file.projectId
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentFiles'], 'readwrite');
      const store = transaction.objectStore('recentFiles');
      
      const request = store.put(recentFile);
      request.onsuccess = () => {
        this.emit('recentFileAdded', recentFile);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRecentFiles(): Promise<RecentFile[]> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentFiles'], 'readonly');
      const store = transaction.objectStore('recentFiles');
      const index = store.index('lastOpened');
      
      const request = index.getAll();
      request.onsuccess = () => {
        const recentFiles = request.result
          .sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime())
          .slice(0, 20); // Keep last 20 files
        resolve(recentFiles);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromRecentFiles(fileId: string): Promise<void> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentFiles'], 'readwrite');
      const store = transaction.objectStore('recentFiles');
      
      const request = store.delete(fileId);
      request.onsuccess = () => {
        this.emit('recentFileRemoved', { fileId });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async searchFiles(query: string, projectId?: string): Promise<FileSearchResult[]> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const request = store.getAll();
      request.onsuccess = () => {
        const files = request.result;
        const results: FileSearchResult[] = [];
        
        const searchRegex = new RegExp(query, 'gi');
        
        for (const file of files) {
          if (projectId && file.projectId !== projectId) continue;
          
          const matches: FileSearchResult['matches'] = [];
          const lines = (file.content || '').split('\n');
          
          lines.forEach((line, lineIndex) => {
            let match;
            while ((match = searchRegex.exec(line)) !== null) {
              matches.push({
                line: lineIndex + 1,
                column: match.index + 1,
                text: match[0],
                preview: line.trim()
              });
            }
            searchRegex.lastIndex = 0; // Reset regex
          });
          
          // Also search in filename
          if (searchRegex.test(file.name)) {
            matches.push({
              line: 0,
              column: 0,
              text: file.name,
              preview: `Filename: ${file.name}`
            });
          }
          searchRegex.lastIndex = 0; // Reset regex
          
          if (matches.length > 0) {
            results.push({ file, matches });
          }
        }
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  enableAutoSave(fileId: string, interval = 30000): void {
    // Clear existing interval if any
    this.disableAutoSave(fileId);
    
    const intervalId = setInterval(async () => {
      try {
        // Get the current file and save it
        const file = await this.getFileById(fileId);
        if (file && file.isModified) {
          await this.saveFile(file);
          this.emit('autoSaved', { fileId });
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        this.emit('autoSaveError', { fileId, error });
      }
    }, interval);
    
    this.autoSaveIntervals.set(fileId, intervalId);
    this.emit('autoSaveEnabled', { fileId, interval });
  }

  disableAutoSave(fileId: string): void {
    const intervalId = this.autoSaveIntervals.get(fileId);
    if (intervalId) {
      clearInterval(intervalId);
      this.autoSaveIntervals.delete(fileId);
      this.emit('autoSaveDisabled', { fileId });
    }
  }

  addEventListener(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // Helper methods
  private async getFileById(fileId: string): Promise<ProjectFile | null> {
    if (!this.db) await this.initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      
      const request = store.get(fileId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getProjectSettings(projectId?: string): Promise<ProjectSettings | null> {
    if (!projectId || !this.db) return null;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      
      const request = store.get(projectId);
      request.onsuccess = () => {
        const project = request.result;
        resolve(project ? project.settings : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private createError(code: string, message: string, details?: any): FileOperationError {
    return { code, message, details };
  }
}