import React, { useState } from 'react';
import { 
  Wand2, 
  Bug, 
  HelpCircle, 
  TrendingUp, 
  Loader2,
  Zap,
  Settings
} from 'lucide-react';
import './ActionButtons.css';

interface ActionButtonsProps {
  onAction: (action: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

interface ActionConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  description: string;
  color: string;
  variant: 'primary' | 'secondary' | 'tertiary';
}

const actions: ActionConfig[] = [
  {
    id: 'generate',
    label: 'Generate',
    icon: <Wand2 size={16} />,
    shortcut: 'Ctrl+G',
    description: 'Generate code suggestions and completions',
    color: '#4f46e5',
    variant: 'primary',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: <Bug size={16} />,
    shortcut: 'Ctrl+D',
    description: 'Analyze code for errors and issues',
    color: '#dc2626',
    variant: 'secondary',
  },
  {
    id: 'explain',
    label: 'Explain',
    icon: <HelpCircle size={16} />,
    shortcut: 'Ctrl+E',
    description: 'Get detailed code explanations',
    color: '#059669',
    variant: 'secondary',
  },
  {
    id: 'improve',
    label: 'Improve',
    icon: <TrendingUp size={16} />,
    shortcut: 'Ctrl+I',
    description: 'Suggest code improvements and optimizations',
    color: '#7c2d12',
    variant: 'tertiary',
  },
];

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAction,
  isLoading,
  disabled = false,
}) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleAction = async (actionId: string) => {
    if (disabled || isLoading) return;
    
    setActiveAction(actionId);
    setShowTooltip(null);
    
    try {
      await onAction(actionId);
    } finally {
      setActiveAction(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, actionId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAction(actionId);
    }
  };

  const showTooltipHandler = (actionId: string) => {
    if (!isLoading) {
      setShowTooltip(actionId);
    }
  };

  const hideTooltipHandler = () => {
    setShowTooltip(null);
  };

  // Add keyboard shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || disabled || isLoading) return;

      const actionMap: Record<string, string> = {
        'g': 'generate',
        'd': 'debug',
        'e': 'explain',
        'i': 'improve',
      };

      const actionId = actionMap[event.key.toLowerCase()];
      if (actionId) {
        event.preventDefault();
        handleAction(actionId);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled, isLoading, onAction]);

  return (
    <div className="action-buttons">
      <div className="action-buttons-group">
        {actions.map((action) => {
          const isActive = activeAction === action.id;
          const showLoadingSpinner = isLoading && isActive;
          
          return (
            <div key={action.id} className="action-button-wrapper">
              <button
                className={`action-button ${action.variant} ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => handleAction(action.id)}
                onKeyDown={(e) => handleKeyDown(e, action.id)}
                onMouseEnter={() => showTooltipHandler(action.id)}
                onMouseLeave={hideTooltipHandler}
                onFocus={() => showTooltipHandler(action.id)}
                onBlur={hideTooltipHandler}
                disabled={disabled || isLoading}
                aria-label={`${action.label}: ${action.description}`}
                aria-describedby={`tooltip-${action.id}`}
                style={{
                  '--action-color': action.color,
                } as React.CSSProperties}
              >
                <div className="button-content">
                  <div className="button-icon">
                    {showLoadingSpinner ? (
                      <Loader2 className="spinner" size={16} />
                    ) : (
                      action.icon
                    )}
                  </div>
                  <span className="button-label">{action.label}</span>
                </div>
                
                {action.variant === 'primary' && (
                  <div className="button-pulse" />
                )}
              </button>

              {showTooltip === action.id && (
                <div 
                  className="action-tooltip"
                  id={`tooltip-${action.id}`}
                  role="tooltip"
                >
                  <div className="tooltip-content">
                    <div className="tooltip-header">
                      <span className="tooltip-title">{action.label}</span>
                      <kbd className="tooltip-shortcut">{action.shortcut}</kbd>
                    </div>
                    <p className="tooltip-description">{action.description}</p>
                  </div>
                  <div className="tooltip-arrow" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="action-buttons-secondary">
        <button
          className="settings-button"
          aria-label="Action settings"
          disabled={disabled || isLoading}
        >
          <Settings size={16} />
        </button>

        <div className="quick-action-indicator">
          <Zap size={12} />
          <span>Quick Actions</span>
        </div>
      </div>
    </div>
  );
};