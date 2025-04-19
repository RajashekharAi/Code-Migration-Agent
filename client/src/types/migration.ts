// Migration types
export type MigrationType = 
  | 'Language Version Upgrade'
  | 'Framework Transition'
  | 'API Adaptation'
  | 'Architectural Shift'
  | 'Full Rewrite';

export interface MigrationProject {
  id: number;
  name: string;
  migrationType: MigrationType;
  sourceLanguage: string;
  sourceVersion?: string;
  targetLanguage: string;
  targetVersion?: string;
  createdAt: string;
  userId?: number;
}

export interface MigrationFile {
  id: number;
  projectId: number;
  fileName: string;
  sourceCode: string;
  targetCode?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface KeyChange {
  type: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface PerformanceMetric {
  name: string;
  score: number;
  description?: string;
}

export interface BusinessLogicPreservation {
  category: string;
  score: number;
  details?: string;
}

export interface MigrationAnalysis {
  id: number;
  fileId: number;
  keyChanges: KeyChange[];
  performanceMetrics?: Record<string, PerformanceMetric>;
  businessLogicPreservation?: Record<string, BusinessLogicPreservation>;
  generatedTests?: string;
  createdAt: string;
}

// Form types for creating/editing
export interface MigrationProjectFormData {
  name: string;
  migrationType: MigrationType;
  sourceLanguage: string;
  sourceVersion?: string;
  targetLanguage: string;
  targetVersion?: string;
}

export interface MigrationFileFormData {
  fileName: string;
  sourceCode: string;
  projectId: number;
}

// Languages supported
export const LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C#',
  'PHP',
  'Ruby',
  'Go',
  'Rust',
  'Swift',
  'Kotlin',
  'C++',
  'C',
  'Scala',
  'Haskell',
  'Perl',
  'R',
  'Dart',
  'Lua',
  'Elixir',
  'Node.js',
  'React',
  'Angular',
  'Vue.js',
  'Django',
  'Flask',
  'Spring',
  'Express',
  'Ruby on Rails',
  'Laravel',
  'ASP.NET',
];

// Migration types list
export const MIGRATION_TYPES: MigrationType[] = [
  'Language Version Upgrade',
  'Framework Transition',
  'API Adaptation',
  'Architectural Shift',
  'Full Rewrite',
];
