import { PromptTemplate } from '../types';
import { SupportedLanguage } from '../../../types';

// Python templates
export const pythonTemplates: PromptTemplate[] = [
  {
    language: 'python',
    type: 'function',
    template: `Create a Python function that {{description}}.

Requirements:
- Use proper Python naming conventions (snake_case)
- Include type hints
- Add comprehensive docstring
- Follow PEP 8 style guidelines
- Include error handling where appropriate

Function signature should be:
{{signature}}

Context: {{context}}`,
    variables: ['description', 'signature', 'context'],
    examples: [
      'Create a function that calculates the factorial of a number',
      'Create a function that validates an email address',
      'Create a function that sorts a list of dictionaries by a key'
    ]
  },
  {
    language: 'python',
    type: 'class',
    template: `Create a Python class that {{description}}.

Requirements:
- Use proper Python class structure
- Include __init__ method with type hints
- Add docstrings for class and methods
- Follow Python best practices
- Include appropriate magic methods if needed

Context: {{context}}`,
    variables: ['description', 'context'],
    examples: [
      'Create a class representing a bank account',
      'Create a class for managing a todo list',
      'Create a class for a simple calculator'
    ]
  },
  {
    language: 'python',
    type: 'algorithm',
    template: `Implement the {{algorithm}} algorithm in Python.

Requirements:
- Optimize for readability and efficiency
- Include detailed comments explaining the logic
- Add type hints
- Include docstring with time/space complexity
- Provide example usage

Context: {{context}}`,
    variables: ['algorithm', 'context'],
    examples: [
      'binary search',
      'merge sort',
      'breadth-first search'
    ]
  }
];

// JavaScript templates
export const javascriptTemplates: PromptTemplate[] = [
  {
    language: 'javascript',
    type: 'function',
    template: `Create a JavaScript function that {{description}}.

Requirements:
- Use modern ES6+ syntax
- Include JSDoc comments
- Use proper error handling
- Follow JavaScript best practices
- Use appropriate array/object methods

Function signature should be:
{{signature}}

Context: {{context}}`,
    variables: ['description', 'signature', 'context'],
    examples: [
      'Create a function that debounces another function',
      'Create a function that validates form data',
      'Create a function that fetches data from an API'
    ]
  },
  {
    language: 'javascript',
    type: 'class',
    template: `Create a JavaScript class that {{description}}.

Requirements:
- Use ES6 class syntax
- Include constructor with parameter validation
- Add JSDoc comments
- Include getter/setter methods where appropriate
- Follow modern JavaScript patterns

Context: {{context}}`,
    variables: ['description', 'context'],
    examples: [
      'Create a class for managing user sessions',
      'Create a class for a simple state machine',
      'Create a class for handling HTTP requests'
    ]
  },
  {
    language: 'javascript',
    type: 'react',
    template: `Create a React component that {{description}}.

Requirements:
- Use functional component with hooks
- Include PropTypes or TypeScript interfaces
- Follow React best practices
- Include proper event handling
- Add meaningful variable names

Context: {{context}}`,
    variables: ['description', 'context'],
    examples: [
      'Create a component for displaying user profiles',
      'Create a component for handling form input',
      'Create a component for a data table'
    ]
  }
];

// C++ templates
export const cppTemplates: PromptTemplate[] = [
  {
    language: 'cpp',
    type: 'function',
    template: `Create a C++ function that {{description}}.

Requirements:
- Use modern C++17/20 features where appropriate
- Include proper const correctness
- Add comprehensive comments
- Use RAII principles
- Include appropriate headers

Function signature should be:
{{signature}}

Context: {{context}}`,
    variables: ['description', 'signature', 'context'],
    examples: [
      'Create a function that sorts a vector using custom comparator',
      'Create a function that parses a configuration file',
      'Create a function that implements a hash table'
    ]
  },
  {
    language: 'cpp',
    type: 'class',
    template: `Create a C++ class that {{description}}.

Requirements:
- Follow Rule of Five/Zero
- Use proper encapsulation
- Include const methods where appropriate
- Add comprehensive comments
- Use modern C++ features (smart pointers, auto, etc.)

Context: {{context}}`,
    variables: ['description', 'context'],
    examples: [
      'Create a class for a thread-safe queue',
      'Create a class for managing memory pools',
      'Create a class for a binary tree'
    ]
  },
  {
    language: 'cpp',
    type: 'algorithm',
    template: `Implement the {{algorithm}} algorithm in C++.

Requirements:
- Optimize for performance
- Use STL containers and algorithms where appropriate
- Include detailed comments
- Add template support if applicable
- Provide complexity analysis

Context: {{context}}`,
    variables: ['algorithm', 'context'],
    examples: [
      'quicksort with random pivot',
      'Dijkstra\'s shortest path',
      'KMP string matching'
    ]
  }
];

export const getAllTemplates = (): PromptTemplate[] => [
  ...pythonTemplates,
  ...javascriptTemplates,
  ...cppTemplates,
];

export const getTemplatesByLanguage = (language: SupportedLanguage): PromptTemplate[] => {
  switch (language) {
    case 'python':
      return pythonTemplates;
    case 'javascript':
      return javascriptTemplates;
    case 'cpp':
      return cppTemplates;
    default:
      return [];
  }
};

export const getTemplateByType = (language: SupportedLanguage, type: string): PromptTemplate | undefined => {
  const templates = getTemplatesByLanguage(language);
  return templates.find(template => template.type === type);
};

// Template variable replacement utility
export const renderTemplate = (template: string, variables: Record<string, string>): string => {
  let rendered = template;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  });
  return rendered;
};