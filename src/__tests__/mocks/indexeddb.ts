// Mock IndexedDB implementation
export class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: string[];

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = [];
  }

  createObjectStore(name: string, options?: any) {
    this.objectStoreNames.push(name);
    return new MockIDBObjectStore(name);
  }

  transaction(storeNames: string | string[], mode?: string) {
    return new MockIDBTransaction(Array.isArray(storeNames) ? storeNames : [storeNames], mode);
  }

  close() {
    // Mock close
  }
}

export class MockIDBObjectStore {
  name: string;
  keyPath: string | null;
  indexNames: string[];

  constructor(name: string) {
    this.name = name;
    this.keyPath = null;
    this.indexNames = [];
  }

  createIndex(name: string, keyPath: string, options?: any) {
    this.indexNames.push(name);
    return new MockIDBIndex(name, keyPath);
  }

  index(name: string) {
    return new MockIDBIndex(name, '');
  }

  add(value: any, key?: any) {
    return new MockIDBRequest(value);
  }

  put(value: any, key?: any) {
    return new MockIDBRequest(value);
  }

  get(key: any) {
    return new MockIDBRequest(null);
  }

  getAll(query?: any) {
    return new MockIDBRequest([]);
  }

  delete(key: any) {
    return new MockIDBRequest(undefined);
  }

  clear() {
    return new MockIDBRequest(undefined);
  }

  count() {
    return new MockIDBRequest(0);
  }
}

export class MockIDBIndex {
  name: string;
  keyPath: string;
  unique: boolean;

  constructor(name: string, keyPath: string) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = false;
  }

  get(key: any) {
    return new MockIDBRequest(null);
  }

  getAll(query?: any) {
    return new MockIDBRequest([]);
  }

  count() {
    return new MockIDBRequest(0);
  }
}

export class MockIDBTransaction {
  objectStoreNames: string[];
  mode: string;
  db: MockIDBDatabase | null;

  constructor(storeNames: string[], mode = 'readonly') {
    this.objectStoreNames = storeNames;
    this.mode = mode;
    this.db = null;
  }

  objectStore(name: string) {
    return new MockIDBObjectStore(name);
  }

  abort() {
    // Mock abort
  }
}

export class MockIDBRequest {
  result: any;
  error: Error | null;
  source: any;
  transaction: MockIDBTransaction | null;
  readyState: string;
  onsuccess: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;

  constructor(result: any) {
    this.result = result;
    this.error = null;
    this.source = null;
    this.transaction = null;
    this.readyState = 'done';
    this.onsuccess = null;
    this.onerror = null;

    // Simulate async behavior
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
}

export class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((event: any) => void) | null;
  onblocked: ((event: any) => void) | null;

  constructor(result: any) {
    super(result);
    this.onupgradeneeded = null;
    this.onblocked = null;
  }
}

// Mock the global indexedDB
export const mockIndexedDB = {
  open: jest.fn().mockImplementation((name: string, version?: number) => {
    const db = new MockIDBDatabase(name, version || 1);
    const request = new MockIDBOpenDBRequest(db);
    
    // Simulate upgrade needed
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request });
      }
    }, 0);
    
    return request;
  }),
  
  deleteDatabase: jest.fn().mockImplementation((name: string) => {
    return new MockIDBRequest(undefined);
  }),
  
  databases: jest.fn().mockResolvedValue([]),
};

// Replace global indexedDB in tests
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

export default mockIndexedDB;