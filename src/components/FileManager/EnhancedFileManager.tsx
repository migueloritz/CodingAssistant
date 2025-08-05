import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileContent, SupportedLanguage, ProjectFile, Project, FileVersion, RecentFile } from '../../types';
import { fileSystemService } from '../../services/storage';
import { 
  Folder, 
  Plus, 
  Download, 
  Upload, 
  MoreVertical,
  Clock,
  Code,
  Save,
  FolderOpen,
  FileText,
  Search,
  X,
  Settings,
  History,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FolderPlus,
  Copy,
  Trash2,
  Edit3,
  UploadCloud
} from 'lucide-react';
import './FileManager.css';

interface EnhancedFileManagerProps {
  currentFile: FileContent | null;
  onFileOpen: (file: FileContent) => void;
  onFileSave: (file: FileContent) => void;
  openFiles?: FileContent[];
  onTabClose?: (fileId: string) => void;
  onTabSwitch?: (file: FileContent) => void;
  activeProject?: Project | null;
  onProjectOpen?: (project: Project) => void;
}

export const EnhancedFileManager: React.FC<EnhancedFileManagerProps> = ({
  currentFile,
  onFileOpen,
  onFileSave,
  openFiles = [],
  onTabClose,
  onTabSwitch,
  activeProject,
  onProjectOpen,
}) => {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showFileStats, setShowFileStats] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fileStats, setFileStats] = useState<{
    lines: number;
    characters: number;
    size: number;
    language: string;
  } | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Load recent files and projects on mount
  useEffect(() => {
    loadRecentFiles();
    loadRecentProjects();
    
    // Set up auto-save for current file
    if (currentFile?.id) {
      fileSystemService.enableAutoSave(currentFile.id, 30000); // 30 seconds
    }
    
    // Listen to file system events
    const handleAutoSaved = (data: { fileId: string }) => {
      if (data.fileId === currentFile?.id) {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    };
    
    const handleAutoSaveError = (data: { fileId: string; error: any }) => {
      if (data.fileId === currentFile?.id) {
        setAutoSaveStatus('error');
        setError('Auto-save failed: ' + data.error.message);
      }
    };
    
    fileSystemService.addEventListener('autoSaved', handleAutoSaved);
    fileSystemService.addEventListener('autoSaveError', handleAutoSaveError);
    
    return () => {
      if (currentFile?.id) {
        fileSystemService.disableAutoSave(currentFile.id);
      }
      fileSystemService.removeEventListener('autoSaved', handleAutoSaved);
      fileSystemService.removeEventListener('autoSaveError', handleAutoSaveError);
    };
  }, [currentFile?.id]);
  
  // Update file stats when current file changes
  useEffect(() => {
    if (currentFile?.content) {
      const lines = currentFile.content.split('\n').length;
      const characters = currentFile.content.length;
      const size = new Blob([currentFile.content]).size;
      
      setFileStats({
        lines,
        characters,
        size,
        language: currentFile.language
      });
    } else {
      setFileStats(null);
    }
  }, [currentFile]);
  
  const loadRecentFiles = async () => {
    try {
      const files = await fileSystemService.getRecentFiles();
      setRecentFiles(files);
    } catch (error) {
      console.error('Failed to load recent files:', error);
    }
  };
  
  const loadRecentProjects = async () => {
    try {
      const projectList = await fileSystemService.getRecentProjects();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load recent projects:', error);
    }
  };
  
  const loadFileVersions = async (fileId: string) => {
    try {
      const fileVersions = await fileSystemService.getFileVersions(fileId);
      setVersions(fileVersions);
    } catch (error) {
      console.error('Failed to load file versions:', error);
    }
  };

  const getLanguageIcon = (language: SupportedLanguage) => {
    const icons = {
      python: '🐍',
      javascript: '⚡',
      cpp: '⚙️',
    };
    return icons[language] || '📄';
  };

  const formatFileSize = (size: number) => {
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileSizeClass = (size: number) => {
    if (size > 1024 * 1024) return 'huge'; // > 1MB
    if (size > 100 * 1024) return 'large'; // > 100KB
    return '';
  };

  const formatLastModified = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleCreateNew = () => {
    const newFile = fileSystemService.createFile('untitled.py', '# New file\nprint("Hello, World!")');
    const fileContent: FileContent = {
      name: newFile.name,
      path: newFile.path,
      content: newFile.content || '',
      language: newFile.language as SupportedLanguage,
      lastModified: newFile.lastModified,
      id: newFile.id,
      isModified: false,
      size: newFile.size
    };
    onFileOpen(fileContent);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    setIsLoading(true);
    setError(null);

    try {
      if (files.length === 1) {
        const projectFile = await fileSystemService.openFile();
        const fileContent: FileContent = {
          name: projectFile.name,
          path: projectFile.path,
          content: projectFile.content || '',
          language: projectFile.language as SupportedLanguage,
          lastModified: projectFile.lastModified,
          id: projectFile.id,
          isModified: false,
          size: projectFile.size
        };
        onFileOpen(fileContent);
      } else {
        const projectFiles = await fileSystemService.openFiles();
        projectFiles.forEach(projectFile => {
          const fileContent: FileContent = {
            name: projectFile.name,
            path: projectFile.path,
            content: projectFile.content || '',
            language: projectFile.language as SupportedLanguage,
            lastModified: projectFile.lastModified,
            id: projectFile.id,
            isModified: false,
            size: projectFile.size
          };
          onFileOpen(fileContent);
        });
      }
      
      await loadRecentFiles();
    } catch (error: any) {
      setError('Failed to open file: ' + error.message);
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    setIsLoading(true);
    setError(null);

    try {
      for (const file of files) {
        if (file.type.startsWith('text/') || 
            ['.py', '.js', '.jsx', '.cpp', '.cc', '.cxx', '.txt'].some(ext => file.name.endsWith(ext))) {
          
          const content = await file.text();
          const projectFile = fileSystemService.createFile(file.name, content);
          const fileContent: FileContent = {
            name: projectFile.name,
            path: projectFile.path,
            content: projectFile.content || '',
            language: projectFile.language as SupportedLanguage,
            lastModified: new Date(file.lastModified),
            id: projectFile.id,
            isModified: false,
            size: projectFile.size
          };
          
          onFileOpen(fileContent);
          await fileSystemService.addToRecentFiles(projectFile);
        }
      }
      
      await loadRecentFiles();
    } catch (error: any) {
      setError('Failed to process dropped files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [onFileOpen]);

  const handleDownload = async (file: FileContent | RecentFile) => {
    const content = 'content' in file ? file.content : '';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCurrentFile = async () => {
    if (!currentFile) return;

    setAutoSaveStatus('saving');
    setError(null);

    try {
      const projectFile: ProjectFile = {
        id: currentFile.id || fileSystemService.createFile(currentFile.name, currentFile.content).id,
        name: currentFile.name,
        path: currentFile.path,
        relativePath: currentFile.name,
        content: currentFile.content,
        language: currentFile.language,
        lastModified: new Date(),
        size: new Blob([currentFile.content]).size,
        isModified: false
      };

      await fileSystemService.saveFile(projectFile);
      onFileSave(currentFile);
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error: any) {
      setAutoSaveStatus('error');
      setError('Failed to save file: ' + error.message);
    }
  };

  const handleOpenProject = async () => {
    try {
      setIsLoading(true);
      const project = await fileSystemService.openProject();
      if (onProjectOpen) {
        onProjectOpen(project);
      }
      await loadRecentProjects();
    } catch (error: any) {
      setError('Failed to open project: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabClose = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTabClose) {
      onTabClose(fileId);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      setIsLoading(true);
      const restoredFile = await fileSystemService.restoreVersion(versionId);
      const fileContent: FileContent = {
        name: restoredFile.name,
        path: restoredFile.path,
        content: restoredFile.content || '',
        language: restoredFile.language as SupportedLanguage,
        lastModified: restoredFile.lastModified,
        id: restoredFile.id,
        isModified: true,
        size: restoredFile.size
      };
      onFileOpen(fileContent);
      setShowVersionHistory(false);
    } catch (error: any) {
      setError('Failed to restore version: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiles = recentFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return (
          <div className="auto-save-indicator saving">
            <RefreshCw size={10} className="spin" />
            Saving...
          </div>
        );
      case 'saved':
        return (
          <div className="auto-save-indicator">
            <CheckCircle size={10} />
            Saved
          </div>
        );
      case 'error':
        return (
          <div className="auto-save-indicator error">
            <AlertCircle size={10} />
            Error
          </div>
        );
      default:
        return null;
    }
  };

  const renderFileTabs = () => {
    if (openFiles.length <= 1) return null;

    return (
      <div className="file-tabs">
        {openFiles.map((file) => (
          <button
            key={file.id || file.name}
            className={`file-tab ${currentFile?.id === file.id ? 'active' : ''}`}
            onClick={() => onTabSwitch?.(file)}
            title={file.path}
          >
            <span className="language-emoji">{getLanguageIcon(file.language)}</span>
            <span className="tab-name">{file.name}</span>
            {file.isModified && <div className="tab-modified" />}
            <button
              className="tab-close"
              onClick={(e) => handleTabClose(file.id || file.name, e)}
              title="Close file"
            >
              <X size={12} />
            </button>
          </button>
        ))}
      </div>
    );
  };

  const renderProjectSection = () => {
    if (!activeProject && projects.length === 0) return null;

    return (
      <div className="project-section">
        <div className="project-header">
          <div className="project-info">
            <FolderOpen size={16} />
            <div>
              <div className="project-name">
                {activeProject?.name || 'No Project'}
              </div>
              {activeProject?.path && (
                <div className="project-path">{activeProject.path}</div>
              )}
            </div>
          </div>
          <button
            className="action-btn"
            onClick={handleOpenProject}
            title="Open project"
          >
            <FolderPlus size={14} />
          </button>
        </div>
        
        {projects.length > 0 && (
          <div className="project-tree">
            {projects.slice(0, 5).map((project) => (
              <div
                key={project.id}
                className="tree-item folder"
                onClick={() => onProjectOpen?.(project)}
              >
                <Folder size={14} />
                <span>{project.name}</span>
                <span className="keyboard-hint">
                  {formatLastModified(project.lastOpened)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderVersionHistory = () => {
    if (!showVersionHistory || !currentFile?.id) return null;

    return (
      <div className="version-history">
        <div className="section-header">
          <History size={14} />
          <span>Version History</span>
          <button
            className="action-btn"
            onClick={() => setShowVersionHistory(false)}
          >
            <X size={12} />
          </button>
        </div>
        {versions.map((version) => (
          <div key={version.id} className="version-item">
            <div className="version-info">
              <div className="version-date">
                {version.timestamp.toLocaleString()}
              </div>
              <div className="version-description">
                {version.description}
              </div>
            </div>
            <div className="version-actions">
              <button
                className="version-restore"
                onClick={() => handleRestoreVersion(version.id)}
              >
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFileStats = () => {
    if (!showFileStats || !fileStats) return null;

    return (
      <div className="file-stats">
        <div className="stats-row">
          <span>Lines:</span>
          <span>{fileStats.lines.toLocaleString()}</span>
        </div>
        <div className="stats-row">
          <span>Characters:</span>
          <span>{fileStats.characters.toLocaleString()}</span>
        </div>
        <div className="stats-row">
          <span>Size:</span>
          <span>{formatFileSize(fileStats.size)}</span>
        </div>
        <div className="stats-row">
          <span>Language:</span>
          <span>{fileStats.language.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className="file-manager"
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="file-manager-header">
        <div className="header-title">
          <Folder size={18} />
          <span>Files</span>
          {renderAutoSaveIndicator()}
        </div>
        
        <div className="header-actions">
          <button
            className="action-btn"
            onClick={handleCreateNew}
            title="Create new file (Ctrl+N)"
          >
            <Plus size={16} />
          </button>
          
          <button
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file (Ctrl+O)"
          >
            <Upload size={16} />
          </button>
          
          <button
            className="action-btn"
            onClick={handleSaveCurrentFile}
            disabled={!currentFile || isLoading}
            title="Save current file (Ctrl+S)"
          >
            <Save size={16} />
          </button>

          <button
            className="action-btn"
            onClick={() => setShowFileStats(!showFileStats)}
            title="Toggle file statistics"
          >
            <Settings size={16} />
          </button>

          {currentFile?.id && (
            <button
              className="action-btn"
              onClick={() => {
                setShowVersionHistory(!showVersionHistory);
                if (!showVersionHistory) {
                  loadFileVersions(currentFile.id!);
                }
              }}
              title="View version history"
            >
              <History size={16} />
            </button>
          )}
        </div>
      </div>

      {renderFileTabs()}

      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={14} />
          {error}
          <button
            className="action-btn"
            onClick={() => setError(null)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      )}

      {dragOver && (
        <div className="drag-drop-zone drag-over">
          <UploadCloud size={32} />
          <p>Drop files here to open them</p>
          <span>Supports .py, .js, .jsx, .cpp, .cc, .cxx, .txt files</span>
        </div>
      )}

      {renderProjectSection()}

      {currentFile && (
        <div className="current-file-section">
          <div className="section-header">
            <FolderOpen size={14} />
            <span>Current File</span>
          </div>
          
          <div className="file-item current-file">
            <div className="file-icon">
              <span className="language-emoji">{getLanguageIcon(currentFile.language)}</span>
            </div>
            
            <div className="file-info">
              <div className="file-name">{currentFile.name}</div>
              <div className="file-meta">
                <span className="file-language">{currentFile.language.toUpperCase()}</span>
                <span className={`file-size ${getFileSizeClass(currentFile.size || 0)}`}>
                  {formatFileSize(currentFile.size || new Blob([currentFile.content]).size)}
                </span>
                {currentFile.isModified && <div className="tab-modified" />}
              </div>
            </div>
            
            <button
              className="file-menu-btn"
              onClick={() => handleDownload(currentFile)}
              title="Download file"
            >
              <Download size={14} />
            </button>
          </div>
        </div>
      )}

      {renderFileStats()}
      {renderVersionHistory()}

      <div className="recent-files-section">
        <div className="section-header">
          <Clock size={14} />
          <span>Recent Files</span>
          <span className="file-count">({filteredFiles.length})</span>
        </div>
        
        <div className="file-list">
          {filteredFiles.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <p>No files found</p>
              <span>Upload or create a new file to get started</span>
            </div>
          ) : (
            filteredFiles.map((file, index) => (
              <div
                key={`${file.id}-${index}`}
                className={`file-item ${currentFile?.path === file.path ? 'active' : ''}`}
                onClick={() => {
                  // Convert RecentFile back to FileContent for compatibility
                  const fileContent: FileContent = {
                    name: file.name,
                    path: file.path,
                    content: '', // Will be loaded when opened
                    language: file.language as SupportedLanguage,
                    lastModified: file.lastOpened,
                    id: file.id
                  };
                  onFileOpen(fileContent);
                }}
              >
                <div className="file-icon">
                  <span className="language-emoji">{getLanguageIcon(file.language as SupportedLanguage)}</span>
                </div>
                
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    <span className="file-language">{file.language.toUpperCase()}</span>
                    <span className="file-modified">{formatLastModified(file.lastOpened)}</span>
                    {file.projectId && (
                      <div className="file-project-info">Project file</div>
                    )}
                  </div>
                </div>
                
                <div className="file-actions">
                  <button
                    className="file-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === file.id ? null : file.id);
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {showMenu === file.id && (
                    <div className="file-context-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const fileContent: FileContent = {
                            name: file.name,
                            path: file.path,
                            content: '',
                            language: file.language as SupportedLanguage,
                            lastModified: file.lastOpened,
                            id: file.id
                          };
                          onFileOpen(fileContent);
                          setShowMenu(null);
                        }}
                      >
                        <Code size={14} />
                        Open
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                          setShowMenu(null);
                        }}
                      >
                        <Download size={14} />
                        Download
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await fileSystemService.removeFromRecentFiles(file.id);
                          await loadRecentFiles();
                          setShowMenu(null);
                        }}
                      >
                        <Trash2 size={14} />
                        Remove from recent
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.js,.jsx,.cpp,.cc,.cxx,.txt"
        multiple
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};