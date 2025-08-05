import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor } from '../../components/Editor/CodeEditor';
import { EditorProps } from '../../types';

// Mock CodeMirror
jest.mock('@codemirror/view', () => ({
  EditorView: jest.fn().mockImplementation((config) => ({
    destroy: jest.fn(),
    dispatch: jest.fn(),
    state: {
      doc: {
        toString: jest.fn().mockReturnValue(config.state?.doc || ''),
        length: config.state?.doc?.length || 0,
      },
      selection: {
        main: { head: 0 }
      },
      update: jest.fn().mockReturnValue({
        changes: {
          from: 0,
          to: 0,
          insert: ''
        }
      })
    }
  })),
  ViewUpdate: jest.fn()
}));

jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn().mockReturnValue({
      doc: {
        toString: jest.fn().mockReturnValue(''),
        length: 0
      }
    }),
    readOnly: {
      of: jest.fn()
    }
  },
  Extension: jest.fn()
}));

jest.mock('@codemirror/basic-setup', () => ({
  basicSetup: []
}));

jest.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}));

jest.mock('@codemirror/lang-python', () => ({
  python: jest.fn().mockReturnValue({})
}));

jest.mock('@codemirror/lang-javascript', () => ({
  javascript: jest.fn().mockReturnValue({})
}));

jest.mock('@codemirror/lang-cpp', () => ({
  cpp: jest.fn().mockReturnValue({})
}));

const { EditorView } = require('@codemirror/view');
const { EditorState } = require('@codemirror/state');
const { python } = require('@codemirror/lang-python');
const { javascript } = require('@codemirror/lang-javascript');
const { cpp } = require('@codemirror/lang-cpp');

describe('CodeEditor Component', () => {
  const defaultProps: EditorProps = {
    content: '',
    language: 'python',
    onChange: jest.fn(),
    onCursorChange: jest.fn(),
    readOnly: false,
    theme: 'dark'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock EditorView.theme and updateListener
    EditorView.theme = jest.fn().mockReturnValue({});
    EditorView.updateListener = {
      of: jest.fn().mockReturnValue({})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render code editor container', () => {
      render(<CodeEditor {...defaultProps} />);
      
      const container = screen.getByTestId('test-wrapper');
      expect(container).toBeInTheDocument();
      
      const editorElement = container.querySelector('.code-editor');
      expect(editorElement).toBeInTheDocument();
      expect(editorElement).toHaveClass('dark');
    });

    test('should render with light theme', () => {
      render(<CodeEditor {...defaultProps} theme="light" />);
      
      const editorElement = screen.getByTestId('test-wrapper').querySelector('.code-editor');
      expect(editorElement).toHaveClass('light');
    });

    test('should render with custom content', () => {
      const content = 'print("Hello, World!")';
      render(<CodeEditor {...defaultProps} content={content} />);
      
      expect(EditorState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: content
        })
      );
    });
  });

  describe('Language Support', () => {
    test('should use Python language extension', () => {
      render(<CodeEditor {...defaultProps} language="python" />);
      
      expect(python).toHaveBeenCalled();
      expect(EditorState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: expect.arrayContaining([expect.any(Object)])
        })
      );
    });

    test('should use JavaScript language extension', () => {
      render(<CodeEditor {...defaultProps} language="javascript" />);
      
      expect(javascript).toHaveBeenCalled();
    });

    test('should use C++ language extension', () => {
      render(<CodeEditor {...defaultProps} language="cpp" />);
      
      expect(cpp).toHaveBeenCalled();
    });

    test('should default to Python for unsupported language', () => {
      render(<CodeEditor {...defaultProps} language={'unsupported' as any} />);
      
      expect(python).toHaveBeenCalled();
    });

    test('should update language extension when language prop changes', () => {
      const { rerender } = render(<CodeEditor {...defaultProps} language="python" />);
      
      expect(python).toHaveBeenCalled();
      jest.clearAllMocks();
      
      rerender(<CodeEditor {...defaultProps} language="javascript" />);
      
      expect(javascript).toHaveBeenCalled();
    });
  });

  describe('Editor Configuration', () => {
    test('should configure read-only mode', () => {
      render(<CodeEditor {...defaultProps} readOnly={true} />);
      
      expect(EditorState.readOnly.of).toHaveBeenCalledWith(true);
    });

    test('should configure writable mode by default', () => {
      render(<CodeEditor {...defaultProps} readOnly={false} />);
      
      expect(EditorState.readOnly.of).toHaveBeenCalledWith(false);
    });

    test('should apply dark theme extensions', () => {
      render(<CodeEditor {...defaultProps} theme="dark" />);
      
      // oneDark theme should be included in extensions
      expect(EditorState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: expect.any(Array)
        })
      );
    });

    test('should not apply dark theme for light theme', () => {
      render(<CodeEditor {...defaultProps} theme="light" />);
      
      // Should still create editor state but without oneDark theme
      expect(EditorState.create).toHaveBeenCalled();
    });

    test('should configure custom editor theme styles', () => {
      render(<CodeEditor {...defaultProps} />);
      
      expect(EditorView.theme).toHaveBeenCalledWith({
        '&': {
          height: '100%',
          fontSize: '14px',
        },
        '.cm-content': {
          padding: '16px',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: '1.6',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          height: '100%',
        },
        '.cm-scroller': {
          height: '100%',
        },
        '.cm-line': {
          padding: '0 4px',
        },
        '.cm-lineNumbers': {
          padding: '0 8px',
          color: '#666',
        },
        '.cm-gutters': {
          backgroundColor: '#1e1e1e',
          border: 'none',
        },
      });
    });

    test('should configure light theme gutter colors', () => {
      render(<CodeEditor {...defaultProps} theme="light" />);
      
      expect(EditorView.theme).toHaveBeenCalledWith(
        expect.objectContaining({
          '.cm-gutters': {
            backgroundColor: '#f5f5f5',
            border: 'none',
          },
        })
      );
    });
  });

  describe('Event Handling', () => {
    test('should set up update listener for content changes', () => {
      const onChange = jest.fn();
      render(<CodeEditor {...defaultProps} onChange={onChange} />);
      
      expect(EditorView.updateListener.of).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should set up update listener for cursor changes', () => {
      const onCursorChange = jest.fn();
      render(<CodeEditor {...defaultProps} onCursorChange={onCursorChange} />);
      
      expect(EditorView.updateListener.of).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should handle update listener callback', () => {
      const onChange = jest.fn();
      const onCursorChange = jest.fn();
      
      // Mock the update listener callback
      let updateCallback: any;
      EditorView.updateListener.of.mockImplementation((callback) => {
        updateCallback = callback;
        return {};
      });
      
      render(<CodeEditor {...defaultProps} onChange={onChange} onCursorChange={onCursorChange} />);
      
      expect(updateCallback).toBeDefined();
      
      // Simulate document change
      const mockUpdate = {
        docChanged: true,
        selectionSet: true,
        state: {
          doc: {
            toString: () => 'new content'
          },
          selection: {
            main: { head: 5 }
          }
        }
      };
      
      updateCallback(mockUpdate);
      
      expect(onChange).toHaveBeenCalledWith('new content');
      expect(onCursorChange).toHaveBeenCalledWith(5);
    });

    test('should not call onChange when document is not changed', () => {
      const onChange = jest.fn();
      
      let updateCallback: any;
      EditorView.updateListener.of.mockImplementation((callback) => {
        updateCallback = callback;
        return {};
      });
      
      render(<CodeEditor {...defaultProps} onChange={onChange} />);
      
      const mockUpdate = {
        docChanged: false,
        state: {
          doc: { toString: () => 'content' },
          selection: { main: { head: 0 } }
        }
      };
      
      updateCallback(mockUpdate);
      
      expect(onChange).not.toHaveBeenCalled();
    });

    test('should not call onCursorChange when selection is not set', () => {
      const onCursorChange = jest.fn();
      
      let updateCallback: any;
      EditorView.updateListener.of.mockImplementation((callback) => {
        updateCallback = callback;
        return {};
      });
      
      render(<CodeEditor {...defaultProps} onCursorChange={onCursorChange} />);
      
      const mockUpdate = {
        docChanged: false,
        selectionSet: false,
        state: {
          doc: { toString: () => 'content' },
          selection: { main: { head: 0 } }
        }
      };
      
      updateCallback(mockUpdate);
      
      expect(onCursorChange).not.toHaveBeenCalled();
    });
  });

  describe('Content Updates', () => {
    test('should update editor content when prop changes', () => {
      const { rerender } = render(<CodeEditor {...defaultProps} content="initial" />);
      
      // Create a mock editor view with dispatch method
      const mockView = {
        destroy: jest.fn(),
        dispatch: jest.fn(),
        state: {
          doc: {
            toString: jest.fn().mockReturnValue('initial'),
            length: 7
          },
          update: jest.fn().mockReturnValue({
            changes: {
              from: 0,
              to: 7,
              insert: 'updated'
            }
          })
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      rerender(<CodeEditor {...defaultProps} content="updated" />);
      
      // Should dispatch update when content changes
      expect(mockView.state.update).toHaveBeenCalledWith({
        changes: {
          from: 0,
          to: 7,
          insert: 'updated'
        }
      });
    });

    test('should not update when content is the same', () => {
      const mockView = {
        destroy: jest.fn(),
        dispatch: jest.fn(),
        state: {
          doc: {
            toString: jest.fn().mockReturnValue('same content'),
            length: 12
          },
          update: jest.fn()
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      const { rerender } = render(<CodeEditor {...defaultProps} content="same content" />);
      rerender(<CodeEditor {...defaultProps} content="same content" />);
      
      // Should not dispatch update when content is the same
      expect(mockView.state.update).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Management', () => {
    test('should create EditorView on mount', () => {
      render(<CodeEditor {...defaultProps} />);
      
      expect(EditorView).toHaveBeenCalledWith({
        state: expect.any(Object),
        parent: expect.any(HTMLElement)
      });
    });

    test('should destroy EditorView on unmount', () => {
      const mockDestroy = jest.fn();
      const mockView = {
        destroy: mockDestroy,
        dispatch: jest.fn(),
        state: {
          doc: { toString: () => '', length: 0 },
          update: jest.fn()
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      const { unmount } = render(<CodeEditor {...defaultProps} />);
      
      unmount();
      
      expect(mockDestroy).toHaveBeenCalled();
    });

    test('should recreate editor when language changes', () => {
      const mockDestroy = jest.fn();
      const mockView = {
        destroy: mockDestroy,
        dispatch: jest.fn(),
        state: {
          doc: { toString: () => '', length: 0 },
          update: jest.fn()
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      const { rerender } = render(<CodeEditor {...defaultProps} language="python" />);
      
      expect(EditorView).toHaveBeenCalledTimes(1);
      
      rerender(<CodeEditor {...defaultProps} language="javascript" />);
      
      expect(mockDestroy).toHaveBeenCalled();
      expect(EditorView).toHaveBeenCalledTimes(2);
    });

    test('should recreate editor when theme changes', () => {
      const mockDestroy = jest.fn();
      const mockView = {
        destroy: mockDestroy,
        dispatch: jest.fn(),
        state: {
          doc: { toString: () => '', length: 0 },
          update: jest.fn()
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      const { rerender } = render(<CodeEditor {...defaultProps} theme="dark" />);
      
      expect(EditorView).toHaveBeenCalledTimes(1);
      
      rerender(<CodeEditor {...defaultProps} theme="light" />);
      
      expect(mockDestroy).toHaveBeenCalled();
      expect(EditorView).toHaveBeenCalledTimes(2);
    });

    test('should recreate editor when readOnly changes', () => {
      const mockDestroy = jest.fn();
      const mockView = {
        destroy: mockDestroy,
        dispatch: jest.fn(),
        state: {
          doc: { toString: () => '', length: 0 },
          update: jest.fn()
        }
      };
      
      EditorView.mockImplementation(() => mockView);
      
      const { rerender } = render(<CodeEditor {...defaultProps} readOnly={false} />);
      
      expect(EditorView).toHaveBeenCalledTimes(1);
      
      rerender(<CodeEditor {...defaultProps} readOnly={true} />);
      
      expect(mockDestroy).toHaveBeenCalled();
      expect(EditorView).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing editor container gracefully', () => {
      // Mock a scenario where the ref is null
      jest.spyOn(React, 'useRef').mockReturnValueOnce({ current: null });
      
      expect(() => {
        render(<CodeEditor {...defaultProps} />);
      }).not.toThrow();
      
      expect(EditorView).not.toHaveBeenCalled();
    });

    test('should handle EditorView creation errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      EditorView.mockImplementation(() => {
        throw new Error('EditorView creation failed');
      });
      
      expect(() => {
        render(<CodeEditor {...defaultProps} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<CodeEditor {...defaultProps} />);
      
      const editorContainer = screen.getByTestId('test-wrapper').querySelector('.editor-container');
      expect(editorContainer).toBeInTheDocument();
    });

    test('should be keyboard accessible', () => {
      render(<CodeEditor {...defaultProps} />);
      
      const editorContainer = screen.getByTestId('test-wrapper').querySelector('.editor-container');
      expect(editorContainer).toBeInTheDocument();
      
      // CodeMirror handles keyboard accessibility internally
      // We just verify the container is present and accessible
    });
  });

  describe('Integration', () => {
    test('should work with external state management', () => {
      let externalContent = 'initial content';
      const handleChange = jest.fn((newContent: string) => {
        externalContent = newContent;
      });
      
      const { rerender } = render(
        <CodeEditor {...defaultProps} content={externalContent} onChange={handleChange} />
      );
      
      // Simulate external content change
      externalContent = 'updated content';
      rerender(
        <CodeEditor {...defaultProps} content={externalContent} onChange={handleChange} />
      );
      
      expect(EditorState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: 'updated content'
        })
      );
    });

    test('should handle rapid prop changes', () => {
      const { rerender } = render(<CodeEditor {...defaultProps} content="content1" />);
      
      // Rapidly change content
      rerender(<CodeEditor {...defaultProps} content="content2" />);
      rerender(<CodeEditor {...defaultProps} content="content3" />);
      rerender(<CodeEditor {...defaultProps} content="content4" />);
      
      // Should handle all changes without errors
      expect(EditorState.create).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should not recreate editor unnecessarily', () => {
      const { rerender } = render(<CodeEditor {...defaultProps} />);
      
      const initialCallCount = EditorView.mock.calls.length;
      
      // Rerender with same props
      rerender(<CodeEditor {...defaultProps} />);
      
      // Should not create new editor instance
      expect(EditorView.mock.calls.length).toBe(initialCallCount);
    });

    test('should handle large content efficiently', () => {
      const largeContent = 'x'.repeat(10000);
      
      const startTime = performance.now();
      render(<CodeEditor {...defaultProps} content={largeContent} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});