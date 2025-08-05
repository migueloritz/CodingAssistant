import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSelector } from '../../components/LanguageSelector/LanguageSelector';
import { SupportedLanguage } from '../../types';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: ({ className, size, ...props }: any) => (
    <div data-testid="chevron-down-icon" className={className} data-size={size} {...props} />
  ),
  Code2: ({ size, ...props }: any) => (
    <div data-testid="code2-icon" data-size={size} {...props} />
  ),
}));

describe('LanguageSelector Component', () => {
  const defaultProps = {
    currentLanguage: 'python' as SupportedLanguage,
    onLanguageChange: jest.fn(),
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    user = userEvent.setup({
      // Disable clipboard setup to avoid conflicts
      writeToClipboard: false,
    });
  });

  describe('Rendering', () => {
    test('should render with current language selected', () => {
      render(<LanguageSelector {...defaultProps} />);

      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('.py')).toBeInTheDocument();
      expect(screen.getByText('🐍')).toBeInTheDocument();
    });

    test('should render with JavaScript selected', () => {
      render(<LanguageSelector {...defaultProps} currentLanguage="javascript" />);

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('.js')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
    });

    test('should render with C++ selected', () => {
      render(<LanguageSelector {...defaultProps} currentLanguage="cpp" />);

      expect(screen.getByText('C++')).toBeInTheDocument();
      expect(screen.getByText('.cpp')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    test('should render trigger button with correct attributes', () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-label', 'Select programming language');
    });

    test('should show chevron icon in trigger', () => {
      render(<LanguageSelector {...defaultProps} />);

      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
    });

    test('should not show dropdown initially', () => {
      render(<LanguageSelector {...defaultProps} />);

      expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    test('should open dropdown when trigger is clicked', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByText('Select Language')).toBeInTheDocument();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('should close dropdown when trigger is clicked again', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      // Open dropdown
      await user.click(trigger);
      expect(screen.getByText('Select Language')).toBeInTheDocument();

      // Close dropdown
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('should toggle open class on trigger button', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      expect(trigger).not.toHaveClass('open');

      await user.click(trigger);
      expect(trigger).toHaveClass('open');

      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).not.toHaveClass('open');
      });
    });

    test('should rotate chevron icon when dropdown is open', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const chevron = screen.getByTestId('chevron-down-icon');
      const trigger = screen.getByRole('button', { name: /select programming language/i });

      expect(chevron).not.toHaveClass('rotated');

      await user.click(trigger);
      expect(chevron).toHaveClass('rotated');

      await user.click(trigger);
      await waitFor(() => {
        expect(chevron).not.toHaveClass('rotated');
      });
    });
  });

  describe('Dropdown Content', () => {
    test('should show all language options when dropdown is open', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      // Check all language options are present
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('C++')).toBeInTheDocument();

      // Check extensions
      expect(screen.getAllByText('.py')).toHaveLength(2); // One in trigger, one in dropdown
      expect(screen.getAllByText('.js')).toHaveLength(1);
      expect(screen.getAllByText('.cpp')).toHaveLength(1);

      // Check icons
      expect(screen.getAllByText('🐍')).toHaveLength(2); // One in trigger, one in dropdown
      expect(screen.getAllByText('⚡')).toHaveLength(1);
      expect(screen.getAllByText('⚙️')).toHaveLength(1);
    });

    test('should show header and footer in dropdown', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByText('Select Language')).toBeInTheDocument();
      expect(screen.getByText('More languages coming soon')).toBeInTheDocument();
      expect(screen.getByTestId('code2-icon')).toBeInTheDocument();
    });

    test('should mark current language as selected', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const options = screen.getAllByRole('option');
      const pythonOption = options.find(option => 
        option.textContent?.includes('Python')
      );

      expect(pythonOption).toHaveClass('selected');
      expect(pythonOption).toHaveAttribute('aria-selected', 'true');
      expect(pythonOption?.querySelector('.selected-indicator')).toHaveTextContent('✓');
    });

    test('should show color indicators for each language', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const colorIndicators = document.querySelectorAll('.language-color-indicator');
      expect(colorIndicators).toHaveLength(3);

      // Check Python color
      expect(colorIndicators[0]).toHaveStyle('background-color: #3776ab');
      // Check JavaScript color
      expect(colorIndicators[1]).toHaveStyle('background-color: #f7df1e');
      // Check C++ color
      expect(colorIndicators[2]).toHaveStyle('background-color: #00599c');
    });

    test('should have proper ARIA attributes for options', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toBeInTheDocument();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);

      options.forEach(option => {
        expect(option).toHaveAttribute('aria-selected');
        expect(option).toHaveAttribute('role', 'option');
      });
    });
  });

  describe('Language Selection', () => {
    test('should call onLanguageChange when different language is selected', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const jsOption = screen.getAllByRole('option').find(option =>
        option.textContent?.includes('JavaScript')
      );

      await user.click(jsOption!);

      expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('javascript');
    });

    test('should call onLanguageChange when C++ is selected', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const cppOption = screen.getAllByRole('option').find(option =>
        option.textContent?.includes('C++')
      );

      await user.click(cppOption!);

      expect(defaultProps.onLanguageChange).toHaveBeenCalledWith('cpp');
    });

    test('should close dropdown after language selection', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const jsOption = screen.getAllByRole('option').find(option =>
        option.textContent?.includes('JavaScript')
      );

      await user.click(jsOption!);

      await waitFor(() => {
        expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('should update selected option when current language changes', () => {
      const { rerender } = render(<LanguageSelector {...defaultProps} />);

      expect(screen.getByText('Python')).toBeInTheDocument();

      rerender(<LanguageSelector {...defaultProps} currentLanguage="javascript" />);

      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.queryByText('Python')).not.toBeInTheDocument();
    });
  });

  describe('Click Outside to Close', () => {
    test('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <LanguageSelector {...defaultProps} />
        </div>
      );

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByText('Select Language')).toBeInTheDocument();

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      });
    });

    test('should not close dropdown when clicking inside', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByText('Select Language')).toBeInTheDocument();

      // Click inside dropdown
      const header = screen.getByText('Select Language');
      fireEvent.mouseDown(header);

      // Should still be open
      expect(screen.getByText('Select Language')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should close dropdown when Escape key is pressed', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByText('Select Language')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      });
    });

    test('should only add escape listener when dropdown is open', async () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      render(<LanguageSelector {...defaultProps} />);

      // Initially no keydown listener should be added
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      // Should add keydown listener when opened
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      await user.click(trigger);

      // Should remove keydown listener when closed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    test('should be keyboard accessible', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      // Should be focusable
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      // Should open on Enter
      fireEvent.keyDown(trigger, { key: 'Enter' });
      await waitFor(() => {
        expect(screen.getByText('Select Language')).toBeInTheDocument();
      });

      // Should close on Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      });
    });

    test('should open on Space key', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      trigger.focus();

      fireEvent.keyDown(trigger, { key: ' ' });

      await waitFor(() => {
        expect(screen.getByText('Select Language')).toBeInTheDocument();
      });
    });
  });

  describe('Component Lifecycle', () => {
    test('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(<LanguageSelector {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    test('should handle rapid open/close operations', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });

      // Rapidly toggle dropdown
      for (let i = 0; i < 5; i++) {
        await user.click(trigger);
        await user.click(trigger);
      }

      // Should end up closed
      expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing current language gracefully', () => {
      // Test with undefined current language
      const props = {
        ...defaultProps,
        currentLanguage: undefined as any,
      };

      expect(() => render(<LanguageSelector {...props} />)).not.toThrow();

      // Should still render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should handle invalid current language gracefully', () => {
      const props = {
        ...defaultProps,
        currentLanguage: 'invalid' as any,
      };

      expect(() => render(<LanguageSelector {...props} />)).not.toThrow();

      // Should still render without crashing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<LanguageSelector {...defaultProps} onLanguageChange={errorCallback} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const jsOption = screen.getAllByRole('option').find(option =>
        option.textContent?.includes('JavaScript')
      );

      // Should not crash when callback throws error
      expect(() => {
        fireEvent.click(jsOption!);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      expect(trigger).toHaveAttribute('aria-label', 'Select programming language');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    test('should update aria-expanded when dropdown state changes', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
    });

    test('should have proper role attributes for dropdown elements', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    test('should support screen readers with aria-selected', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const options = screen.getAllByRole('option');
      
      // Python should be selected
      const pythonOption = options.find(option => 
        option.textContent?.includes('Python')
      );
      expect(pythonOption).toHaveAttribute('aria-selected', 'true');

      // Others should not be selected
      const jsOption = options.find(option => 
        option.textContent?.includes('JavaScript')
      );
      expect(jsOption).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Visual States', () => {
    test('should apply correct CSS classes', () => {
      render(<LanguageSelector {...defaultProps} />);

      const container = document.querySelector('.language-selector');
      const trigger = screen.getByRole('button');

      expect(container).toHaveClass('language-selector');
      expect(trigger).toHaveClass('language-selector-trigger');
    });

    test('should apply open class when dropdown is visible', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      
      expect(trigger).not.toHaveClass('open');

      await user.click(trigger);
      expect(trigger).toHaveClass('open');
    });

    test('should show selected indicator only for current language', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });
      await user.click(trigger);

      const selectedIndicators = document.querySelectorAll('.selected-indicator');
      expect(selectedIndicators).toHaveLength(1);
      expect(selectedIndicators[0]).toHaveTextContent('✓');
    });
  });

  describe('Performance', () => {
    test('should not recreate options unnecessarily', () => {
      const { rerender } = render(<LanguageSelector {...defaultProps} />);

      const initialTrigger = screen.getByRole('button');

      rerender(<LanguageSelector {...defaultProps} />);

      const rerenderedTrigger = screen.getByRole('button');
      expect(rerenderedTrigger).toBe(initialTrigger);
    });

    test('should handle rapid state changes efficiently', async () => {
      render(<LanguageSelector {...defaultProps} />);

      const trigger = screen.getByRole('button', { name: /select programming language/i });

      const startTime = performance.now();

      // Perform rapid operations
      for (let i = 0; i < 10; i++) {
        await user.click(trigger);
        await user.click(trigger);
      }

      const endTime = performance.now();

      // Should complete quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});