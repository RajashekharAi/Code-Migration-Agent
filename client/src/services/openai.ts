import { apiRequest } from "@/lib/queryClient";
import type { 
  MigrationType, 
  KeyChange, 
  PerformanceMetric, 
  BusinessLogicPreservation 
} from "@/types/migration";

interface MigrationRequest {
  sourceCode: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceVersion?: string;
  targetVersion?: string;
  fileName?: string;
  migrationType?: MigrationType;
  fileId?: number;
}

interface MigrationResponse {
  migratedCode: string;
  analysis: {
    keyChanges: KeyChange[];
    performanceMetrics: Record<string, PerformanceMetric>;
    businessLogicPreservation: Record<string, BusinessLogicPreservation>;
    generatedTests: string;
  };
}

interface TestGenerationRequest {
  sourceCode: string;
  targetCode: string;
  sourceLanguage: string;
  targetLanguage: string;
  fileId?: number;
}

interface TestGenerationResponse {
  generatedTests: string;
}

// Migration service
export async function migrateCode(request: MigrationRequest): Promise<MigrationResponse> {
  const response = await apiRequest('POST', '/api/migrate', request);
  return response.json();
}

// Test generation service
export async function generateTests(request: TestGenerationRequest): Promise<TestGenerationResponse> {
  const response = await apiRequest('POST', '/api/generate-tests', request);
  return response.json();
}
