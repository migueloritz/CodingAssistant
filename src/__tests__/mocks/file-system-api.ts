// Mock File System Access API
export class MockFileSystemFileHandle {
  name: string;
  kind: string;

  constructor(name: string) {
    this.name = name;
    this.kind = 'file';
  }

  async getFile() {
    return new MockFile(this.name, 'test content', { type: 'text/plain' });
  }

  async createWritable() {
    return new MockFileSystemWritableFileStream();
  }
}

export class MockFileSystemWritableFileStream {
  private content: string = '';

  async write(data: string) {
    this.content += data;
  }

  async close() {
    // Mock close
  }

  getContent() {
    return this.content;
  }
}

export class MockFile extends File {
  constructor(name: string, content: string, options: FilePropertyBag = {}) {
    super([content], name, options);
  }

  async text() {
    return 'test content';
  }

  get lastModified() {
    return Date.now();
  }

  get size() {
    return 100;
  }
}

// Mock showOpenFilePicker
export const mockShowOpenFilePicker = jest.fn().mockImplementation(async (options?: any) => {
  const fileHandle = new MockFileSystemFileHandle('test.py');
  return [fileHandle];
});

// Mock showSaveFilePicker
export const mockShowSaveFilePicker = jest.fn().mockImplementation(async (options?: any) => {
  return new MockFileSystemFileHandle('test.py');
});

// Mock showDirectoryPicker
export const mockShowDirectoryPicker = jest.fn().mockImplementation(async (options?: any) => {
  return {
    name: 'test-directory',
    kind: 'directory',
    entries: async function* () {
      yield ['test.py', new MockFileSystemFileHandle('test.py')];
    },
  };
});

// Setup global mocks
Object.defineProperty(global, 'showOpenFilePicker', {
  value: mockShowOpenFilePicker,
  writable: true,
});

Object.defineProperty(global, 'showSaveFilePicker', {
  value: mockShowSaveFilePicker,
  writable: true,
});

Object.defineProperty(global, 'showDirectoryPicker', {
  value: mockShowDirectoryPicker,
  writable: true,
});

export default {
  MockFileSystemFileHandle,
  MockFileSystemWritableFileStream,
  MockFile,
  mockShowOpenFilePicker,
  mockShowSaveFilePicker,
  mockShowDirectoryPicker,
};