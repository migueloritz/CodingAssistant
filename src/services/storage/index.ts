export { FileSystemService } from './FileSystemService';
export { FileAnalysisService, fileAnalysisService } from './FileAnalysisService';
export * from '../../types/storage';

// Export singleton instances
import { FileSystemService } from './FileSystemService';
export const fileSystemService = FileSystemService.getInstance();