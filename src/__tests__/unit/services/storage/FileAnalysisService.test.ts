import { FileAnalysisService, FileAnalysis, SyntaxValidationResult } from '../../../../services/storage/FileAnalysisService';
import { SupportedLanguage } from '../../../../types';

describe('FileAnalysisService', () => {
  let fileAnalysisService: FileAnalysisService;

  beforeEach(() => {
    // Reset singleton instance
    (FileAnalysisService as any).instance = undefined;
    fileAnalysisService = FileAnalysisService.getInstance();
  });

  describe('Singleton Pattern', () => {
    test('should return the same instance', () => {
      const instance1 = FileAnalysisService.getInstance();
      const instance2 = FileAnalysisService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Language Detection', () => {
    test('should detect JavaScript files', () => {
      expect(fileAnalysisService.detectLanguage('script.js')).toBe('javascript');
      expect(fileAnalysisService.detectLanguage('component.jsx')).toBe('javascript');
      expect(fileAnalysisService.detectLanguage('module.mjs')).toBe('javascript');
      expect(fileAnalysisService.detectLanguage('types.ts')).toBe('javascript');
      expect(fileAnalysisService.detectLanguage('component.tsx')).toBe('javascript');
    });

    test('should detect Python files', () => {
      expect(fileAnalysisService.detectLanguage('script.py')).toBe('python');
      expect(fileAnalysisService.detectLanguage('module.pyw')).toBe('python');
      expect(fileAnalysisService.detectLanguage('compiled.pyc')).toBe('python');
    });

    test('should detect C++ files', () => {
      expect(fileAnalysisService.detectLanguage('program.cpp')).toBe('cpp');
      expect(fileAnalysisService.detectLanguage('source.cc')).toBe('cpp');
      expect(fileAnalysisService.detectLanguage('file.cxx')).toBe('cpp');
      expect(fileAnalysisService.detectLanguage('main.c++')).toBe('cpp');
      expect(fileAnalysisService.detectLanguage('header.hpp')).toBe('cpp');
      expect(fileAnalysisService.detectLanguage('header.h')).toBe('cpp');
    });

    test('should default to Python for unknown extensions', () => {
      expect(fileAnalysisService.detectLanguage('unknown.xyz')).toBe('python');
      expect(fileAnalysisService.detectLanguage('noextension')).toBe('python');
      expect(fileAnalysisService.detectLanguage('file.')).toBe('python');
    });
  });

  describe('File Analysis', () => {
    test('should analyze Python file correctly', () => {
      const pythonCode = `# This is a test Python file
import os
import sys
from datetime import datetime

class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b

def main():
    calc = Calculator()
    result = calc.add(5, 3)
    print(f"Result: {result}")

if __name__ == "__main__":
    main()`;

      const analysis = fileAnalysisService.analyzeFile(pythonCode, 'python');

      expect(analysis).toMatchObject({
        language: 'python',
        lines: expect.any(Number),
        characters: pythonCode.length,
        words: expect.any(Number),
        functions: expect.arrayContaining(['add', 'subtract', 'main']),
        classes: expect.arrayContaining(['Calculator']),
        imports: expect.arrayContaining(['os', 'sys', 'datetime']),
        complexity: expect.any(String),
        readability: expect.any(Number),
        syntax: expect.objectContaining({
          isValid: expect.any(Boolean),
          errors: expect.any(Array),
          warnings: expect.any(Array)
        })
      });

      expect(analysis.functions).toContain('__init__');
      expect(analysis.lines).toBeGreaterThan(15);
      expect(analysis.readability).toBeGreaterThan(0);
      expect(analysis.readability).toBeLessThanOrEqual(100);
    });

    test('should analyze JavaScript file correctly', () => {
      const jsCode = `// JavaScript module
import React from 'react';
import { useState, useEffect } from 'react';

class DataProcessor {
    constructor() {
        this.data = [];
    }
    
    processData(input) {
        return input.map(item => item * 2);
    }
}

const calculateSum = (numbers) => {
    return numbers.reduce((sum, num) => sum + num, 0);
};

function validateInput(data) {
    if (!data || data.length === 0) {
        throw new Error('Invalid input');
    }
    return true;
}

export { DataProcessor, calculateSum, validateInput };`;

      const analysis = fileAnalysisService.analyzeFile(jsCode, 'javascript');

      expect(analysis).toMatchObject({
        language: 'javascript',
        functions: expect.arrayContaining(['calculateSum', 'validateInput']),
        classes: expect.arrayContaining(['DataProcessor']),
        imports: expect.arrayContaining(['react']),
        complexity: expect.any(String),
        readability: expect.any(Number)
      });

      expect(analysis.functions).toContain('processData');
    });

    test('should analyze C++ file correctly', () => {
      const cppCode = `#include <iostream>
#include <vector>
#include <string>

class StringProcessor {
private:
    std::string data;
    
public:
    StringProcessor(const std::string& input) : data(input) {}
    
    std::string process() {
        return data + "_processed";
    }
    
    int getLength() const {
        return data.length();
    }
};

int calculateFactorial(int n) {
    if (n <= 1) return 1;
    return n * calculateFactorial(n - 1);
}

int main() {
    StringProcessor processor("test");
    std::cout << processor.process() << std::endl;
    
    int result = calculateFactorial(5);
    std::cout << "Factorial: " << result << std::endl;
    
    return 0;
}`;

      const analysis = fileAnalysisService.analyzeFile(cppCode, 'cpp');

      expect(analysis).toMatchObject({
        language: 'cpp',
        functions: expect.arrayContaining(['calculateFactorial', 'main']),
        classes: expect.arrayContaining(['StringProcessor']),
        imports: expect.arrayContaining(['iostream', 'vector', 'string']),
        complexity: expect.any(String),
        readability: expect.any(Number)
      });

      expect(analysis.functions).toContain('process');
      expect(analysis.functions).toContain('getLength');
    });

    test('should handle empty file', () => {
      const analysis = fileAnalysisService.analyzeFile('', 'python');

      expect(analysis).toMatchObject({
        language: 'python',
        lines: 1,
        characters: 0,
        words: 0,
        functions: [],
        classes: [],
        imports: [],
        complexity: 'low',
        readability: 100,
        syntax: expect.objectContaining({
          isValid: true,
          errors: [],
          warnings: []
        })
      });
    });

    test('should handle single line file', () => {
      const analysis = fileAnalysisService.analyzeFile('print("Hello World")', 'python');

      expect(analysis.lines).toBe(1);
      expect(analysis.complexity).toBe('low');
      expect(analysis.readability).toBeGreaterThan(90);
    });
  });

  describe('Function Extraction', () => {
    test('should extract Python functions', () => {
      const code = `
def simple_function():
    pass

def function_with_params(a, b, c):
    return a + b + c

def _private_function():
    pass

class MyClass:
    def method(self):
        pass
    
    def another_method(self, param1, param2=None):
        pass`;

      const functions = (fileAnalysisService as any).extractFunctions(code, 'python');
      
      expect(functions).toContain('simple_function');
      expect(functions).toContain('function_with_params');
      expect(functions).toContain('_private_function');
      expect(functions).toContain('method');
      expect(functions).toContain('another_method');
    });

    test('should extract JavaScript functions', () => {
      const code = `
function regularFunction() {
    return true;
}

const arrowFunction = () => {
    return false;
};

const namedArrowFunction = (param) => param * 2;

const functionExpression = function() {
    return 'test';
};

class MyClass {
    method() {
        return 'method';
    }
}`;

      const functions = (fileAnalysisService as any).extractFunctions(code, 'javascript');
      
      expect(functions).toContain('regularFunction');
      expect(functions).toContain('arrowFunction');
      expect(functions).toContain('namedArrowFunction');
    });

    test('should extract C++ functions', () => {
      const code = `
int add(int a, int b) {
    return a + b;
}

void printMessage(const std::string& msg);

template<typename T>
T multiply(T a, T b) {
    return a * b;
}

class Calculator {
public:
    int calculate(int x) {
        return x * 2;
    }
};`;

      const functions = (fileAnalysisService as any).extractFunctions(code, 'cpp');
      
      expect(functions).toContain('add');
      expect(functions).toContain('printMessage');
      expect(functions).toContain('multiply');
      expect(functions).toContain('calculate');
      
      // Should not include keywords
      expect(functions).not.toContain('if');
      expect(functions).not.toContain('while');
    });
  });

  describe('Class Extraction', () => {
    test('should extract Python classes', () => {
      const code = `
class SimpleClass:
    pass

class InheritedClass(BaseClass):
    pass

class MultipleInheritance(Base1, Base2):
    pass`;

      const classes = (fileAnalysisService as any).extractClasses(code, 'python');
      
      expect(classes).toContain('SimpleClass');
      expect(classes).toContain('InheritedClass');
      expect(classes).toContain('MultipleInheritance');
    });

    test('should extract JavaScript classes', () => {
      const code = `
class BasicClass {
    constructor() {}
}

class ExtendedClass extends BasicClass {
    method() {}
}`;

      const classes = (fileAnalysisService as any).extractClasses(code, 'javascript');
      
      expect(classes).toContain('BasicClass');
      expect(classes).toContain('ExtendedClass');
    });

    test('should extract C++ classes and structs', () => {
      const code = `
class MyClass {
public:
    int value;
};

struct DataStruct {
    int x, y;
};

template<typename T>
class TemplateClass {
    T data;
};`;

      const classes = (fileAnalysisService as any).extractClasses(code, 'cpp');
      
      expect(classes).toContain('MyClass');
      expect(classes).toContain('DataStruct');
      expect(classes).toContain('TemplateClass');
    });
  });

  describe('Import Extraction', () => {
    test('should extract Python imports', () => {
      const code = `
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np`;

      const imports = (fileAnalysisService as any).extractImports(code, 'python');
      
      expect(imports).toContain('os');
      expect(imports).toContain('sys');
      expect(imports).toContain('datetime');
      expect(imports).toContain('collections');
      expect(imports).toContain('numpy');
    });

    test('should extract JavaScript imports', () => {
      const code = `
import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
const fs = require('fs');
const path = require('path');`;

      const imports = (fileAnalysisService as any).extractImports(code, 'javascript');
      
      expect(imports).toContain('react');
      expect(imports).toContain('./utils');
      expect(imports).toContain('fs');
      expect(imports).toContain('path');
    });

    test('should extract C++ includes', () => {
      const code = `
#include <iostream>
#include <vector>
#include <string>
#include "myheader.h"
#include "utils/helper.hpp"`;

      const imports = (fileAnalysisService as any).extractImports(code, 'cpp');
      
      expect(imports).toContain('iostream');
      expect(imports).toContain('vector');
      expect(imports).toContain('string');
      expect(imports).toContain('myheader.h');
      expect(imports).toContain('utils/helper.hpp');
    });
  });

  describe('Complexity Calculation', () => {
    test('should calculate low complexity for simple code', () => {
      const simpleCode = `
def simple_function():
    return "Hello World"

print(simple_function())`;

      const complexity = (fileAnalysisService as any).calculateComplexity(simpleCode, 'python');
      expect(complexity).toBe('low');
    });

    test('should calculate medium complexity for moderate code', () => {
      const moderateCode = `
def process_data(data):
    result = []
    for item in data:
        if item > 0:
            if item % 2 == 0:
                result.append(item * 2)
            else:
                result.append(item * 3)
        else:
            try:
                result.append(abs(item))
            except ValueError:
                result.append(0)
    return result

class DataProcessor:
    def __init__(self):
        self.data = []
    
    def process(self):
        for i in range(len(self.data)):
            if self.data[i] is not None:
                self.data[i] = self.process_item(self.data[i])`;

      const complexity = (fileAnalysisService as any).calculateComplexity(moderateCode, 'python');
      expect(complexity).toBe('medium');
    });

    test('should calculate high complexity for complex code', () => {
      const complexCode = `
${'def complex_function():\n'.repeat(100)}
${'    if condition:\n'.repeat(50)}
${'        for item in items:\n'.repeat(25)}
${'            while something:\n'.repeat(10)}
${'                try:\n'.repeat(5)}
${'                    pass\n'.repeat(5)}`;

      const complexity = (fileAnalysisService as any).calculateComplexity(complexCode, 'python');
      expect(complexity).toBe('high');
    });

    test('should handle different languages', () => {
      const jsCode = `
function complexFunction() {
    if (condition) {
        for (let i = 0; i < 10; i++) {
            switch (i) {
                case 1:
                    try {
                        doSomething();
                    } catch (error) {
                        handleError(error);
                    }
                    break;
            }
        }
    }
}`;

      const complexity = (fileAnalysisService as any).calculateComplexity(jsCode, 'javascript');
      expect(['low', 'medium', 'high']).toContain(complexity);
    });
  });

  describe('Readability Calculation', () => {
    test('should give high readability for well-formatted code', () => {
      const wellFormattedCode = `# This is a well-documented function
def calculate_average(numbers):
    """
    Calculate the average of a list of numbers.
    
    Args:
        numbers: List of numeric values
        
    Returns:
        float: The average value
    """
    if not numbers:
        return 0
    
    total = sum(numbers)
    return total / len(numbers)`;

      const readability = (fileAnalysisService as any).calculateReadability(wellFormattedCode, 'python');
      expect(readability).toBeGreaterThan(90);
    });

    test('should give low readability for poorly formatted code', () => {
      const poorlyFormattedCode = 'def bad_function(x,y,z):' + 'a' * 200 + '\n' +
        '                                            if x>y and y>z and z>0 and x<100 and y<100 and z<100:' + '\n' +
        '                                                                                    return x*y*z';

      const readability = (fileAnalysisService as any).calculateReadability(poorlyFormattedCode, 'python');
      expect(readability).toBeLessThan(80);
    });

    test('should reward comments', () => {
      const codeWithComments = `// This function processes data
function processData(data) {
    // Check if data is valid
    if (!data) {
        return null;
    }
    
    // Process each item
    return data.map(item => {
        // Transform the item
        return item * 2;
    });
}`;

      const codeWithoutComments = `function processData(data) {
    if (!data) {
        return null;
    }
    
    return data.map(item => {
        return item * 2;
    });
}`;

      const readabilityWithComments = (fileAnalysisService as any).calculateReadability(codeWithComments, 'javascript');
      const readabilityWithoutComments = (fileAnalysisService as any).calculateReadability(codeWithoutComments, 'javascript');
      
      expect(readabilityWithComments).toBeGreaterThan(readabilityWithoutComments);
    });

    test('should handle empty code', () => {
      const readability = (fileAnalysisService as any).calculateReadability('', 'python');
      expect(readability).toBe(100);
    });
  });

  describe('Syntax Validation', () => {
    describe('Python Syntax Validation', () => {
      test('should validate correct Python syntax', () => {
        const validCode = `
def hello_world():
    print("Hello, World!")
    return True

if __name__ == "__main__":
    hello_world()`;

        const result = fileAnalysisService.analyzeFile(validCode, 'python').syntax;
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('should detect unmatched brackets in Python', () => {
        const invalidCode = `
def test():
    items = [1, 2, 3
    print(items)`;

        const result = (fileAnalysisService as any).validateSyntax(invalidCode, 'python');
        expect(result.warnings.some((w: any) => w.message.includes('Unmatched brackets'))).toBe(true);
      });

      test('should detect unexpected colons in Python', () => {
        const invalidCode = `
def test():
    x = 5:
    print(x)`;

        const result = (fileAnalysisService as any).validateSyntax(invalidCode, 'python');
        expect(result.warnings.some((w: any) => w.message.includes('Unexpected colon'))).toBe(true);
      });
    });

    describe('JavaScript Syntax Validation', () => {
      test('should validate correct JavaScript syntax', () => {
        const validCode = `
function greet(name) {
    return "Hello, " + name + "!";
}

const result = greet("World");
console.log(result);`;

        const result = fileAnalysisService.analyzeFile(validCode, 'javascript').syntax;
        expect(result.isValid).toBe(true);
      });

      test('should detect unmatched braces in JavaScript', () => {
        const invalidCode = `
function test() {
    console.log("test");
    // Missing closing brace`;

        const result = (fileAnalysisService as any).validateSyntax(invalidCode, 'javascript');
        expect(result.errors.some((e: any) => e.message.includes('Unmatched braces'))).toBe(true);
      });

      test('should detect missing semicolons in JavaScript', () => {
        const codeWithMissingSemicolon = `
const x = 5
let y = 10
return x + y`;

        const result = (fileAnalysisService as any).validateSyntax(codeWithMissingSemicolon, 'javascript');
        expect(result.warnings.some((w: any) => w.message.includes('Missing semicolon'))).toBe(true);
      });
    });

    describe('C++ Syntax Validation', () => {
      test('should validate correct C++ syntax', () => {
        const validCode = `
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`;

        const result = fileAnalysisService.analyzeFile(validCode, 'cpp').syntax;
        expect(result.isValid).toBe(true);
      });

      test('should detect unmatched braces in C++', () => {
        const invalidCode = `
int main() {
    std::cout << "test";
    // Missing closing brace`;

        const result = (fileAnalysisService as any).validateSyntax(invalidCode, 'cpp');
        expect(result.errors.some((e: any) => e.message.includes('Unmatched braces'))).toBe(true);
      });

      test('should warn about missing main function in C++', () => {
        const codeWithoutMain = `
#include <iostream>

void helper() {
    std::cout << "Helper function" << std::endl;
}`;

        const result = (fileAnalysisService as any).validateSyntax(codeWithoutMain, 'cpp');
        expect(result.warnings.some((w: any) => w.message.includes('No main function found'))).toBe(true);
      });

      test('should detect possible missing semicolons in C++', () => {
        const codeWithMissingSemicolon = `
int main() {
    int x = 5
    std::cout << x << std::endl;
    return 0;
}`;

        const result = (fileAnalysisService as any).validateSyntax(codeWithMissingSemicolon, 'cpp');
        expect(result.warnings.some((w: any) => w.message.includes('Possible missing semicolon'))).toBe(true);
      });
    });
  });

  describe('Word Counting', () => {
    test('should count words correctly', () => {
      const code = `
def hello_world():
    print("Hello World")
    return True`;

      const wordCount = (fileAnalysisService as any).countWords(code);
      expect(wordCount).toBeGreaterThan(5);
    });

    test('should handle empty content', () => {
      const wordCount = (fileAnalysisService as any).countWords('');
      expect(wordCount).toBe(0);
    });

    test('should count words with numbers and underscores', () => {
      const code = 'variable_name_123 function_call_456 test_data';
      const wordCount = (fileAnalysisService as any).countWords(code);
      expect(wordCount).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle code with only comments', () => {
      const pythonComments = `# This is a comment
# Another comment
# Yet another comment`;

      const analysis = fileAnalysisService.analyzeFile(pythonComments, 'python');
      
      expect(analysis.functions).toHaveLength(0);
      expect(analysis.classes).toHaveLength(0);
      expect(analysis.complexity).toBe('low');
      expect(analysis.syntax.isValid).toBe(true);
    });

    test('should handle code with mixed indentation', () => {
      const mixedIndentationCode = `def test():
    if True:
\t\tprint("mixed tabs and spaces")
    \treturn True`;

      const analysis = fileAnalysisService.analyzeFile(mixedIndentationCode, 'python');
      expect(analysis.readability).toBeLessThan(100);
    });

    test('should handle very long lines', () => {
      const longLineCode = 'def very_long_function_name_that_exceeds_normal_length(' + 'param_' + 'x'.repeat(50) + '):' + ' return "result"'.repeat(10);
      
      const analysis = fileAnalysisService.analyzeFile(longLineCode, 'python');
      expect(analysis.readability).toBeLessThan(90);
    });

    test('should handle code with unicode characters', () => {
      const unicodeCode = `def greet():
    print("¡Hola! 你好! こんにちは!")
    return "✓"`;

      const analysis = fileAnalysisService.analyzeFile(unicodeCode, 'python');
      expect(analysis.functions).toContain('greet');
      expect(analysis.characters).toBeGreaterThan(50);
    });

    test('should handle nested functions and classes', () => {
      const nestedCode = `
class OuterClass:
    def outer_method(self):
        def inner_function():
            class InnerClass:
                def inner_method(self):
                    pass
            return InnerClass()
        return inner_function()`;

      const analysis = fileAnalysisService.analyzeFile(nestedCode, 'python');
      expect(analysis.functions).toContain('outer_method');
      expect(analysis.functions).toContain('inner_function');
      expect(analysis.functions).toContain('inner_method');
      expect(analysis.classes).toContain('OuterClass');
      expect(analysis.classes).toContain('InnerClass');
    });

    test('should handle malformed code gracefully', () => {
      const malformedCode = `def broken_function(
    # incomplete function definition
    if incomplete_if:
        # no proper indentation
    return`;

      const analysis = fileAnalysisService.analyzeFile(malformedCode, 'python');
      expect(analysis).toBeDefined();
      expect(analysis.syntax.isValid).toBe(false);
      expect(analysis.syntax.errors.length).toBeGreaterThan(0);
    });
  });
});