import React, { useState } from 'react';
import { OutputResult } from '../../types';
import { 
  Terminal, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Trash2, 
  Copy,
  ChevronDown,
  ChevronRight,
  Clock
} from 'lucide-react';
import './OutputPanel.css';

// XSS protection utility function
const sanitizeContent = (content: string): string => {
  // Escape HTML entities to prevent XSS
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

interface OutputPanelProps {
  outputs: OutputResult[];
  onClear: () => void;
}

export const OutputPanel: React.FC<OutputPanelProps> = ({ outputs, onClear }) => {
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'all' | 'errors' | 'warnings' | 'success'>('all');

  const toggleCollapse = (id: string) => {
    const newCollapsed = new Set(collapsedItems);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsedItems(newCollapsed);
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = (status: OutputResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="status-icon success" size={16} />;
      case 'error':
        return <AlertCircle className="status-icon error" size={16} />;
      case 'warning':
        return <AlertCircle className="status-icon warning" size={16} />;
      default:
        return <Info className="status-icon info" size={16} />;
    }
  };

  const getTypeLabel = (type: OutputResult['type']) => {
    switch (type) {
      case 'execution':
        return 'Execution';
      case 'analysis':
        return 'Analysis';
      case 'explanation':
        return 'Explanation';
      case 'improvement':
        return 'Improvement';
      default:
        return 'Output';
    }
  };

  const filteredOutputs = outputs.filter(output => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'errors') return output.status === 'error';
    if (selectedTab === 'warnings') return output.status === 'warning';
    if (selectedTab === 'success') return output.status === 'success';
    return true;
  });

  const getTabCount = (tab: typeof selectedTab) => {
    if (tab === 'all') return outputs.length;
    return outputs.filter(output => output.status === (tab === 'success' ? 'success' : tab.slice(0, -1))).length;
  };

  return (
    <div className="output-panel">
      <div className="output-header">
        <div className="output-title">
          <Terminal size={18} />
          <span>Output</span>
        </div>
        
        <div className="output-tabs">
          <button
            className={`tab ${selectedTab === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTab('all')}
          >
            All ({getTabCount('all')})
          </button>
          <button
            className={`tab ${selectedTab === 'errors' ? 'active' : ''}`}
            onClick={() => setSelectedTab('errors')}
          >
            Errors ({getTabCount('errors')})
          </button>
          <button
            className={`tab ${selectedTab === 'warnings' ? 'active' : ''}`}
            onClick={() => setSelectedTab('warnings')}
          >
            Warnings ({getTabCount('warnings')})
          </button>
          <button
            className={`tab ${selectedTab === 'success' ? 'active' : ''}`}
            onClick={() => setSelectedTab('success')}
          >
            Success ({getTabCount('success')})
          </button>
        </div>

        <button
          className="clear-button"
          onClick={onClear}
          disabled={outputs.length === 0}
          title="Clear all outputs"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="output-content">
        {filteredOutputs.length === 0 ? (
          <div className="empty-state">
            <Terminal size={48} />
            <p>No output yet</p>
            <span>Results will appear here when you run actions</span>
          </div>
        ) : (
          <div className="output-list">
            {filteredOutputs.map((output) => {
              const isCollapsed = collapsedItems.has(output.id);
              
              return (
                <div
                  key={output.id}
                  className={`output-item ${output.status}`}
                >
                  <div className="output-item-header">
                    <button
                      className="collapse-button"
                      onClick={() => toggleCollapse(output.id)}
                    >
                      {isCollapsed ? (
                        <ChevronRight size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>

                    {getStatusIcon(output.status)}
                    
                    <span className="output-type">
                      {getTypeLabel(output.type)}
                    </span>
                    
                    {output.language && (
                      <span className="output-language">
                        {output.language.toUpperCase()}
                      </span>
                    )}
                    
                    <div className="output-timestamp">
                      <Clock size={12} />
                      <span>{output.timestamp.toLocaleTimeString()}</span>
                    </div>

                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(output.content)}
                      title="Copy to clipboard"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="output-item-content">
                      <pre 
                        className="output-text"
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeContent(output.content) 
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};