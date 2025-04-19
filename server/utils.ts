import * as path from 'path';
import { InsertMigrationFile } from '@shared/schema';

/**
 * Determines the file type from a file name
 * @param fileName The name of the file
 * @returns The file extension or 'unknown' if not found
 */
export function getFileType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  
  if (!extension) {
    return 'unknown';
  }
  
  // Return extension without the dot
  return extension.substring(1);
}

/**
 * Returns the appropriate MIME type for the file extension
 * @param fileName The name of the file
 * @returns The MIME type or 'application/octet-stream' if not found
 */
export function getMimeType(fileName: string): string {
  const extension = getFileType(fileName);
  
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'htm': 'text/html',
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'css': 'text/css',
    'json': 'application/json',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'py': 'text/x-python',
    'rb': 'text/x-ruby',
    'java': 'text/x-java',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'cs': 'text/x-csharp',
    'go': 'text/x-go',
    'php': 'text/x-php',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    'rs': 'text/x-rust',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Enhances a migration file insert object with additional metadata
 * @param fileData The base file data object
 * @returns Enhanced file data with additional fields
 */
export function enhanceMigrationFile(fileData: Partial<InsertMigrationFile>): Partial<InsertMigrationFile> {
  if (!fileData.fileName) {
    return fileData;
  }
  
  // Add file type if not provided
  if (!fileData.fileType) {
    fileData.fileType = getFileType(fileData.fileName);
  }
  
  // Calculate file size if source code is available
  if (fileData.sourceCode && !fileData.fileSize) {
    fileData.fileSize = Buffer.byteLength(fileData.sourceCode, 'utf8');
  }
  
  return fileData;
}

/**
 * Tracks processing time for migration operations
 */
export class ProcessingTimer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  /**
   * Gets the elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
  
  /**
   * Resets the timer
   */
  reset(): void {
    this.startTime = Date.now();
  }
}

/**
 * Helper to organize files by their directories
 * @param files List of migration files with paths
 * @returns An object with directories as keys and files as values
 */
export function organizeFilesByDirectory(files: { fileName: string; filePath?: string | null }[]): Record<string, string[]> {
  const directories: Record<string, string[]> = {};
  
  files.forEach(file => {
    const filePath = file.filePath || '';
    const dirPath = path.dirname(filePath);
    
    if (!directories[dirPath]) {
      directories[dirPath] = [];
    }
    
    directories[dirPath].push(file.fileName);
  });
  
  return directories;
}

/**
 * Checks if a file should be migrated based on its extension
 * @param fileName The name of the file
 * @returns Boolean indicating if the file should be migrated
 */
export function shouldMigrateFile(fileName: string): boolean {
  // Skip certain file types that shouldn't be migrated
  const skipExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.pdf', 
    '.zip', '.tar', '.gz', '.rar', '.7z', 
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.ttf', '.woff', '.woff2', '.eot',
    '.gitignore', '.env', '.env.example', '.env.local',
    '.prettierrc', '.eslintrc', '.babelrc',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
  ];
  
  const lowerFileName = fileName.toLowerCase();
  return !skipExtensions.some(ext => lowerFileName.endsWith(ext));
}

/**
 * Calculates a simple compatibility score for a migration
 * @param keyChanges Array of key changes detected during migration
 * @returns A score from 0-100
 */
export function calculateCompatibilityScore(keyChanges: any[]): number {
  if (!Array.isArray(keyChanges) || keyChanges.length === 0) {
    return 100; // Perfect compatibility if no changes needed
  }
  
  // Count critical issues
  const criticalCount = keyChanges.filter(
    change => change.severity === 'critical'
  ).length;
  
  // Count warnings
  const warningCount = keyChanges.filter(
    change => change.severity === 'warning'
  ).length;
  
  // Base score starts at 100
  let score = 100;
  
  // Deduct 15 points for each critical issue
  score -= criticalCount * 15;
  
  // Deduct 5 points for each warning
  score -= warningCount * 5;
  
  // Ensure score doesn't go below 0
  return Math.max(0, score);
}

/**
 * Determines migration complexity based on file characteristics
 * @param sourceCode The source code
 * @param keyChanges Array of key changes
 * @returns 'low', 'medium', or 'high'
 */
export function determineMigrationComplexity(sourceCode: string, keyChanges: any[]): string {
  // Start with a complexity score based on code length
  let complexityScore = 0;
  
  // Code length factor
  const codeLength = sourceCode.length;
  if (codeLength > 10000) {
    complexityScore += 30;
  } else if (codeLength > 3000) {
    complexityScore += 15;
  } else if (codeLength > 1000) {
    complexityScore += 5;
  }
  
  // Key changes factor
  if (Array.isArray(keyChanges)) {
    const criticalCount = keyChanges.filter(
      change => change.severity === 'critical'
    ).length;
    
    complexityScore += criticalCount * 10;
    
    const warningCount = keyChanges.filter(
      change => change.severity === 'warning'
    ).length;
    
    complexityScore += warningCount * 5;
  }
  
  // Determine complexity level
  if (complexityScore >= 40) {
    return 'high';
  } else if (complexityScore >= 15) {
    return 'medium';
  } else {
    return 'low';
  }
}