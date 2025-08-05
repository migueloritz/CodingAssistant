import React, { useState, useRef } from 'react';
import { FileContent, SupportedLanguage } from '../../types';
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
  Search
} from 'lucide-react';
import './FileManager.css';

interface FileManagerProps {
  currentFile: FileContent | null;
  onFileOpen: (file: FileContent) => void;
  onFileSave: (file: FileContent) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  currentFile,
  onFileOpen,
  onFileSave,
}) => {
  const [recentFiles, setRecentFiles] = useState<FileContent[]>([
    {
      name: 'example.py',
      path: '/examples/example.py',
      content: 'print("Hello, World!")\n\ndef calculate_fibonacci(n):\n    if n <= 1:\n        return n\n    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)',
      language: 'python',
      lastModified: new Date(Date.now() - 3600000), // 1 hour ago
    },
    {
      name: 'script.js',
      path: '/examples/script.js',
      content: 'console.log("Hello, World!");\n\nfunction fibonacci(n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}',
      language: 'javascript',
      lastModified: new Date(Date.now() - 7200000), // 2 hours ago
    },
    {
      name: 'main.cpp',
      path: '/examples/main.cpp',
      content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
      language: 'cpp',
      lastModified: new Date(Date.now() - 86400000), // 1 day ago
    },
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLanguageIcon = (language: SupportedLanguage) => {
    const icons = {
      python: '🐍',
      javascript: '⚡',
      cpp: '⚙️',
    };
    return icons[language] || '📄';
  };


  const formatFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
    const newFile: FileContent = {
      name: 'untitled.py',
      path: '',
      content: '# New file\nprint("Hello, World!")',
      language: 'python',
      lastModified: new Date(),
    };
    onFileOpen(newFile);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      let language: SupportedLanguage = 'python';
      if (extension === 'js' || extension === 'jsx') language = 'javascript';
      else if (extension === 'cpp' || extension === 'cc' || extension === 'cxx') language = 'cpp';

      const newFile: FileContent = {
        name: file.name,
        path: file.name,
        content,
        language,
        lastModified: new Date(file.lastModified),
      };

      setRecentFiles(prev => [newFile, ...prev.slice(0, 9)]);
      onFileOpen(newFile);
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleDownload = (file: FileContent) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCurrentFile = () => {
    if (currentFile) {
      onFileSave(currentFile);
      // Update in recent files
      setRecentFiles(prev => {
        const existing = prev.findIndex(f => f.path === currentFile.path);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...currentFile, lastModified: new Date() };
          return updated;
        }
        return [{ ...currentFile, lastModified: new Date() }, ...prev.slice(0, 9)];
      });
    }
  };

  const filteredFiles = recentFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.language.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <div className="header-title">
          <Folder size={18} />
          <span>Files</span>
        </div>
        
        <div className="header-actions">
          <button
            className="action-btn"
            onClick={handleCreateNew}
            title="Create new file"
          >
            <Plus size={16} />
          </button>
          
          <button
            className="action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
            <Upload size={16} />
          </button>
          
          <button
            className="action-btn"
            onClick={handleSaveCurrentFile}
            disabled={!currentFile}
            title="Save current file"
          >
            <Save size={16} />
          </button>
        </div>
      </div>

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

      {currentFile && (
        <div className="current-file-section">
          <div className="section-header">
            <FolderOpen size={14} />
            <span>Current File</span>
          </div>
          
          <div className={`file-item current-file`}>
            <div className="file-icon">
              <span className="language-emoji">{getLanguageIcon(currentFile.language)}</span>
            </div>
            
            <div className="file-info">
              <div className="file-name">{currentFile.name}</div>
              <div className="file-meta">
                <span className="file-language">{currentFile.language.toUpperCase()}</span>
                <span className="file-size">{formatFileSize(currentFile.content)}</span>
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
                key={`${file.path}-${index}`}
                className={`file-item ${currentFile?.path === file.path ? 'active' : ''}`}
                onClick={() => onFileOpen(file)}
              >
                <div className="file-icon">
                  <span className="language-emoji">{getLanguageIcon(file.language)}</span>
                </div>
                
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-meta">
                    <span className="file-language">{file.language.toUpperCase()}</span>
                    <span className="file-modified">{formatLastModified(file.lastModified)}</span>
                  </div>
                </div>
                
                <div className="file-actions">
                  <button
                    className="file-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(showMenu === file.path ? null : file.path);
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                  
                  {showMenu === file.path && (
                    <div className="file-context-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFileOpen(file);
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
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};