import React, { useEffect, useRef } from 'react';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { EditorProps, SupportedLanguage } from '../../types';
import './CodeEditor.css';

export const CodeEditor: React.FC<EditorProps> = ({
  content,
  language,
  onChange,
  onCursorChange,
  readOnly = false,
  theme = 'dark',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Get language extension based on selected language
  const getLanguageExtension = (lang: SupportedLanguage): Extension => {
    switch (lang) {
      case 'python':
        return python();
      case 'javascript':
        return javascript();
      case 'cpp':
        return cpp();
      default:
        return python();
    }
  };

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    // Create minimal extensions to avoid complex dependencies
    const extensions: Extension[] = [
      getLanguageExtension(language),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          const newContent = update.state.doc.toString();
          onChange(newContent);
        }
        
        if (update.selectionSet && onCursorChange) {
          const cursor = update.state.selection.main.head;
          onCursorChange(cursor);
        }
      }),
      EditorState.readOnly.of(readOnly || false),
      EditorView.theme({
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
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f5f5f5',
          border: 'none',
        },
      }),
    ];

    // Add theme
    if (theme === 'dark') {
      extensions.push(oneDark);
    }

    const startState = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, theme, readOnly]);

  // Update content when prop changes
  useEffect(() => {
    if (viewRef.current && content !== viewRef.current.state.doc.toString()) {
      const transaction = viewRef.current.state.update({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: content,
        },
      });
      viewRef.current.dispatch(transaction);
    }
  }, [content]);

  return (
    <div className={`code-editor ${theme}`}>
      <div className="editor-container" ref={editorRef} />
    </div>
  );
};