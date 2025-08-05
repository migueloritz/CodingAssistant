import React, { useState, useRef, useEffect } from 'react';
import { SupportedLanguage } from '../../types';
import { ChevronDown, Code2 } from 'lucide-react';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
}

interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  extension: string;
  color: string;
  icon: string;
}

const languageOptions: LanguageOption[] = [
  {
    value: 'python',
    label: 'Python',
    extension: '.py',
    color: '#3776ab',
    icon: '🐍',
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    extension: '.js',
    color: '#f7df1e',
    icon: '⚡',
  },
  {
    value: 'cpp',
    label: 'C++',
    extension: '.cpp',
    color: '#00599c',
    icon: '⚙️',
  },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = languageOptions.find(option => option.value === currentLanguage);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        className={`language-selector-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select programming language"
      >
        <div className="language-info">
          <span className="language-icon">{currentOption?.icon}</span>
          <div className="language-details">
            <span className="language-name">{currentOption?.label}</span>
            <span className="language-extension">{currentOption?.extension}</span>
          </div>
        </div>
        <ChevronDown 
          className={`chevron ${isOpen ? 'rotated' : ''}`} 
          size={16} 
        />
      </button>

      {isOpen && (
        <div className="language-selector-dropdown">
          <div className="dropdown-header">
            <Code2 size={16} />
            <span>Select Language</span>
          </div>
          
          <div className="language-options" role="listbox">
            {languageOptions.map((option) => (
              <button
                key={option.value}
                className={`language-option ${option.value === currentLanguage ? 'selected' : ''}`}
                onClick={() => handleLanguageSelect(option.value)}
                role="option"
                aria-selected={option.value === currentLanguage}
              >
                <div className="option-content">
                  <span className="option-icon">{option.icon}</span>
                  <div className="option-details">
                    <span className="option-name">{option.label}</span>
                    <span className="option-extension">{option.extension}</span>
                  </div>
                </div>
                
                <div 
                  className="language-color-indicator"
                  style={{ backgroundColor: option.color }}
                />
                
                {option.value === currentLanguage && (
                  <div className="selected-indicator">✓</div>
                )}
              </button>
            ))}
          </div>
          
          <div className="dropdown-footer">
            <span className="footer-text">More languages coming soon</span>
          </div>
        </div>
      )}
    </div>
  );
};