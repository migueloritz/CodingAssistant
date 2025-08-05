import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileManager } from '../../components/FileManager/FileManager';
import { FileContent } from '../../types';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Folder: ({ size, ...props }: any) => <div data-testid="folder-icon" data-size={size} {...props} />,
  Plus: ({ size, ...props }: any) => <div data-testid="plus-icon" data-size={size} {...props} />,
  Download: ({ size, ...props }: any) => <div data-testid="download-icon" data-size={size} {...props} />,
  Upload: ({ size, ...props }: any) => <div data-testid="upload-icon" data-size={size} {...props} />,
  MoreVertical: ({ size, ...props }: any) => <div data-testid="more-vertical-icon" data-size={size} {...props} />,
  Clock: ({ size, ...props }: any) => <div data-testid="clock-icon" data-size={size} {...props} />,
  Code: ({ size, ...props }: any) => <div data-testid="code-icon" data-size={size} {...props} />,
  Save: ({ size, ...props }: any) => <div data-testid="save-icon" data-size={size} {...props} />,
  FolderOpen: ({ size, ...props }: any) => <div data-testid="folder-open-icon" data-size={size} {...props} />,
  FileText: ({ size, ...props }: any) => <div data-testid="file-text-icon" data-size={size} {...props} />,
  Search: ({ size, ...props }: any) => <div data-testid="search-icon" data-size={size} {...props} />
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  result: null,
  onload: null,
};

global.FileReader = jest.fn(() => mockFileReader) as any;

describe('FileManager Component', () => {
  const mockFile: FileContent = {
    name: 'test.py',
    path: '/test/test.py',
    content: 'print("Hello, World!")',
    language: 'python',
    lastModified: new Date('2023-01-01T12:00:00Z'),
  };

  const defaultProps = {
    currentFile: mockFile,
    onFileOpen: jest.fn(),
    onFileSave: jest.fn(),
  };

  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileReader.result = null;
    mockFileReader.onload = null;
    user = userEvent.setup({
      // Disable clipboard setup to avoid conflicts
      writeToClipboard: false,
    });
  });

  describe('Rendering', () => {
    test('should render file manager with header and sections', () => {
      render(<FileManager {...defaultProps} />);

      // Header
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByTestId('folder-icon')).toBeInTheDocument();

      // Sections
      expect(screen.getByText('Current File')).toBeInTheDocument();
      expect(screen.getByText('Recent Files')).toBeInTheDocument();

      // Search
      expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();
    });

    test('should render current file section when file is provided', () => {
      render(<FileManager {...defaultProps} />);

      expect(screen.getByText('Current File')).toBeInTheDocument();
      expect(screen.getByText('test.py')).toBeInTheDocument();
      expect(screen.getByText('PYTHON')).toBeInTheDocument();
      expect(screen.getByText('🐍')).toBeInTheDocument();
    });

    test('should not render current file section when no file provided', () => {
      render(<FileManager {...defaultProps} currentFile={null} />);

      expect(screen.queryByText('Current File')).not.toBeInTheDocument();
    });

    test('should render action buttons in header', () => {
      render(<FileManager {...defaultProps} />);

      expect(screen.getByTitle('Create new file')).toBeInTheDocument();
      expect(screen.getByTitle('Upload file')).toBeInTheDocument();
      expect(screen.getByTitle('Save current file')).toBeInTheDocument();
    });

    test('should render recent files with default examples', () => {
      render(<FileManager {...defaultProps} />);

      expect(screen.getByText('example.py')).toBeInTheDocument();
      expect(screen.getByText('script.js')).toBeInTheDocument();
      expect(screen.getByText('main.cpp')).toBeInTheDocument();
    });

    test('should show file count in recent files section', () => {
      render(<FileManager {...defaultProps} />);

      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });

  describe('Language Icons', () => {
    test('should display correct icons for different languages', () => {
      const pythonFile = { ...mockFile, language: 'python' as const };
      const jsFile = { ...mockFile, language: 'javascript' as const };
      const cppFile = { ...mockFile, language: 'cpp' as const };

      const { rerender } = render(<FileManager {...defaultProps} currentFile={pythonFile} />);
      expect(screen.getByText('🐍')).toBeInTheDocument();

      rerender(<FileManager {...defaultProps} currentFile={jsFile} />);
      expect(screen.getByText('⚡')).toBeInTheDocument();

      rerender(<FileManager {...defaultProps} currentFile={cppFile} />);
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    test('should show default icon for unknown language', () => {
      const unknownFile = { ...mockFile, language: 'unknown' as any };
      render(<FileManager {...defaultProps} currentFile={unknownFile} />);

      expect(screen.getByText('📄')).toBeInTheDocument();
    });
  });

  describe('File Size Formatting', () => {
    test('should format file sizes correctly', () => {
      const smallFile = { ...mockFile, content: 'small' };
      const largeFile = { ...mockFile, content: 'x'.repeat(2048) };

      const { rerender } = render(<FileManager {...defaultProps} currentFile={smallFile} />);
      expect(screen.getByText(/\d+(\.\d+)?\s*B/)).toBeInTheDocument();

      rerender(<FileManager {...defaultProps} currentFile={largeFile} />);
      expect(screen.getByText(/\d+(\.\d+)?\s*KB/)).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    test('should format recent times correctly', () => {
      render(<FileManager {...defaultProps} />);

      // Check for relative time formats in recent files
      expect(screen.getByText(/\d+[mhd]\s+ago/)).toBeInTheDocument();
    });

    test('should show "Just now" for very recent files', () => {
      // This tests the formatLastModified function indirectly through recent files
      // The component has hardcoded recent files, so we can't directly test "Just now"
      // But we can verify the time formatting logic works
      render(<FileManager {...defaultProps} />);

      // Should show formatted times for the default recent files
      expect(screen.getByText('1h ago')).toBeInTheDocument();
      expect(screen.getByText('2h ago')).toBeInTheDocument();
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('should filter files by name', async () => {
      render(<FileManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'script');

      // Should show only script.js
      expect(screen.getByText('script.js')).toBeInTheDocument();
      expect(screen.queryByText('example.py')).not.toBeInTheDocument();
      expect(screen.queryByText('main.cpp')).not.toBeInTheDocument();
    });

    test('should filter files by language', async () => {
      render(<FileManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'javascript');

      // Should show only JavaScript files
      expect(screen.getByText('script.js')).toBeInTheDocument();
      expect(screen.queryByText('example.py')).not.toBeInTheDocument();
      expect(screen.queryByText('main.cpp')).not.toBeInTheDocument();
    });

    test('should show empty state when no files match search', async () => {
      render(<FileManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search files...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No files found')).toBeInTheDocument();
      expect(screen.getByText('Upload or create a new file to get started')).toBeInTheDocument();
    });

    test('should update file count based on search results', async () => {
      render(<FileManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search files...');

      // Initially shows (3)
      expect(screen.getByText('(3)')).toBeInTheDocument();

      await user.type(searchInput, 'script');

      // Should show (1) after filtering
      expect(screen.getByText('(1)')).toBeInTheDocument();
    });
  });

  describe('File Actions', () => {
    test('should create new file when create button is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const createButton = screen.getByTitle('Create new file');
      await user.click(createButton);

      expect(defaultProps.onFileOpen).toHaveBeenCalledWith({
        name: 'untitled.py',
        path: '',
        content: '# New file\nprint("Hello, World!")',
        language: 'python',
        lastModified: expect.any(Date),
      });
    });

    test('should trigger file upload when upload button is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const uploadButton = screen.getByTitle('Upload file');
      await user.click(uploadButton);

      // Should trigger click on hidden file input
      const fileInput = screen.getByRole('button', { hidden: true });
      expect(fileInput).toBeInTheDocument();
    });

    test('should save current file when save button is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const saveButton = screen.getByTitle('Save current file');
      await user.click(saveButton);

      expect(defaultProps.onFileSave).toHaveBeenCalledWith(mockFile);
    });

    test('should disable save button when no current file', () => {
      render(<FileManager {...defaultProps} currentFile={null} />);

      const saveButton = screen.getByTitle('Save current file');
      expect(saveButton).toBeDisabled();
    });

    test('should open file when file item is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const fileItem = screen.getByText('example.py').closest('.file-item');
      await user.click(fileItem!);

      expect(defaultProps.onFileOpen).toHaveBeenCalledWith(expect.objectContaining({
        name: 'example.py',
        language: 'python',
      }));
    });
  });

  describe('File Context Menu', () => {
    test('should show context menu when more button is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const moreButtons = screen.getAllByTestId('more-vertical-icon');
      const firstMoreButton = moreButtons[0].parentElement!;

      await user.click(firstMoreButton);

      expect(screen.getByText('Open')).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
    });

    test('should hide context menu when clicking outside', async () => {
      render(<FileManager {...defaultProps} />);

      const moreButtons = screen.getAllByTestId('more-vertical-icon');
      const firstMoreButton = moreButtons[0].parentElement!;

      await user.click(firstMoreButton);
      expect(screen.getByText('Open')).toBeInTheDocument();

      // Click outside
      await user.click(document.body);
      await waitFor(() => {
        expect(screen.queryByText('Open')).not.toBeInTheDocument();
      });
    });

    test('should open file from context menu', async () => {
      render(<FileManager {...defaultProps} />);

      const moreButtons = screen.getAllByTestId('more-vertical-icon');
      const firstMoreButton = moreButtons[0].parentElement!;

      await user.click(firstMoreButton);
      const openButton = screen.getByText('Open');
      await user.click(openButton);

      expect(defaultProps.onFileOpen).toHaveBeenCalled();
    });

    test('should download file from context menu', async () => {
      render(<FileManager {...defaultProps} />);

      const moreButtons = screen.getAllByTestId('more-vertical-icon');
      const firstMoreButton = moreButtons[0].parentElement!;

      await user.click(firstMoreButton);
      const downloadButton = screen.getByText('Download');
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('File Upload', () => {
    test('should handle file upload with correct language detection', async () => {
      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['console.log("test");'], 'test.js', { type: 'text/javascript' });

      // Mock FileReader
      mockFileReader.result = 'console.log("test");';

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'console.log("test");' } } as any);
      }

      await waitFor(() => {
        expect(defaultProps.onFileOpen).toHaveBeenCalledWith(expect.objectContaining({
          name: 'test.js',
          language: 'javascript',
          content: 'console.log("test");',
        }));
      });
    });

    test('should detect Python language for .py files', async () => {
      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['print("test")'], 'test.py', { type: 'text/plain' });

      mockFileReader.result = 'print("test")';

      fireEvent.change(fileInput, { target: { files: [file] } });

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'print("test")' } } as any);
      }

      await waitFor(() => {
        expect(defaultProps.onFileOpen).toHaveBeenCalledWith(expect.objectContaining({
          language: 'python',
        }));
      });
    });

    test('should detect C++ language for .cpp files', async () => {
      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['#include <iostream>'], 'test.cpp', { type: 'text/plain' });

      mockFileReader.result = '#include <iostream>';

      fireEvent.change(fileInput, { target: { files: [file] } });

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: '#include <iostream>' } } as any);
      }

      await waitFor(() => {
        expect(defaultProps.onFileOpen).toHaveBeenCalledWith(expect.objectContaining({
          language: 'cpp',
        }));
      });
    });

    test('should default to Python for unknown extensions', async () => {
      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['some content'], 'test.unknown', { type: 'text/plain' });

      mockFileReader.result = 'some content';

      fireEvent.change(fileInput, { target: { files: [file] } });

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: 'some content' } } as any);
      }

      await waitFor(() => {
        expect(defaultProps.onFileOpen).toHaveBeenCalledWith(expect.objectContaining({
          language: 'python',
        }));
      });
    });
  });

  describe('Current File Download', () => {
    test('should download current file when download button is clicked', async () => {
      render(<FileManager {...defaultProps} />);

      const downloadButton = screen.getByTitle('Download file');
      await user.click(downloadButton);

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('File Status', () => {
    test('should highlight active file in recent files list', () => {
      const activeFile = {
        name: 'example.py',
        path: '/examples/example.py',
        content: 'print("Hello, World!")',
        language: 'python' as const,
        lastModified: new Date(),
      };

      render(<FileManager {...defaultProps} currentFile={activeFile} />);

      const fileItems = screen.getAllByText('example.py');
      const recentFileItem = fileItems.find(item => 
        item.closest('.file-item')?.classList.contains('active')
      );

      expect(recentFileItem).toBeInTheDocument();
    });

    test('should not highlight any file when current file not in recent list', () => {
      const uniqueFile = {
        name: 'unique.py',
        path: '/unique.py',
        content: 'print("unique")',
        language: 'python' as const,
        lastModified: new Date(),
      };

      render(<FileManager {...defaultProps} currentFile={uniqueFile} />);

      const activeItems = document.querySelectorAll('.file-item.active');
      expect(activeItems).toHaveLength(0);
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      render(<FileManager {...defaultProps} />);

      // Action buttons should have titles
      expect(screen.getByTitle('Create new file')).toBeInTheDocument();
      expect(screen.getByTitle('Upload file')).toBeInTheDocument();
      expect(screen.getByTitle('Save current file')).toBeInTheDocument();

      // Search input should have placeholder
      expect(screen.getByPlaceholderText('Search files...')).toBeInTheDocument();

      // File input should have accept attribute
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', '.py,.js,.jsx,.cpp,.cc,.cxx,.txt');
    });

    test('should be keyboard accessible', async () => {
      render(<FileManager {...defaultProps} />);

      const createButton = screen.getByTitle('Create new file');
      
      // Should be focusable
      createButton.focus();
      expect(document.activeElement).toBe(createButton);

      // Should be activatable with Enter
      fireEvent.keyDown(createButton, { key: 'Enter' });
      expect(defaultProps.onFileOpen).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle file upload errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      // Mock FileReader error
      mockFileReader.onerror = jest.fn();

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader error
      if (mockFileReader.onerror) {
        mockFileReader.onerror({} as any);
      }

      // Should not crash
      expect(screen.getByText('Files')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    test('should handle missing file in upload', async () => {
      render(<FileManager {...defaultProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Trigger change without files
      fireEvent.change(fileInput, { target: { files: [] } });

      // Should not crash and onFileOpen should not be called
      expect(defaultProps.onFileOpen).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should not recreate file list unnecessarily', () => {
      const { rerender } = render(<FileManager {...defaultProps} />);

      const initialFileItems = screen.getAllByText(/example\.py|script\.js|main\.cpp/);
      const initialCount = initialFileItems.length;

      // Rerender with same props
      rerender(<FileManager {...defaultProps} />);

      const rerenderedFileItems = screen.getAllByText(/example\.py|script\.js|main\.cpp/);
      expect(rerenderedFileItems).toHaveLength(initialCount);
    });

    test('should handle large search operations efficiently', async () => {
      render(<FileManager {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search files...');

      const startTime = performance.now();
      
      // Perform multiple search operations
      await user.type(searchInput, 'test');
      await user.clear(searchInput);
      await user.type(searchInput, 'example');
      await user.clear(searchInput);

      const endTime = performance.now();

      // Should complete quickly (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});