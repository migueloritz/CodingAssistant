import { SupportedLanguage } from '../../types';

export interface SyntaxValidationResult {
  isValid: boolean;
  errors: SyntaxError[];
  warnings: SyntaxWarning[];
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface SyntaxWarning {
  line: number;
  column: number;
  message: string;
  type: 'style' | 'performance' | 'best-practice';
}

export interface FileAnalysis {
  language: SupportedLanguage;
  lines: number;
  characters: number;
  words: number;
  functions: string[];
  classes: string[];
  imports: string[];
  complexity: 'low' | 'medium' | 'high';
  readability: number; // 0-100 score
  syntax: SyntaxValidationResult;
}

export class FileAnalysisService {
  private static instance: FileAnalysisService;

  public static getInstance(): FileAnalysisService {
    if (!FileAnalysisService.instance) {
      FileAnalysisService.instance = new FileAnalysisService();
    }
    return FileAnalysisService.instance;
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(filename: string): SupportedLanguage {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'mjs':
      case 'ts':
      case 'tsx':
        return 'javascript';
      case 'py':
      case 'pyw':
      case 'pyc':
        return 'python';
      case 'cpp':
      case 'cc':
      case 'cxx':
      case 'c++':
      case 'hpp':
      case 'h':
        return 'cpp';
      default:
        return 'python'; // default fallback
    }
  }

  /**
   * Analyze file content and return comprehensive analysis
   */
  analyzeFile(content: string, language: SupportedLanguage): FileAnalysis {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    return {
      language,
      lines: lines.length,
      characters: content.length,
      words: this.countWords(content),
      functions: this.extractFunctions(content, language),
      classes: this.extractClasses(content, language),
      imports: this.extractImports(content, language),
      complexity: this.calculateComplexity(content, language),
      readability: this.calculateReadability(content, language),
      syntax: this.validateSyntax(content, language)
    };
  }

  /**
   * Count words in code (excluding comments and strings where possible)
   */
  private countWords(content: string): number {
    // Simple word count - could be enhanced to exclude comments/strings
    const words = content.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  /**
   * Extract function names from code
   */
  private extractFunctions(content: string, language: SupportedLanguage): string[] {
    const functions: string[] = [];
    
    switch (language) {
      case 'python':
        const pythonFunctionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        let pythonMatch;
        while ((pythonMatch = pythonFunctionRegex.exec(content)) !== null) {
          functions.push(pythonMatch[1]);
        }
        break;
        
      case 'javascript':
        // Function declarations and expressions
        const jsFunctionRegex = /(?:function\s+([a-zA-Z_][a-zA-Z0-9_]*)|const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:\([^)]*\)\s*=>|function))/g;
        let jsMatch;
        while ((jsMatch = jsFunctionRegex.exec(content)) !== null) {
          functions.push(jsMatch[1] || jsMatch[2]);
        }
        break;
        
      case 'cpp':
        // C++ function definitions (basic pattern)
        const cppFunctionRegex = /(?:^|\n)\s*(?:[\w\s\*&:<>]+\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:\{|;)/g;
        let cppMatch;
        while ((cppMatch = cppFunctionRegex.exec(content)) !== null) {
          // Filter out common keywords
          const functionName = cppMatch[1];
          if (!['if', 'while', 'for', 'switch', 'catch'].includes(functionName)) {
            functions.push(functionName);
          }
        }
        break;
    }
    
    return functions;
  }

  /**
   * Extract class names from code
   */
  private extractClasses(content: string, language: SupportedLanguage): string[] {
    const classes: string[] = [];
    
    switch (language) {
      case 'python':
        const pythonClassRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let pythonMatch;
        while ((pythonMatch = pythonClassRegex.exec(content)) !== null) {
          classes.push(pythonMatch[1]);
        }
        break;
        
      case 'javascript':
        const jsClassRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let jsMatch;
        while ((jsMatch = jsClassRegex.exec(content)) !== null) {
          classes.push(jsMatch[1]);
        }
        break;
        
      case 'cpp':
        const cppClassRegex = /(?:class|struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        let cppMatch;
        while ((cppMatch = cppClassRegex.exec(content)) !== null) {
          classes.push(cppMatch[1]);
        }
        break;
    }
    
    return classes;
  }

  /**
   * Extract import/include statements
   */
  private extractImports(content: string, language: SupportedLanguage): string[] {
    const imports: string[] = [];
    
    switch (language) {
      case 'python':
        const pythonImportRegex = /(?:import\s+([a-zA-Z_][a-zA-Z0-9_.]*)|from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import)/g;
        let pythonMatch;
        while ((pythonMatch = pythonImportRegex.exec(content)) !== null) {
          imports.push(pythonMatch[1] || pythonMatch[2]);
        }
        break;
        
      case 'javascript':
        const jsImportRegex = /(?:import\s+.*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
        let jsMatch;
        while ((jsMatch = jsImportRegex.exec(content)) !== null) {
          imports.push(jsMatch[1] || jsMatch[2]);
        }
        break;
        
      case 'cpp':
        const cppIncludeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
        let cppMatch;
        while ((cppMatch = cppIncludeRegex.exec(content)) !== null) {
          imports.push(cppMatch[1]);
        }
        break;
    }
    
    return imports;
  }

  /**
   * Calculate code complexity (simplified)
   */
  private calculateComplexity(content: string, language: SupportedLanguage): 'low' | 'medium' | 'high' {
    const lines = content.split('\n').length;
    
    // Count control structures
    const controlPatterns = {
      python: /(?:if|elif|else|for|while|try|except|with|def|class)[\s:]/g,
      javascript: /(?:if|else|for|while|switch|case|try|catch|function|class)[\s({]/g,
      cpp: /(?:if|else|for|while|switch|case|try|catch|class|struct)[\s({]/g
    };
    
    const pattern = controlPatterns[language];
    const matches = content.match(pattern) || [];
    const complexity = matches.length;
    
    // Simple heuristic based on lines and control structures
    const complexityRatio = complexity / Math.max(lines, 1);
    
    if (complexityRatio > 0.3 || lines > 500) return 'high';
    if (complexityRatio > 0.15 || lines > 200) return 'medium';
    return 'low';
  }

  /**
   * Calculate readability score (0-100)
   */
  private calculateReadability(content: string, language: SupportedLanguage): number {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (nonEmptyLines.length === 0) return 100;
    
    let score = 100;
    
    // Penalize long lines
    const longLines = lines.filter(line => line.length > 100).length;
    score -= (longLines / lines.length) * 20;
    
    // Penalize deeply nested code
    let maxIndentation = 0;
    lines.forEach(line => {
      const match = line.match(/^(\s*)/);
      if (match) {
        const indentation = match[1].length;
        maxIndentation = Math.max(maxIndentation, indentation);
      }
    });
    
    if (maxIndentation > 16) score -= 10;
    else if (maxIndentation > 12) score -= 5;
    
    // Reward comments (basic detection)
    const commentPatterns = {
      python: /#.*$/gm,
      javascript: /(?:\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
      cpp: /(?:\/\/.*$|\/\*[\s\S]*?\*\/)/gm
    };
    
    const commentMatches = content.match(commentPatterns[language]) || [];
    const commentRatio = commentMatches.length / nonEmptyLines.length;
    if (commentRatio > 0.1) score += 5;
    if (commentRatio > 0.2) score += 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Basic syntax validation
   */
  private validateSyntax(content: string, language: SupportedLanguage): SyntaxValidationResult {
    const errors: SyntaxError[] = [];
    const warnings: SyntaxWarning[] = [];
    
    // Basic validation - could be enhanced with proper parsers
    const lines = content.split('\n');
    
    switch (language) {
      case 'python':
        this.validatePythonSyntax(lines, errors, warnings);
        break;
      case 'javascript':
        this.validateJavaScriptSyntax(lines, errors, warnings);
        break;
      case 'cpp':
        this.validateCppSyntax(lines, errors, warnings);
        break;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validatePythonSyntax(lines: string[], errors: SyntaxError[], warnings: SyntaxWarning[]) {
    let indentationStack: number[] = [0];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) return;
      
      // Check indentation
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
      
      // Simple bracket matching
      const openBrackets = (line.match(/[\[\(\{]/g) || []).length;
      const closeBrackets = (line.match(/[\]\)\}]/g) || []).length;
      
      if (openBrackets !== closeBrackets) {
        warnings.push({
          line: index + 1,
          column: 1,
          message: 'Unmatched brackets',
          type: 'style'
        });
      }
      
      // Check for common issues
      if (trimmedLine.endsWith(':') && !trimmedLine.match(/^\s*(?:if|elif|else|for|while|def|class|try|except|finally|with)/)) {
        warnings.push({
          line: index + 1,
          column: 1,
          message: 'Unexpected colon',
          type: 'style'
        });
      }
    });
  }

  private validateJavaScriptSyntax(lines: string[], errors: SyntaxError[], warnings: SyntaxWarning[]) {
    let braceCount = 0;
    let parenCount = 0;
    let bracketCount = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) return;
      
      // Count brackets
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      
      // Check for missing semicolons (basic)
      if (trimmedLine.match(/^(?:var|let|const|return|throw)\s+.*[^;{}]$/) && !trimmedLine.includes('//')) {
        warnings.push({
          line: index + 1,
          column: line.length,
          message: 'Missing semicolon',
          type: 'style'
        });
      }
    });
    
    if (braceCount !== 0) {
      errors.push({
        line: lines.length,
        column: 1,
        message: 'Unmatched braces',
        severity: 'error'
      });
    }
  }

  private validateCppSyntax(lines: string[], errors: SyntaxError[], warnings: SyntaxWarning[]) {
    let braceCount = 0;
    let hasMain = false;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*')) return;
      
      // Count braces
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      
      // Check for main function
      if (trimmedLine.includes('int main(')) {
        hasMain = true;
      }
      
      // Check for missing semicolons
      if (trimmedLine.match(/^\s*[a-zA-Z_].*[^;{}]$/) && !trimmedLine.includes('//') && !trimmedLine.includes('#')) {
        warnings.push({
          line: index + 1,
          column: line.length,
          message: 'Possible missing semicolon',
          type: 'style'
        });
      }
    });
    
    if (braceCount !== 0) {
      errors.push({
        line: lines.length,
        column: 1,
        message: 'Unmatched braces',
        severity: 'error'
      });
    }
    
    if (!hasMain && lines.some(line => line.trim().length > 0)) {
      warnings.push({
        line: 1,
        column: 1,
        message: 'No main function found',
        type: 'best-practice'
      });
    }
  }
}

export const fileAnalysisService = FileAnalysisService.getInstance();