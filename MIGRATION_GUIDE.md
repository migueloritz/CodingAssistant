# Migration Guide: Enhanced File System

This guide helps you transition from the basic FileManager to the enhanced file management system.

## Quick Migration Steps

### 1. Update Imports

**Old:**
```typescript
import { FileManager } from './components/FileManager/FileManager';
```

**New:**
```typescript
import { EnhancedFileManager } from './components/FileManager/EnhancedFileManager';
import { useFileManager } from './hooks/useFileManager';
```

### 2. Replace FileManager Usage

**Old App.tsx Pattern:**
```typescript
function App() {
  const [currentFile, setCurrentFile] = useState<FileContent | null>(null);
  
  const handleFileOpen = (file: FileContent) => {
    setCurrentFile(file);
    setCode(file.content);
    setLanguage(file.language);
  };

  return (
    <FileManager
      currentFile={currentFile}
      onFileOpen={handleFileOpen}
      onFileSave={handleFileSave}
    />
  );
}
```

**New App.tsx Pattern:**
```typescript
function App() {
  const fileManager = useFileManager({
    autoSaveInterval: 30000,
    enableVersioning: true
  });
  
  const currentFile = fileManager.activeFile;
  
  const handleFileOpen = async (file: FileContent) => {
    await fileManager.openFile(file);
    setCode(file.content);
    setLanguage(file.language);
  };

  const handleTabClose = (fileId: string) => {
    fileManager.closeFile(fileId);
  };

  const handleTabSwitch = (file: FileContent) => {
    fileManager.switchToFile(file);
    setCode(file.content);
    setLanguage(file.language);
  };

  return (
    <EnhancedFileManager
      currentFile={currentFile}
      onFileOpen={handleFileOpen}
      onFileSave={fileManager.saveFile}
      openFiles={fileManager.openFiles}
      onTabClose={handleTabClose}
      onTabSwitch={handleTabSwitch}
      activeProject={fileManager.activeProject}
      onProjectOpen={fileManager.openProject}
    />
  );
}
```

### 3. Handle New File Operations

**File Creation:**
```typescript
// Old way - manual file creation
const newFile: FileContent = {
  name: 'untitled.py',
  path: '',
  content: '# New file',
  language: 'python',
  lastModified: new Date(),
};

// New way - use file manager
const newFile = fileManager.createNewFile('untitled.py', '# New file', 'python');
```

**File Saving:**
```typescript
// Old way - basic save indication
const handleFileSave = (file: FileContent) => {
  console.log('Saving file:', file.name);
};

// New way - real file system integration
const handleFileSave = async (file: FileContent) => {
  await fileManager.saveFile(file);
  // File is automatically saved to user's system
};
```

### 4. Access New Features

**Auto-save Control:**
```typescript
// Enable/disable auto-save
fileManager.toggleAutoSave();

// Check auto-save status
const isAutoSaveEnabled = fileManager.autoSaveEnabled;
```

**Project Operations:**
```typescript
// Open project
const project = await fileManager.openProject();

// Access current project
const currentProject = fileManager.activeProject;

// Close project
fileManager.closeProject();
```

**File Analysis:**
```typescript
import { fileAnalysisService } from '../services/storage';

// Analyze current file
if (currentFile) {
  const analysis = fileAnalysisService.analyzeFile(
    currentFile.content, 
    currentFile.language
  );
  
  console.log('Functions found:', analysis.functions);
  console.log('Code complexity:', analysis.complexity);
  console.log('Readability score:', analysis.readability);
}
```

## Breaking Changes

### FileContent Interface Updates

The `FileContent` interface now includes additional optional properties:

```typescript
interface FileContent {
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage;
  lastModified: Date;
  id?: string;           // NEW: Unique identifier
  isModified?: boolean;  // NEW: Modification status
  size?: number;         // NEW: File size in bytes
}
```

### New Event Handlers

The EnhancedFileManager requires additional props:

```typescript
interface EnhancedFileManagerProps {
  // Existing props
  currentFile: FileContent | null;
  onFileOpen: (file: FileContent) => void;
  onFileSave: (file: FileContent) => void;
  
  // New props
  openFiles?: FileContent[];                    // List of open files
  onTabClose?: (fileId: string) => void;       // Tab close handler
  onTabSwitch?: (file: FileContent) => void;   // Tab switch handler
  activeProject?: Project | null;              // Current project
  onProjectOpen?: (project: Project) => void;  // Project open handler
}
```

## Gradual Migration Strategy

### Phase 1: Basic Migration
1. Replace `FileManager` with `EnhancedFileManager`
2. Add `useFileManager` hook
3. Update file open/save handlers
4. Test basic functionality

### Phase 2: Enhanced Features
1. Implement tab management
2. Add project support
3. Enable auto-save
4. Add drag-and-drop support

### Phase 3: Advanced Features
1. Implement version history
2. Add file analysis
3. Configure storage options
4. Add keyboard shortcuts

## Common Issues and Solutions

### Issue: Files not persisting after browser refresh
**Solution:** The enhanced system uses IndexedDB for metadata but actual file content needs to be saved to the user's system. Use the save functionality to persist files.

### Issue: Auto-save not working
**Solution:** Ensure files have unique IDs and auto-save is enabled:
```typescript
// Check if auto-save is enabled
console.log('Auto-save enabled:', fileManager.autoSaveEnabled);

// Enable auto-save if disabled
if (!fileManager.autoSaveEnabled) {
  fileManager.toggleAutoSave();
}
```

### Issue: Drag and drop not working
**Solution:** Ensure proper file types are being dropped and the drop zone is visible:
```typescript
// Check supported file types
const supportedExtensions = ['.py', '.js', '.jsx', '.cpp', '.cc', '.cxx', '.txt'];
```

### Issue: Tab system not updating
**Solution:** Ensure proper state synchronization:
```typescript
// Update code when switching tabs
const handleTabSwitch = (file: FileContent) => {
  fileManager.switchToFile(file);
  setCode(file.content);        // Update editor content
  setLanguage(file.language);   // Update language selector
};
```

## Testing the Migration

### Basic Functionality Tests
1. Create new file ✓
2. Open existing file ✓
3. Save file to system ✓
4. File content persists in editor ✓

### Enhanced Features Tests
1. Multiple files open in tabs ✓
2. Tab switching works correctly ✓
3. Auto-save indicators appear ✓
4. Drag and drop files works ✓
5. Recent files list updates ✓

### Error Handling Tests
1. Invalid file types are rejected ✓
2. Network errors are handled gracefully ✓
3. Storage quota exceeded handled ✓
4. File access denied handled ✓

## Support and Troubleshooting

If you encounter issues during migration:

1. **Check browser compatibility** - Ensure you're using a modern browser
2. **Verify file permissions** - Some browsers require user interaction for file operations
3. **Clear browser storage** - Clear IndexedDB if experiencing storage issues
4. **Check console errors** - Look for specific error messages in browser console

For additional help, refer to the comprehensive documentation in `FILE_SYSTEM_ENHANCEMENTS.md`.