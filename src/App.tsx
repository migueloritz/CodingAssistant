import { useState, useEffect, useCallback } from 'react';
import { CodeEditor } from './components/Editor/CodeEditor';
import { OutputPanel } from './components/OutputPanel/OutputPanel';
import { LanguageSelector } from './components/LanguageSelector/LanguageSelector';
import { ActionButtons } from './components/ActionButtons/ActionButtons';
import { EnhancedFileManager } from './components/FileManager/EnhancedFileManager';
import { SupportedLanguage, FileContent, OutputResult } from './types';
import { useAI } from './hooks/useAI';
import { useFileManager } from './hooks/useFileManager';
import './styles/App.css';

function App() {
  // Enhanced file management
  const fileManager = useFileManager({
    autoSaveInterval: 30000, // 30 seconds
    maxRecentFiles: 20,
    enableVersioning: true
  });
  
  // Legacy state for compatibility
  const [language, setLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>('# Welcome to Coding Assistant\n# Start typing your code here...\n\nprint("Hello, World!")');
  const [outputs, setOutputs] = useState<OutputResult[]>([]);
  
  // AI service integration
  const ai = useAI({
    defaultProvider: 'mock',
    enableStreaming: true,
    autoRetry: true
  });
  
  // Get current file from file manager
  const currentFile = fileManager.activeFile;

  // Initialize with default content
  useEffect(() => {
    if (fileManager.openFiles.length === 0) {
      const defaultFile = fileManager.createNewFile(
        'untitled.py',
        '# Welcome to Coding Assistant\n# Start typing your code here...\n\nprint("Hello, World!")',
        'python'
      );
      setCode(defaultFile.content);
      setLanguage(defaultFile.language);
    }
  }, [fileManager.openFiles.length]);

  // Handle language change - memoized to prevent unnecessary re-renders
  const handleLanguageChange = useCallback((newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    
    // Update current file if it exists
    if (currentFile) {
      const extension = newLanguage === 'python' ? '.py' : 
                      newLanguage === 'javascript' ? '.js' : '.cpp';
      
      // Update through file manager
      if (currentFile.id) {
        fileManager.updateFileContent(currentFile.id, currentFile.content);
      }
    } else {
      // Create new file with appropriate starter code
      const starterCode = {
        python: '# Welcome to Coding Assistant\n# Start typing your Python code here...\n\nprint("Hello, World!")',
        javascript: '// Welcome to Coding Assistant\n// Start typing your JavaScript code here...\n\nconsole.log("Hello, World!");',
        cpp: '// Welcome to Coding Assistant\n// Start typing your C++ code here...\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}'
      };
      
      const extension = newLanguage === 'python' ? '.py' : 
                       newLanguage === 'javascript' ? '.js' : '.cpp';
      
      const newFile = fileManager.createNewFile(
        `untitled${extension}`,
        starterCode[newLanguage],
        newLanguage
      );
      
      setCode(newFile.content);
    }
  }, [currentFile, fileManager]);

  // Handle code changes - memoized to prevent unnecessary re-renders
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (currentFile?.id) {
      fileManager.updateFileContent(currentFile.id, newCode);
    }
  }, [currentFile?.id, fileManager]);

  // Handle file operations
  const handleFileOpen = async (file: FileContent) => {
    await fileManager.openFile(file);
    setCode(file.content);
    setLanguage(file.language);
  };

  const handleFileSave = async (file: FileContent) => {
    await fileManager.saveFile(file);
  };
  
  const handleTabClose = (fileId: string) => {
    fileManager.closeFile(fileId);
    
    // Update code and language if active file changed
    const newActiveFile = fileManager.activeFile;
    if (newActiveFile) {
      setCode(newActiveFile.content);
      setLanguage(newActiveFile.language);
    } else {
      // No files open, create a new one
      const newFile = fileManager.createNewFile();
      setCode(newFile.content);
      setLanguage(newFile.language);
    }
  };
  
  const handleTabSwitch = (file: FileContent) => {
    fileManager.switchToFile(file);
    setCode(file.content);
    setLanguage(file.language);
  };

  // Handle actions with AI integration - memoized to prevent unnecessary re-renders
  const handleAction = useCallback(async (action: string) => {
    if (!code.trim()) {
      const errorOutput: OutputResult = {
        id: Date.now().toString(),
        type: 'execution',
        content: 'Error: No code to process',
        timestamp: new Date(),
        status: 'error',
        language,
      };
      setOutputs(prev => [errorOutput, ...prev]);
      return;
    }

    try {
      let response;
      let outputType: OutputResult['type'] = 'execution';
      let content = '';

      switch (action) {
        case 'generate':
          // For generation, we'll use a simple prompt based on the existing code
          const generateRequest = {
            prompt: `Continue or improve this ${language} code`,
            language,
            type: 'snippet' as const,
            description: `Continue or improve this ${language} code`,
            context: code
          };
          
          response = await ai.generateCode(generateRequest);
          outputType = 'execution';
          
          if (response) {
            content = `Generated Code:\n\n${response.code}\n\n${response.explanation || ''}`;
            
            // Optionally update the editor with generated code
            if (response.code && response.code.trim() !== code.trim()) {
              const updatedCode = code + '\n\n# Generated code:\n' + response.code;
              setCode(updatedCode);
              if (currentFile?.id) {
                fileManager.updateFileContent(currentFile.id, updatedCode);
              }
            }
          } else {
            content = 'Failed to generate code. Please try again.';
          }
          break;

        case 'explain':
          response = await ai.explainCode(code, language);
          outputType = 'explanation';
          content = response ? response.content : 'Failed to explain code. Please try again.';
          break;

        case 'improve':
          response = await ai.improveCode(code, language);
          outputType = 'improvement';
          content = response ? response.content : 'Failed to improve code. Please try again.';
          break;

        case 'debug':
          response = await ai.debugCode(code, language);
          outputType = 'analysis';
          content = response ? response.content : 'Failed to debug code. Please try again.';
          break;

        default:
          content = `Action "${action}" not implemented yet.`;
          break;
      }

      const newOutput: OutputResult = {
        id: Date.now().toString(),
        type: outputType,
        content,
        timestamp: new Date(),
        status: response ? 'success' : 'error',
        language,
      };
      
      setOutputs(prev => [newOutput, ...prev]);

    } catch (error) {
      const errorOutput: OutputResult = {
        id: Date.now().toString(),
        type: 'execution',
        content: `Error: ${error}`,
        timestamp: new Date(),
        status: 'error',
        language,
      };
      
      setOutputs(prev => [errorOutput, ...prev]);
    }
  }, [code, language, ai, currentFile, fileManager]);

  // Add AI status display in the status bar
  const getAIStatus = (): string => {
    if (ai.state.isLoading) return 'AI Processing...';
    if (ai.state.isStreaming) return 'AI Streaming...';
    if (ai.state.error) return `AI Error: ${ai.state.error}`;
    return `AI Ready (${ai.state.currentProvider})`;
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Coding Assistant</h1>
          <LanguageSelector
            currentLanguage={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
        
        <div className="header-right">
          <ActionButtons
            onAction={handleAction}
            isLoading={ai.state.isLoading || ai.state.isStreaming}
            disabled={!code.trim()}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Sidebar */}
        <aside className="app-sidebar">
          <EnhancedFileManager
            currentFile={currentFile}
            onFileOpen={handleFileOpen}
            onFileSave={handleFileSave}
          />
        </aside>

        {/* Editor Area */}
        <section className="app-editor">
          <CodeEditor
            content={code}
            language={language}
            onChange={handleCodeChange}
            theme="dark"
          />
        </section>

        {/* Output Panel */}
        <section className="app-output">
          <OutputPanel
            outputs={outputs}
            onClear={() => setOutputs([])}
          />
        </section>
      </main>

      {/* Status Bar */}
      <footer className="app-status-bar">
        <div className="status-left">
          <span className="status-item">
            {currentFile?.name || 'untitled'}
            {currentFile?.isModified && ' •'}
          </span>
          <span className="status-item">
            {language.toUpperCase()}
          </span>
          <span className="status-item">
            Lines: {code.split('\n').length}
          </span>
          {fileManager.openFiles.length > 1 && (
            <span className="status-item">
              {fileManager.openFiles.length} files open
            </span>
          )}
          {fileManager.activeProject && (
            <span className="status-item">
              Project: {fileManager.activeProject.name}
            </span>
          )}
        </div>
        
        <div className="status-right">
          <span className="status-item">
            {getAIStatus()}
          </span>
          {ai.state.availableProviders.length > 1 && (
            <select 
              className="status-item provider-selector"
              value={ai.state.currentProvider}
              onChange={(e) => ai.switchProvider(e.target.value)}
              disabled={ai.state.isLoading || ai.state.isStreaming}
            >
              {ai.state.availableProviders.map(provider => (
                <option key={provider} value={provider}>
                  {provider.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;