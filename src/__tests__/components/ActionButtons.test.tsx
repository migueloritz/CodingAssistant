import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionButtons } from '../../components/ActionButtons/ActionButtons';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Wand2: ({ className, ...props }: any) => <div data-testid="wand2-icon" className={className} {...props} />,
  Bug: ({ className, ...props }: any) => <div data-testid="bug-icon" className={className} {...props} />,
  HelpCircle: ({ className, ...props }: any) => <div data-testid="help-circle-icon" className={className} {...props} />,
  TrendingUp: ({ className, ...props }: any) => <div data-testid="trending-up-icon" className={className} {...props} />,
  Loader2: ({ className, ...props }: any) => <div data-testid="loader-icon" className={className} {...props} />
}));

describe('ActionButtons Component', () => {
  const defaultProps = {
    onAction: jest.fn(),
    isLoading: false,
    disabled: false
  };

  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render all action buttons', () => {
      render(<ActionButtons {...defaultProps} />);
      
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Explain')).toBeInTheDocument();
      expect(screen.getByText('Improve')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    test('should render correct icons for each button', () => {
      render(<ActionButtons {...defaultProps} />);
      
      expect(screen.getByTestId('wand2-icon')).toBeInTheDocument();
      expect(screen.getByTestId('help-circle-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bug-icon')).toBeInTheDocument();
    });

    test('should apply correct CSS classes', () => {
      render(<ActionButtons {...defaultProps} />);
      
      const container = screen.getByRole('toolbar');
      expect(container).toHaveClass('action-buttons');
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('action-button');
      });
    });

    test('should have proper accessibility attributes', () => {
      render(<ActionButtons {...defaultProps} />);
      
      const container = screen.getByRole('toolbar');
      expect(container).toHaveAttribute('role', 'toolbar');
      
      const generateButton = screen.getByText('Generate').closest('button');
      expect(generateButton).toHaveAttribute('type', 'button');
      expect(generateButton).toHaveAttribute('title', expect.stringContaining('Generate'));
    });
  });

  describe('Button Interactions', () => {
    test('should call onAction with "generate" when Generate button is clicked', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('generate');
    });

    test('should call onAction with "explain" when Explain button is clicked', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const explainButton = screen.getByText('Explain');
      await user.click(explainButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('explain');
    });

    test('should call onAction with "improve" when Improve button is clicked', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const improveButton = screen.getByText('Improve');
      await user.click(improveButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('improve');
    });

    test('should call onAction with "debug" when Debug button is clicked', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const debugButton = screen.getByText('Debug');
      await user.click(debugButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('debug');
    });

    test('should handle multiple rapid clicks', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const generateButton = screen.getByText('Generate');
      
      await user.click(generateButton);
      await user.click(generateButton);
      await user.click(generateButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(3);
      expect(defaultProps.onAction).toHaveBeenCalledWith('generate');
    });
  });

  describe('Loading State', () => {
    test('should show loading icons when isLoading is true', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const loaderIcons = screen.getAllByTestId('loader-icon');
      expect(loaderIcons.length).toBeGreaterThan(0);
      
      // Generate button should show loader instead of play icon
      const generateButton = screen.getByText('Generate').closest('button');
      expect(generateButton?.querySelector('[data-testid="loader-icon"]')).toBeInTheDocument();
    });

    test('should disable buttons when isLoading is true', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    test('should not call handlers when buttons are disabled due to loading', async () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(defaultProps.onAction).not.toHaveBeenCalled();
    });

    test('should apply loading CSS class when isLoading is true', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('loading');
      });
    });

    test('should animate loading icons', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const loaderIcons = screen.getAllByTestId('loader-icon');
      loaderIcons.forEach(icon => {
        expect(icon).toHaveClass('animate-spin');
      });
    });
  });

  describe('Disabled State', () => {
    test('should disable all buttons when disabled prop is true', () => {
      render(<ActionButtons {...defaultProps} disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    test('should not call handlers when buttons are disabled', async () => {
      render(<ActionButtons {...defaultProps} disabled={true} />);
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(defaultProps.onAction).not.toHaveBeenCalled();
    });

    test('should apply disabled CSS class when disabled is true', () => {
      render(<ActionButtons {...defaultProps} disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('disabled');
      });
    });

    test('should show normal icons even when disabled', () => {
      render(<ActionButtons {...defaultProps} disabled={true} />);
      
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.getByTestId('code-icon')).toBeInTheDocument();
      expect(screen.getByTestId('lightbulb-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bug-icon')).toBeInTheDocument();
    });
  });

  describe('Combined States', () => {
    test('should prioritize loading state over disabled state', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
        expect(button).toHaveClass('loading');
      });
      
      expect(screen.getAllByTestId('loader-icon').length).toBeGreaterThan(0);
    });

    test('should handle transitions between states', () => {
      const { rerender } = render(<ActionButtons {...defaultProps} isLoading={false} disabled={false} />);
      
      // Initially enabled
      const generateButton = screen.getByText('Generate');
      expect(generateButton).not.toBeDisabled();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      
      // Switch to loading
      rerender(<ActionButtons {...defaultProps} isLoading={true} disabled={false} />);
      expect(generateButton).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      
      // Switch to disabled
      rerender(<ActionButtons {...defaultProps} isLoading={false} disabled={true} />);
      expect(generateButton).toBeDisabled();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      
      // Back to enabled
      rerender(<ActionButtons {...defaultProps} isLoading={false} disabled={false} />);
      expect(generateButton).not.toBeDisabled();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const generateButton = screen.getByText('Generate');
      const explainButton = screen.getByText('Explain');
      
      // Focus should start outside
      expect(document.activeElement).toBe(document.body);
      
      // Tab to first button
      await user.tab();
      expect(document.activeElement).toBe(generateButton);
      
      // Tab to next button
      await user.tab();
      expect(document.activeElement).toBe(explainButton);
    });

    test('should activate buttons with Enter key', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const generateButton = screen.getByText('Generate');
      generateButton.focus();
      
      await user.keyboard('{Enter}');
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('generate');
    });

    test('should activate buttons with Space key', async () => {
      render(<ActionButtons {...defaultProps} />);
      
      const explainButton = screen.getByText('Explain');
      explainButton.focus();
      
      await user.keyboard(' ');
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('explain');
    });

    test('should not activate disabled buttons with keyboard', async () => {
      render(<ActionButtons {...defaultProps} disabled={true} />);
      
      const generateButton = screen.getByText('Generate');
      generateButton.focus();
      
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      
      expect(defaultProps.onAction).not.toHaveBeenCalled();
    });
  });

  describe('Tooltip and Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<ActionButtons {...defaultProps} />);
      
      const generateButton = screen.getByText('Generate').closest('button');
      const explainButton = screen.getByText('Explain').closest('button');
      const improveButton = screen.getByText('Improve').closest('button');
      const debugButton = screen.getByText('Debug').closest('button');
      
      expect(generateButton).toHaveAttribute('aria-label', expect.stringContaining('Generate'));
      expect(explainButton).toHaveAttribute('aria-label', expect.stringContaining('Explain'));
      expect(improveButton).toHaveAttribute('aria-label', expect.stringContaining('Improve'));
      expect(debugButton).toHaveAttribute('aria-label', expect.stringContaining('Debug'));
    });

    test('should have descriptive titles for tooltips', () => {
      render(<ActionButtons {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
        expect(button.getAttribute('title')).toBeTruthy();
      });
    });

    test('should indicate loading state in ARIA attributes', () => {
      render(<ActionButtons {...defaultProps} isLoading={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  describe('Responsive Design', () => {
    test('should maintain layout on smaller screens', () => {
      // Mock viewport for responsive testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<ActionButtons {...defaultProps} />);
      
      const container = screen.getByRole('toolbar');
      expect(container).toHaveClass('action-buttons');
      
      // All buttons should still be visible
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Explain')).toBeInTheDocument();
      expect(screen.getByText('Improve')).toBeInTheDocument();
      expect(screen.getByText('Debug')).toBeInTheDocument();
    });

    test('should handle button text overflow gracefully', () => {
      render(<ActionButtons {...defaultProps} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button);
        expect(computedStyle.textOverflow).not.toBe('clip');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing handlers gracefully', () => {
      const incompleteProps = {
        ...defaultProps,
        onGenerate: undefined as any,
        onExplain: undefined as any
      };
      
      expect(() => {
        render(<ActionButtons {...incompleteProps} />);
      }).not.toThrow();
    });

    test('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<ActionButtons {...defaultProps} onAction={errorHandler} />);
      
      const generateButton = screen.getByText('Generate');
      
      // Should not crash the component
      expect(() => {
        fireEvent.click(generateButton);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('should not recreate handlers on every render', () => {
      const { rerender } = render(<ActionButtons {...defaultProps} />);
      
      const initialButton = screen.getByText('Generate');
      
      rerender(<ActionButtons {...defaultProps} />);
      
      const rerenderedButton = screen.getByText('Generate');
      
      // Button should be the same element
      expect(rerenderedButton).toBe(initialButton);
    });

    test('should handle rapid state changes efficiently', () => {
      const { rerender } = render(<ActionButtons {...defaultProps} isLoading={false} />);
      
      // Rapidly toggle loading state
      for (let i = 0; i < 10; i++) {
        rerender(<ActionButtons {...defaultProps} isLoading={i % 2 === 0} />);
      }
      
      // Should not crash or cause memory leaks
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    test('should work with form submission', async () => {
      const handleSubmit = jest.fn(e => e.preventDefault());
      
      render(
        <form onSubmit={handleSubmit}>
          <ActionButtons {...defaultProps} />
        </form>
      );
      
      const generateButton = screen.getByText('Generate');
      await user.click(generateButton);
      
      expect(defaultProps.onAction).toHaveBeenCalledTimes(1);
      expect(defaultProps.onAction).toHaveBeenCalledWith('generate');
      expect(handleSubmit).not.toHaveBeenCalled(); // Should not submit form
    });

    test('should work within different container contexts', () => {
      render(
        <div data-testid="custom-container">
          <ActionButtons {...defaultProps} />
        </div>
      );
      
      const container = screen.getByTestId('custom-container');
      const actionButtons = container.querySelector('.action-buttons');
      
      expect(actionButtons).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });
  });
});