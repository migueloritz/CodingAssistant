import {
  pythonTemplates,
  javascriptTemplates,
  cppTemplates,
  getAllTemplates,
  getTemplatesByLanguage,
  getTemplateByType,
  renderTemplate
} from '../../../../../services/ai/templates/index';
import { PromptTemplate } from '../../../../../services/ai/types';
import { SupportedLanguage } from '../../../../../types';

describe('AI Templates', () => {
  describe('Template Collections', () => {
    test('should have Python templates with correct structure', () => {
      expect(pythonTemplates).toBeInstanceOf(Array);
      expect(pythonTemplates.length).toBeGreaterThan(0);
      
      pythonTemplates.forEach(template => {
        expect(template).toMatchObject({
          language: 'python',
          type: expect.any(String),
          template: expect.any(String),
          variables: expect.any(Array),
          examples: expect.any(Array)
        });
        
        expect(template.variables.length).toBeGreaterThan(0);
        expect(template.examples.length).toBeGreaterThan(0);
        expect(template.template.length).toBeGreaterThan(50);
      });
    });

    test('should have JavaScript templates with correct structure', () => {
      expect(javascriptTemplates).toBeInstanceOf(Array);
      expect(javascriptTemplates.length).toBeGreaterThan(0);
      
      javascriptTemplates.forEach(template => {
        expect(template).toMatchObject({
          language: 'javascript',
          type: expect.any(String),
          template: expect.any(String),
          variables: expect.any(Array),
          examples: expect.any(Array)
        });
      });
    });

    test('should have C++ templates with correct structure', () => {
      expect(cppTemplates).toBeInstanceOf(Array);
      expect(cppTemplates.length).toBeGreaterThan(0);
      
      cppTemplates.forEach(template => {
        expect(template).toMatchObject({
          language: 'cpp',
          type: expect.any(String),
          template: expect.any(String),
          variables: expect.any(Array),
          examples: expect.any(Array)
        });
      });
    });

    test('should include expected template types for Python', () => {
      const types = pythonTemplates.map(t => t.type);
      expect(types).toContain('function');
      expect(types).toContain('class');
      expect(types).toContain('algorithm');
    });

    test('should include expected template types for JavaScript', () => {
      const types = javascriptTemplates.map(t => t.type);
      expect(types).toContain('function');
      expect(types).toContain('class');
      expect(types).toContain('react');
    });

    test('should include expected template types for C++', () => {
      const types = cppTemplates.map(t => t.type);
      expect(types).toContain('function');
      expect(types).toContain('class');
      expect(types).toContain('algorithm');
    });
  });

  describe('Template Retrieval Functions', () => {
    test('should return all templates', () => {
      const allTemplates = getAllTemplates();
      
      expect(allTemplates).toBeInstanceOf(Array);
      expect(allTemplates.length).toBe(
        pythonTemplates.length + javascriptTemplates.length + cppTemplates.length
      );
      
      // Should contain templates from all languages
      const languages = allTemplates.map(t => t.language);
      expect(languages).toContain('python');
      expect(languages).toContain('javascript');
      expect(languages).toContain('cpp');
    });

    test('should return templates by language', () => {
      const pythonOnly = getTemplatesByLanguage('python');
      const jsOnly = getTemplatesByLanguage('javascript');
      const cppOnly = getTemplatesByLanguage('cpp');
      
      expect(pythonOnly).toEqual(pythonTemplates);
      expect(jsOnly).toEqual(javascriptTemplates);
      expect(cppOnly).toEqual(cppTemplates);
      
      // Verify all returned templates have correct language
      pythonOnly.forEach(template => {
        expect(template.language).toBe('python');
      });
      
      jsOnly.forEach(template => {
        expect(template.language).toBe('javascript');
      });
      
      cppOnly.forEach(template => {
        expect(template.language).toBe('cpp');
      });
    });

    test('should return empty array for unsupported language', () => {
      const unsupportedTemplates = getTemplatesByLanguage('unsupported' as SupportedLanguage);
      expect(unsupportedTemplates).toEqual([]);
    });

    test('should return specific template by language and type', () => {
      const pythonFunction = getTemplateByType('python', 'function');
      const jsReact = getTemplateByType('javascript', 'react');
      const cppClass = getTemplateByType('cpp', 'class');
      
      expect(pythonFunction).toBeDefined();
      expect(pythonFunction?.language).toBe('python');
      expect(pythonFunction?.type).toBe('function');
      
      expect(jsReact).toBeDefined();
      expect(jsReact?.language).toBe('javascript');
      expect(jsReact?.type).toBe('react');
      
      expect(cppClass).toBeDefined();
      expect(cppClass?.language).toBe('cpp');
      expect(cppClass?.type).toBe('class');
    });

    test('should return undefined for non-existent template type', () => {
      const nonExistent = getTemplateByType('python', 'nonexistent');
      expect(nonExistent).toBeUndefined();
    });

    test('should return undefined for unsupported language', () => {
      const unsupported = getTemplateByType('unsupported' as SupportedLanguage, 'function');
      expect(unsupported).toBeUndefined();
    });
  });

  describe('Template Content Validation', () => {
    test('should have required placeholders in Python function template', () => {
      const pythonFunction = getTemplateByType('python', 'function');
      
      expect(pythonFunction?.template).toContain('{{description}}');
      expect(pythonFunction?.template).toContain('{{signature}}');
      expect(pythonFunction?.template).toContain('{{context}}');
      expect(pythonFunction?.variables).toContain('description');
      expect(pythonFunction?.variables).toContain('signature');
      expect(pythonFunction?.variables).toContain('context');
    });

    test('should have required placeholders in JavaScript React template', () => {
      const jsReact = getTemplateByType('javascript', 'react');
      
      expect(jsReact?.template).toContain('{{description}}');
      expect(jsReact?.template).toContain('{{context}}');
      expect(jsReact?.variables).toContain('description');
      expect(jsReact?.variables).toContain('context');
    });

    test('should have required placeholders in C++ algorithm template', () => {
      const cppAlgorithm = getTemplateByType('cpp', 'algorithm');
      
      expect(cppAlgorithm?.template).toContain('{{algorithm}}');
      expect(cppAlgorithm?.template).toContain('{{context}}');
      expect(cppAlgorithm?.variables).toContain('algorithm');
      expect(cppAlgorithm?.variables).toContain('context');
    });

    test('should include language-specific requirements in templates', () => {
      const pythonFunction = getTemplateByType('python', 'function');
      const jsFunction = getTemplateByType('javascript', 'function');
      const cppFunction = getTemplateByType('cpp', 'function');
      
      // Python-specific requirements
      expect(pythonFunction?.template).toContain('type hints');
      expect(pythonFunction?.template).toContain('PEP 8');
      expect(pythonFunction?.template).toContain('snake_case');
      
      // JavaScript-specific requirements
      expect(jsFunction?.template).toContain('ES6+');
      expect(jsFunction?.template).toContain('JSDoc');
      
      // C++-specific requirements
      expect(cppFunction?.template).toContain('C++17/20');
      expect(cppFunction?.template).toContain('const correctness');
      expect(cppFunction?.template).toContain('RAII');
    });

    test('should have meaningful examples for each template', () => {
      const allTemplates = getAllTemplates();
      
      allTemplates.forEach(template => {
        expect(template.examples.length).toBeGreaterThanOrEqual(3);
        
        template.examples.forEach(example => {
          expect(typeof example).toBe('string');
          expect(example.length).toBeGreaterThan(10);
          expect(example.toLowerCase()).not.toBe(example.toUpperCase()); // Should contain letters
        });
      });
    });
  });

  describe('Template Rendering', () => {
    test('should render template with single variable', () => {
      const template = 'Create a {{type}} that does something useful.';
      const variables = { type: 'function' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a function that does something useful.');
      expect(rendered).not.toContain('{{');
      expect(rendered).not.toContain('}}');
    });

    test('should render template with multiple variables', () => {
      const template = 'Create a {{language}} {{type}} that {{description}}.';
      const variables = {
        language: 'Python',
        type: 'function',
        description: 'calculates fibonacci numbers'
      };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a Python function that calculates fibonacci numbers.');
    });

    test('should render template with repeated variables', () => {
      const template = 'The {{item}} is a {{item}} that works with {{item}}.';
      const variables = { item: 'calculator' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('The calculator is a calculator that works with calculator.');
    });

    test('should leave unreplaced placeholders when variable missing', () => {
      const template = 'Create a {{type}} that {{description}}.';
      const variables = { type: 'function' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a function that {{description}}.');
      expect(rendered).toContain('{{description}}');
    });

    test('should handle empty variables object', () => {
      const template = 'Create a {{type}} that {{description}}.';
      const variables = {};
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a {{type}} that {{description}}.');
    });

    test('should handle empty template', () => {
      const template = '';
      const variables = { type: 'function' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('');
    });

    test('should handle template with no placeholders', () => {
      const template = 'This is a plain template without variables.';
      const variables = { type: 'function' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('This is a plain template without variables.');
    });

    test('should handle special characters in variables', () => {
      const template = 'Create a {{description}} with {{special}}.';
      const variables = {
        description: 'function with $pecial ch@racters',
        special: 'regex [.*] patterns'
      };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a function with $pecial ch@racters with regex [.*] patterns.');
    });

    test('should be case-sensitive for variable names', () => {
      const template = 'Create a {{Type}} and a {{type}}.';
      const variables = { type: 'function' };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Create a {{Type}} and a function.');
      expect(rendered).toContain('{{Type}}'); // Should remain unreplaced
    });
  });

  describe('Template Integration', () => {
    test('should render actual template with realistic variables', () => {
      const pythonFunction = getTemplateByType('python', 'function');
      
      expect(pythonFunction).toBeDefined();
      
      const variables = {
        description: 'calculates the factorial of a number',
        signature: 'def factorial(n: int) -> int:',
        context: 'for a mathematical computation library'
      };
      
      const rendered = renderTemplate(pythonFunction!.template, variables);
      
      expect(rendered).toContain('calculates the factorial of a number');
      expect(rendered).toContain('def factorial(n: int) -> int:');
      expect(rendered).toContain('for a mathematical computation library');
      expect(rendered).toContain('type hints');
      expect(rendered).toContain('PEP 8');
      expect(rendered).not.toContain('{{');
    });

    test('should render JavaScript React template correctly', () => {
      const jsReact = getTemplateByType('javascript', 'react');
      
      expect(jsReact).toBeDefined();
      
      const variables = {
        description: 'displays a user profile with avatar and details',
        context: 'for a social media application'
      };
      
      const rendered = renderTemplate(jsReact!.template, variables);
      
      expect(rendered).toContain('displays a user profile with avatar and details');
      expect(rendered).toContain('for a social media application');
      expect(rendered).toContain('functional component');
      expect(rendered).toContain('hooks');
      expect(rendered).not.toContain('{{');
    });

    test('should render C++ algorithm template correctly', () => {
      const cppAlgorithm = getTemplateByType('cpp', 'algorithm');
      
      expect(cppAlgorithm).toBeDefined();
      
      const variables = {
        algorithm: 'binary search',
        context: 'for searching in sorted arrays efficiently'
      };
      
      const rendered = renderTemplate(cppAlgorithm!.template, variables);
      
      expect(rendered).toContain('binary search');
      expect(rendered).toContain('for searching in sorted arrays efficiently');
      expect(rendered).toContain('modern C++');
      expect(rendered).toContain('STL containers');
      expect(rendered).not.toContain('{{');
    });
  });

  describe('Template Validation', () => {
    test('should have consistent variable usage across all templates', () => {
      const allTemplates = getAllTemplates();
      
      allTemplates.forEach(template => {
        // Check that all declared variables are used in template
        template.variables.forEach(variable => {
          const placeholder = `{{${variable}}}`;
          expect(template.template).toContain(placeholder);
        });
        
        // Extract all placeholders from template
        const placeholders = template.template.match(/\{\{([^}]+)\}\}/g) || [];
        const usedVariables = placeholders.map(p => p.replace(/[{}]/g, ''));
        
        // Check that all used variables are declared
        usedVariables.forEach(variable => {
          expect(template.variables).toContain(variable);
        });
      });
    });

    test('should have unique combinations of language and type', () => {
      const allTemplates = getAllTemplates();
      const combinations = new Set();
      
      allTemplates.forEach(template => {
        const combination = `${template.language}-${template.type}`;
        expect(combinations.has(combination)).toBe(false);
        combinations.add(combination);
      });
    });

    test('should have proper template structure for all templates', () => {
      const allTemplates = getAllTemplates();
      
      allTemplates.forEach(template => {
        // Should have requirements section
        expect(template.template.toLowerCase()).toContain('requirements');
        
        // Should have proper formatting
        expect(template.template).toContain('\n');
        expect(template.template.length).toBeGreaterThan(100);
        
        // Should not have trailing spaces
        const lines = template.template.split('\n');
        lines.forEach(line => {
          expect(line).not.toMatch(/\s+$/);
        });
      });
    });

    test('should have language-appropriate examples', () => {
      const pythonExamples = pythonTemplates.flatMap(t => t.examples);
      const jsExamples = javascriptTemplates.flatMap(t => t.examples);
      const cppExamples = cppTemplates.flatMap(t => t.examples);
      
      // Python examples should use Python terminology
      pythonExamples.forEach(example => {
        const lowerExample = example.toLowerCase();
        // Should not contain language-specific terms from other languages
        expect(lowerExample).not.toContain('component');
        expect(lowerExample).not.toContain('jsx');
      });
      
      // JavaScript examples should use JS terminology
      jsExamples.forEach(example => {
        const lowerExample = example.toLowerCase();
        // React examples should contain React terms
        if (javascriptTemplates.some(t => t.type === 'react' && t.examples.includes(example))) {
          // React-specific examples are okay
        }
      });
      
      // C++ examples should use C++ terminology
      cppExamples.forEach(example => {
        const lowerExample = example.toLowerCase();
        // Should not contain Python/JS specific terms
        expect(lowerExample).not.toContain('component');
        expect(lowerExample).not.toContain('import');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed placeholder patterns', () => {
      const template = 'Create a {type} and {{incomplete} and {{{extra}}}';
      const variables = { type: 'function', incomplete: 'test', extra: 'value' };
      
      const rendered = renderTemplate(template, variables);
      
      // Should only replace properly formatted placeholders
      expect(rendered).toBe('Create a {type} and {{incomplete} and {{{extra}}}');
    });

    test('should handle nested placeholder-like strings', () => {
      const template = 'Code: {{code}} with {{description}}';
      const variables = {
        code: 'if ({{condition}}) { return true; }',
        description: 'nested {{braces}}'
      };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe('Code: if ({{condition}}) { return true; } with nested {{braces}}');
    });

    test('should handle very long variable values', () => {
      const template = 'Description: {{description}}';
      const longDescription = 'A'.repeat(10000);
      const variables = { description: longDescription };
      
      const rendered = renderTemplate(template, variables);
      
      expect(rendered).toBe(`Description: ${longDescription}`);
      expect(rendered.length).toBe(13 + longDescription.length);
    });

    test('should handle numeric and boolean values in variables', () => {
      const template = 'Count: {{count}}, Active: {{active}}';
      const variables = { count: 42, active: true };
      
      const rendered = renderTemplate(template, variables as any);
      
      expect(rendered).toBe('Count: 42, Active: true');
    });
  });
});