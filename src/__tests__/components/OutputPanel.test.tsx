import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OutputPanel } from '../../components/OutputPanel/OutputPanel';
import { OutputResult } from '../../types';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Terminal: ({ size, className, ...props }: any) => (
    <div data-testid="terminal-icon" data-size={size} className={className} {...props} />
  ),
  CheckCircle: ({ size, className, ...props }: any) => (
    <div data-testid="check-circle-icon" data-size={size} className={className} {...props} />
  ),
  AlertCircle: ({ size, className, ...props }: any) => (
    <div data-testid="alert-circle-icon" data-size={size} className={className} {...props} />
  ),
  Info: ({ size, className, ...props }: any) => (
    <div data-testid="info-icon" data-size={size} className={className} {...props} />
  ),
  Trash2: ({ size, ...props }: any) => (
    <div data-testid="trash2-icon" data-size={size} {...props} />
  ),
  Copy: ({ size, ...props }: any) => (
    <div data-testid="copy-icon" data-size={size} {...props} />
  ),
  ChevronDown: ({ size, ...props }: any) => (
    <div data-testid="chevron-down-icon" data-size={size} {...props} />
  ),
  ChevronRight: ({ size, ...props }: any) => (
    <div data-testid="chevron-right-icon" data-size={size} {...props} />
  ),
  Clock: ({ size, ...props }: any) => (
    <div data-testid="clock-icon" data-size={size} {...props} />
  ),
}));

// Clipboard API is mocked in setup.ts

describe('OutputPanel Component', () => {
  const mockOutputs: OutputResult[] = [
    {
      id: '1',
      type: 'execution',
      content: 'Hello, World!',
      timestamp: new Date('2023-01-01T12:00:00Z'),
      status: 'success',
      language: 'python',
    },
    {
      id: '2',
      type: 'analysis',
      content: 'Code analysis completed successfully',
      timestamp: new Date('2023-01-01T12:01:00Z'),
      status: 'success',
    },
    {
      id: '3',
      type: 'explanation',
      content: 'This function calculates the factorial',
      timestamp: new Date('2023-01-01T12:02:00Z'),
      status: 'error',
      language: 'javascript',
    },
    {
      id: '4',
      type: 'improvement',
      content: 'Consider using list comprehension',
      timestamp: new Date('2023-01-01T12:03:00Z'),
      status: 'warning',
      language: 'python',
    },
  ];

  const defaultProps = {
    outputs: mockOutputs,
    onClear: jest.fn(),
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
    test('should render output panel with header', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('Output')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
    });

    test('should render all tab filters with correct counts', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Errors (1)')).toBeInTheDocument();
      expect(screen.getByText('Warnings (1)')).toBeInTheDocument();
      expect(screen.getByText('Success (2)')).toBeInTheDocument();
    });

    test('should render clear button', () => {
      render(<OutputPanel {...defaultProps} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      expect(clearButton).toBeInTheDocument();
      expect(screen.getByTestId('trash2-icon')).toBeInTheDocument();
    });

    test('should disable clear button when no outputs', () => {
      render(<OutputPanel {...defaultProps} outputs={[]} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      expect(clearButton).toBeDisabled();
    });

    test('should render all output items by default', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      expect(screen.getByText('Code analysis completed successfully')).toBeInTheDocument();
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();
      expect(screen.getByText('Consider using list comprehension')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('should show empty state when no outputs', () => {
      render(<OutputPanel {...defaultProps} outputs={[]} />);

      expect(screen.getByText('No output yet')).toBeInTheDocument();
      expect(screen.getByText('Results will appear here when you run actions')).toBeInTheDocument();
      expect(screen.getByTestId('terminal-icon')).toBeInTheDocument();
    });

    test('should show empty state when filtered outputs are empty', async () => {
      render(<OutputPanel {...defaultProps} />);

      // Switch to errors tab (only 1 error)
      const errorsTab = screen.getByText('Errors (1)');
      await user.click(errorsTab);

      // Should show the error
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();

      // Create a case with no errors by rendering with no error outputs
      const noErrorOutputs = mockOutputs.filter(o => o.status !== 'error');
      const { rerender } = render(<OutputPanel outputs={noErrorOutputs} onClear={jest.fn()} />);

      const errorsTabNew = screen.getByText('Errors (0)');
      await user.click(errorsTabNew);

      expect(screen.getByText('No output yet')).toBeInTheDocument();
    });
  });

  describe('Tab Filtering', () => {
    test('should start with "All" tab active', () => {
      render(<OutputPanel {...defaultProps} />);

      const allTab = screen.getByText('All (4)');
      expect(allTab).toHaveClass('active');
    });

    test('should filter to errors only when errors tab is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const errorsTab = screen.getByText('Errors (1)');
      await user.click(errorsTab);

      expect(errorsTab).toHaveClass('active');
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();
      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();
      expect(screen.queryByText('Code analysis completed successfully')).not.toBeInTheDocument();
      expect(screen.queryByText('Consider using list comprehension')).not.toBeInTheDocument();
    });

    test('should filter to warnings only when warnings tab is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const warningsTab = screen.getByText('Warnings (1)');
      await user.click(warningsTab);

      expect(warningsTab).toHaveClass('active');
      expect(screen.getByText('Consider using list comprehension')).toBeInTheDocument();
      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();
      expect(screen.queryByText('Code analysis completed successfully')).not.toBeInTheDocument();
      expect(screen.queryByText('This function calculates the factorial')).not.toBeInTheDocument();
    });

    test('should filter to success only when success tab is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const successTab = screen.getByText('Success (2)');
      await user.click(successTab);

      expect(successTab).toHaveClass('active');
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      expect(screen.getByText('Code analysis completed successfully')).toBeInTheDocument();
      expect(screen.queryByText('This function calculates the factorial')).not.toBeInTheDocument();
      expect(screen.queryByText('Consider using list comprehension')).not.toBeInTheDocument();
    });

    test('should return to all outputs when all tab is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      // Switch to errors first
      const errorsTab = screen.getByText('Errors (1)');
      await user.click(errorsTab);

      // Then back to all
      const allTab = screen.getByText('All (4)');
      await user.click(allTab);

      expect(allTab).toHaveClass('active');
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      expect(screen.getByText('Code analysis completed successfully')).toBeInTheDocument();
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();
      expect(screen.getByText('Consider using list comprehension')).toBeInTheDocument();
    });

    test('should update tab counts when outputs change', () => {
      const { rerender } = render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('All (4)')).toBeInTheDocument();
      expect(screen.getByText('Errors (1)')).toBeInTheDocument();

      // Add more error outputs
      const newOutputs = [
        ...mockOutputs,
        {
          id: '5',
          type: 'execution',
          content: 'Another error',
          timestamp: new Date(),
          status: 'error',
        } as OutputResult,
      ];

      rerender(<OutputPanel outputs={newOutputs} onClear={jest.fn()} />);

      expect(screen.getByText('All (5)')).toBeInTheDocument();
      expect(screen.getByText('Errors (2)')).toBeInTheDocument();
    });
  });

  describe('Output Items', () => {
    test('should display correct status icons', () => {
      render(<OutputPanel {...defaultProps} />);

      // Success icons
      const successIcons = screen.getAllByTestId('check-circle-icon');
      expect(successIcons).toHaveLength(2);
      successIcons.forEach(icon => {
        expect(icon).toHaveClass('status-icon', 'success');
      });

      // Error icon
      const errorIcon = screen.getByTestId('alert-circle-icon');
      expect(errorIcon).toHaveClass('status-icon', 'error');

      // Warning icon - there should be one alert-circle-icon with warning class
      const alertIcons = screen.getAllByTestId('alert-circle-icon');
      const warningIcon = alertIcons.find(icon => icon.classList.contains('warning'));
      expect(warningIcon).toHaveClass('status-icon', 'warning');
    });

    test('should display correct type labels', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('Execution')).toBeInTheDocument();
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.getByText('Explanation')).toBeInTheDocument();
      expect(screen.getByText('Improvement')).toBeInTheDocument();
    });

    test('should display language when available', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByText('PYTHON')).toBeInTheDocument();
      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
    });

    test('should display formatted timestamps', () => {
      render(<OutputPanel {...defaultProps} />);

      const timestamps = screen.getAllByTestId('clock-icon');
      expect(timestamps).toHaveLength(4);

      // Check that timestamps are displayed (exact format depends on locale)
      expect(screen.getByText(/12:00:/)).toBeInTheDocument();
      expect(screen.getByText(/12:01:/)).toBeInTheDocument();
      expect(screen.getByText(/12:02:/)).toBeInTheDocument();
      expect(screen.getByText(/12:03:/)).toBeInTheDocument();
    });

    test('should have copy buttons for each output', () => {
      render(<OutputPanel {...defaultProps} />);

      const copyButtons = screen.getAllByTestId('copy-icon');
      expect(copyButtons).toHaveLength(4);
    });

    test('should show output content by default (not collapsed)', () => {
      render(<OutputPanel {...defaultProps} />);

      // All content should be visible
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      expect(screen.getByText('Code analysis completed successfully')).toBeInTheDocument();
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();
      expect(screen.getByText('Consider using list comprehension')).toBeInTheDocument();

      // Should show ChevronDown icons (expanded state)
      const chevronDownIcons = screen.getAllByTestId('chevron-down-icon');
      expect(chevronDownIcons).toHaveLength(4);
    });
  });

  describe('Collapse/Expand Functionality', () => {
    test('should collapse output when collapse button is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const collapseButtons = screen.getAllByTestId('chevron-down-icon');
      const firstCollapseButton = collapseButtons[0].closest('button')!;

      await user.click(firstCollapseButton);

      // Content should be hidden
      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();

      // Should show ChevronRight icon (collapsed state)
      expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    });

    test('should expand output when expand button is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const collapseButtons = screen.getAllByTestId('chevron-down-icon');
      const firstCollapseButton = collapseButtons[0].closest('button')!;

      // First collapse
      await user.click(firstCollapseButton);
      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();

      // Then expand
      const expandButton = screen.getByTestId('chevron-right-icon').closest('button')!;
      await user.click(expandButton);

      // Content should be visible again
      expect(screen.getByText('Hello, World!')).toBeInTheDocument();
      
      // Should show ChevronDown icon again
      const chevronDownIcons = screen.getAllByTestId('chevron-down-icon');
      expect(chevronDownIcons).toHaveLength(4); // All are expanded again
    });

    test('should maintain collapse state independently for each output', async () => {
      render(<OutputPanel {...defaultProps} />);

      const collapseButtons = screen.getAllByTestId('chevron-down-icon');
      const firstCollapseButton = collapseButtons[0].closest('button')!;
      const secondCollapseButton = collapseButtons[1].closest('button')!;

      // Collapse first output
      await user.click(firstCollapseButton);
      expect(screen.queryByText('Hello, World!')).not.toBeInTheDocument();
      expect(screen.getByText('Code analysis completed successfully')).toBeInTheDocument();

      // Collapse second output
      await user.click(secondCollapseButton);
      expect(screen.queryByText('Code analysis completed successfully')).not.toBeInTheDocument();

      // Other outputs should still be visible
      expect(screen.getByText('This function calculates the factorial')).toBeInTheDocument();
      expect(screen.getByText('Consider using list comprehension')).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    test('should copy output content to clipboard when copy button is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const copyButtons = screen.getAllByTestId('copy-icon');
      const firstCopyButton = copyButtons[0].closest('button')!;

      await user.click(firstCopyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, World!');
    });

    test('should handle clipboard copy errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock clipboard to reject
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Clipboard error'));

      render(<OutputPanel {...defaultProps} />);

      const copyButtons = screen.getAllByTestId('copy-icon');
      const firstCopyButton = copyButtons[0].closest('button')!;

      await user.click(firstCopyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, World!');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    test('should copy different content for different outputs', async () => {
      render(<OutputPanel {...defaultProps} />);

      const copyButtons = screen.getAllByTestId('copy-icon');

      // Copy first output
      await user.click(copyButtons[0].closest('button')!);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, World!');

      // Copy second output
      await user.click(copyButtons[1].closest('button')!);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Code analysis completed successfully');

      // Copy third output
      await user.click(copyButtons[2].closest('button')!);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This function calculates the factorial');
    });
  });

  describe('Clear Functionality', () => {
    test('should call onClear when clear button is clicked', async () => {
      render(<OutputPanel {...defaultProps} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      await user.click(clearButton);

      expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
    });

    test('should not call onClear when button is disabled', async () => {
      render(<OutputPanel {...defaultProps} outputs={[]} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      expect(clearButton).toBeDisabled();

      await user.click(clearButton);

      expect(defaultProps.onClear).not.toHaveBeenCalled();
    });
  });

  describe('CSS Classes and Styling', () => {
    test('should apply correct CSS classes to output items based on status', () => {
      render(<OutputPanel {...defaultProps} />);

      const outputItems = document.querySelectorAll('.output-item');
      
      expect(outputItems[0]).toHaveClass('output-item', 'success');
      expect(outputItems[1]).toHaveClass('output-item', 'success');
      expect(outputItems[2]).toHaveClass('output-item', 'error');
      expect(outputItems[3]).toHaveClass('output-item', 'warning');
    });

    test('should apply correct classes to tabs', async () => {
      render(<OutputPanel {...defaultProps} />);

      const allTab = screen.getByText('All (4)');
      const errorsTab = screen.getByText('Errors (1)');

      expect(allTab).toHaveClass('tab', 'active');
      expect(errorsTab).toHaveClass('tab');
      expect(errorsTab).not.toHaveClass('active');

      await user.click(errorsTab);

      expect(allTab).toHaveClass('tab');
      expect(allTab).not.toHaveClass('active');
      expect(errorsTab).toHaveClass('tab', 'active');
    });
  });

  describe('Accessibility', () => {
    test('should have proper button titles and labels', () => {
      render(<OutputPanel {...defaultProps} />);

      expect(screen.getByTitle('Clear all outputs')).toBeInTheDocument();
      
      const copyButtons = screen.getAllByTitle('Copy to clipboard');
      expect(copyButtons).toHaveLength(4);
    });

    test('should be keyboard accessible', async () => {
      render(<OutputPanel {...defaultProps} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      const allTab = screen.getByText('All (4)');

      // Should be focusable
      clearButton.focus();
      expect(document.activeElement).toBe(clearButton);

      allTab.focus();
      expect(document.activeElement).toBe(allTab);

      // Should be activatable with keyboard
      fireEvent.keyDown(clearButton, { key: 'Enter' });
      expect(defaultProps.onClear).toHaveBeenCalled();
    });

    test('should support tab navigation', async () => {
      render(<OutputPanel {...defaultProps} />);

      const clearButton = screen.getByTitle('Clear all outputs');
      const copyButtons = screen.getAllByTitle('Copy to clipboard');

      // All interactive elements should be focusable
      clearButton.focus();
      expect(document.activeElement).toBe(clearButton);

      copyButtons[0].focus();
      expect(document.activeElement).toBe(copyButtons[0]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle outputs with missing optional fields', () => {
      const minimalOutputs: OutputResult[] = [
        {
          id: '1',
          type: 'execution',
          content: 'Minimal output',
          timestamp: new Date(),
          status: 'success',
          // No language field
        },
      ];

      expect(() => {
        render(<OutputPanel outputs={minimalOutputs} onClear={jest.fn()} />);
      }).not.toThrow();

      expect(screen.getByText('Minimal output')).toBeInTheDocument();
    });

    test('should handle empty content gracefully', () => {
      const emptyContentOutputs: OutputResult[] = [
        {
          id: '1',
          type: 'execution',
          content: '',
          timestamp: new Date(),
          status: 'success',
        },
      ];

      render(<OutputPanel outputs={emptyContentOutputs} onClear={jest.fn()} />);

      // Should render without crashing
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    test('should handle very long content', () => {
      const longContent = 'x'.repeat(10000);
      const longOutputs: OutputResult[] = [
        {
          id: '1',
          type: 'execution',
          content: longContent,
          timestamp: new Date(),
          status: 'success',
        },
      ];

      render(<OutputPanel outputs={longOutputs} onClear={jest.fn()} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    test('should handle invalid timestamp gracefully', () => {
      const invalidTimestampOutputs: OutputResult[] = [
        {
          id: '1',
          type: 'execution',
          content: 'Test content',
          timestamp: new Date('invalid-date'),
          status: 'success',
        },
      ];

      expect(() => {
        render(<OutputPanel outputs={invalidTimestampOutputs} onClear={jest.fn()} />);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should handle large numbers of outputs efficiently', () => {
      const manyOutputs: OutputResult[] = Array.from({ length: 100 }, (_, i) => ({
        id: `output-${i}`,
        type: 'execution',
        content: `Output ${i}`,
        timestamp: new Date(),
        status: i % 3 === 0 ? 'error' : i % 2 === 0 ? 'warning' : 'success',
      })) as OutputResult[];

      const startTime = performance.now();
      render(<OutputPanel outputs={manyOutputs} onClear={jest.fn()} />);
      const endTime = performance.now();

      // Should render quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);

      expect(screen.getByText('All (100)')).toBeInTheDocument();
    });

    test('should not recreate collapsed state unnecessarily', () => {
      const { rerender } = render(<OutputPanel {...defaultProps} />);

      const initialItems = document.querySelectorAll('.output-item');
      const initialCount = initialItems.length;

      rerender(<OutputPanel {...defaultProps} />);

      const rerenderedItems = document.querySelectorAll('.output-item');
      expect(rerenderedItems).toHaveLength(initialCount);
    });

    test('should handle rapid tab switching efficiently', async () => {
      render(<OutputPanel {...defaultProps} />);

      const startTime = performance.now();

      const tabs = [
        screen.getByText('All (4)'),
        screen.getByText('Errors (1)'),
        screen.getByText('Warnings (1)'),
        screen.getByText('Success (2)'),
      ];

      // Rapidly switch between tabs
      for (let i = 0; i < 20; i++) {
        const tab = tabs[i % tabs.length];
        await user.click(tab);
      }

      const endTime = performance.now();

      // Should complete quickly (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Type Label Mapping', () => {
    test('should handle unknown output types gracefully', () => {
      const unknownTypeOutput: OutputResult[] = [
        {
          id: '1',
          type: 'unknown' as any,
          content: 'Unknown type content',
          timestamp: new Date(),
          status: 'success',
        },
      ];

      render(<OutputPanel outputs={unknownTypeOutput} onClear={jest.fn()} />);

      expect(screen.getByText('Output')).toBeInTheDocument(); // Default label
      expect(screen.getByText('Unknown type content')).toBeInTheDocument();
    });
  });
});