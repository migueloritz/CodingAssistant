export interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

export interface FileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

export interface DirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandle>;
}

export interface FileSystemOptions {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
}

export interface SaveFileOptions {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}

export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  type: string;
  language?: string;
  encoding?: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  content?: string;
  language?: string;
  lastModified: Date;
  size: number;
  isModified?: boolean;
  metadata?: FileMetadata;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  files: ProjectFile[];
  activeFileId?: string;
  lastOpened: Date;
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  autoSave: boolean;
  autoSaveInterval: number; // in milliseconds
  backupEnabled: boolean;
  maxBackups: number;
  defaultLanguage?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  timestamp: Date;
  description?: string;
  size: number;
}

export interface StorageInfo {
  used: number;
  available: number;
  total: number;
  type: 'localStorage' | 'indexedDB' | 'fileSystem';
}

export interface RecentFile {
  id: string;
  name: string;
  path: string;
  language: string;
  lastOpened: Date;
  projectId?: string;
  isRemote?: boolean;
}

export interface FileSearchResult {
  file: ProjectFile;
  matches: Array<{
    line: number;
    column: number;
    text: string;
    preview: string;
  }>;
}

export interface StorageService {
  // File Operations
  openFile(options?: FileSystemOptions): Promise<ProjectFile>;
  openFiles(options?: FileSystemOptions): Promise<ProjectFile[]>;
  saveFile(file: ProjectFile, options?: SaveFileOptions): Promise<void>;
  saveFileAs(file: ProjectFile, options?: SaveFileOptions): Promise<void>;
  
  // Project Operations
  openProject(path?: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  getRecentProjects(): Promise<Project[]>;
  
  // File Management
  createFile(name: string, content?: string, language?: string): ProjectFile;
  deleteFile(fileId: string): Promise<void>;
  renameFile(fileId: string, newName: string): Promise<void>;
  duplicateFile(fileId: string, newName?: string): Promise<ProjectFile>;
  
  // Version Control
  createBackup(file: ProjectFile): Promise<FileVersion>;
  getFileVersions(fileId: string): Promise<FileVersion[]>;
  restoreVersion(versionId: string): Promise<ProjectFile>;
  
  // Storage Management
  getStorageInfo(): Promise<StorageInfo>;
  clearStorage(): Promise<void>;
  
  // Recent Files
  addToRecentFiles(file: ProjectFile): Promise<void>;
  getRecentFiles(): Promise<RecentFile[]>;
  removeFromRecentFiles(fileId: string): Promise<void>;
  
  // Search
  searchFiles(query: string, projectId?: string): Promise<FileSearchResult[]>;
  
  // Auto-save
  enableAutoSave(fileId: string, interval?: number): void;
  disableAutoSave(fileId: string): void;
  
  // Events
  addEventListener(event: string, callback: (data: any) => void): void;
  removeEventListener(event: string, callback: (data: any) => void): void;
}

export interface FileOperationError {
  code: string;
  message: string;
  details?: any;
}

export type FileOperationResult<T = any> = {
  success: true;
  data: T;
} | {
  success: false;
  error: FileOperationError;
};