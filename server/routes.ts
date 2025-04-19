import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertMigrationProjectSchema, insertMigrationFileSchema, insertMigrationAnalysisSchema } from "@shared/schema";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import path from "path";

// OpenAI integration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Utility functions for project migration
function shouldMigrateFile(fileName: string): boolean {
  // Get file extension
  const ext = path.extname(fileName).toLowerCase();
  
  // List of extensions that should be migrated
  const codeExtensions = [
    // JavaScript/TypeScript
    '.js', '.jsx', '.ts', '.tsx', 
    // Python
    '.py', 
    // Java
    '.java', 
    // C#
    '.cs', 
    // PHP
    '.php',
    // Ruby 
    '.rb',
    // Go
    '.go',
    // Rust
    '.rs',
    // Swift
    '.swift',
    // C/C++
    '.c', '.cpp', '.h', '.hpp',
    // Other code files
    '.json', '.xml', '.yml', '.yaml', '.toml'
  ];
  
  // Skip binary files, images, etc.
  const skipExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.bmp', '.tiff',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.ttf', '.otf', '.woff', '.woff2',
    '.so', '.dll', '.exe', '.bin'
  ];
  
  if (skipExtensions.includes(ext)) {
    return false;
  }
  
  // If it's a known code extension, migrate it
  if (codeExtensions.includes(ext)) {
    return true;
  }
  
  // For files without extensions or unknown extensions, 
  // we'll try to migrate them if they're not too large
  // This covers configuration files like "Dockerfile", "Makefile", etc.
  return true;
}

async function generateProjectAnalysis(
  sourceFiles: any[], 
  migratedResults: any[], 
  sourceLanguage: string, 
  targetLanguage: string
): Promise<any> {
  try {
    // Prepare a summary of the files that were migrated
    const fileSummaries = migratedResults.map(file => {
      return {
        fileName: file.fileName,
        migrated: file.migrated,
        reason: file.reason || (file.error ? `Error: ${file.error}` : undefined)
      };
    });
    
    const migrationStats = {
      totalFiles: sourceFiles.length,
      migratedFiles: migratedResults.filter(r => r.migrated).length,
      skippedFiles: migratedResults.filter(r => !r.migrated && !r.error).length,
      failedFiles: migratedResults.filter(r => !r.migrated && r.error).length
    };
    
    // Get project-level analysis from OpenAI
    const projectInfo = {
      sourceLanguage,
      targetLanguage,
      fileCount: sourceFiles.length,
      fileTypes: [...new Set(sourceFiles.map(f => path.extname(f.fileName) || 'no-extension'))],
      migrationStats
    };
    
    // Generate a sample of source files for analysis (to avoid token limits)
    const sampleSize = Math.min(3, sourceFiles.length);
    const sampleFiles = sourceFiles
      .filter(f => shouldMigrateFile(f.fileName))
      .slice(0, sampleSize)
      .map(f => ({ fileName: f.fileName, content: f.content }));
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: [
        {
          role: "system",
          content: `You are an expert in code migration and analysis. Analyze this project migration from ${sourceLanguage} to ${targetLanguage}. 
          Generate a comprehensive analysis with the following sections:
          1. Project Overview - High-level description of what the project appears to do
          2. Migration Complexity - Assessment of how complex this migration is (Simple/Moderate/Complex)
          3. Key Challenges - Major challenges in migrating this codebase
          4. Recommended Changes - Recommended architectural or structural changes for the target language
          5. Dependencies - List of likely dependencies needed in the target language
          6. Testing Strategy - Recommended approach for testing the migrated code
          
          Respond in JSON format with these sections as keys.`
        },
        {
          role: "user",
          content: JSON.stringify({
            projectInfo,
            sampleFiles
          })
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    
    try {
      // Parse the analysis
      const analysis = JSON.parse(response.choices[0].message.content || "{}");
      
      // Combine with migration stats
      return {
        ...analysis,
        migrationStats
      };
    } catch (e) {
      // If parsing fails, return a simpler analysis
      return {
        projectOverview: "Analysis could not be generated",
        migrationComplexity: "Unknown",
        migrationStats
      };
    }
  } catch (error: any) {
    console.error("Error generating project analysis:", error);
    return {
      projectOverview: "Error generating analysis",
      error: error.message,
      migrationStats: {
        totalFiles: sourceFiles.length,
        migratedFiles: migratedResults.filter(r => r.migrated).length,
        skippedFiles: migratedResults.filter(r => !r.migrated && !r.error).length,
        failedFiles: migratedResults.filter(r => !r.migrated && r.error).length
      }
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup WebSocket for real-time updates
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
      console.log('Received message:', message);
    });
    
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // Broadcast function for WebSocket updates
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(data));
      }
    });
  };

  // API ROUTES
  
  // Test endpoint
  app.get('/api/test', (_req: Request, res: Response) => {
    res.json({ 
      status: 'ok', 
      message: 'API is working', 
      openaiConfigured: !!process.env.OPENAI_API_KEY 
    });
  });
  
  // Project Migration endpoint - for migrating entire projects
  app.post('/api/migrate-project', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectFiles: z.array(z.object({
          fileName: z.string(),
          filePath: z.string(),
          content: z.string()
        })),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        projectName: z.string().optional(),
        sourceVersion: z.string().optional(),
        targetVersion: z.string().optional(),
        preserveStructure: z.boolean().optional().default(true),
      });

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid project migration request', 
          errors: validation.error.errors 
        });
      }

      const { 
        projectFiles, sourceLanguage, targetLanguage, 
        sourceVersion, targetVersion, preserveStructure 
      } = validation.data;
      
      // Process each file in the project
      const results = [];
      
      for (const file of projectFiles) {
        try {
          // Determine if file should be migrated based on extension/type
          if (!shouldMigrateFile(file.fileName)) {
            // Skip files that don't need migration (like images, etc.)
            results.push({
              fileName: file.fileName,
              filePath: file.filePath,
              targetCode: file.content, // Keep original content
              migrated: false,
              reason: "File type doesn't require migration"
            });
            continue;
          }
          
          // Call OpenAI API to migrate the code
          const response = await openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages: [
              {
                role: "system",
                content: `You are an Intelligent Code Migration Agent specializing in migrating code from ${sourceLanguage} to ${targetLanguage} while preserving business logic and functionality.
                
This file is part of a larger project with the following context:
- Source Language: ${sourceLanguage}${sourceVersion ? ` ${sourceVersion}` : ''}
- Target Language: ${targetLanguage}${targetVersion ? ` ${targetVersion}` : ''}
- File Path: ${file.filePath}
- File Name: ${file.fileName}

Your task is to translate this source code accurately while:
1. Preserving all business logic and functionality
2. Using appropriate idioms, patterns, and best practices for the target language
3. Maintaining imports, dependencies, and module structures appropriately
4. Keeping comments and documentation (translate them if needed)
5. Following correct naming conventions for the target language

Return only the migrated code without explanations.`
              },
              {
                role: "user",
                content: `Please migrate this ${sourceLanguage} file to ${targetLanguage}:\n\n${file.content}`
              }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          });

          const migratedCode = response.choices[0].message.content || "";
          
          // Add to results
          results.push({
            fileName: file.fileName,
            filePath: file.filePath,
            targetCode: migratedCode,
            migrated: true
          });
          
        } catch (error: any) {
          console.error(`Error migrating file ${file.fileName}:`, error);
          results.push({
            fileName: file.fileName,
            filePath: file.filePath,
            error: error.message || "Unknown error",
            migrated: false
          });
        }
      }
      
      // Generate project analysis
      const projectAnalysis = await generateProjectAnalysis(
        projectFiles, 
        results, 
        sourceLanguage, 
        targetLanguage
      );
      
      res.json({ 
        results,
        projectAnalysis
      });
    } catch (error: any) {
      console.error('Project migration error:', error);
      res.status(500).json({ message: 'Failed to migrate project', error: error.message });
    }
  });
  
  // Migration Projects routes
  app.get('/api/projects', async (_req: Request, res: Response) => {
    try {
      const projects = await storage.getMigrationProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const project = await storage.getMigrationProject(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch project' });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validation = insertMigrationProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid project data', 
          errors: validation.error.errors 
        });
      }
      
      const project = await storage.createMigrationProject(validation.data);
      broadcast({ type: 'project_created', data: project });
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create project' });
    }
  });

  app.put('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const validation = insertMigrationProjectSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid project data', 
          errors: validation.error.errors 
        });
      }
      
      const project = await storage.updateMigrationProject(id, validation.data);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      broadcast({ type: 'project_updated', data: project });
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const deleted = await storage.deleteMigrationProject(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      broadcast({ type: 'project_deleted', data: { id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Migration Files routes
  app.get('/api/files/:projectId', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }
      
      const files = await storage.getMigrationFiles(projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.get('/api/files/single/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }
      
      const file = await storage.getMigrationFile(id);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch file' });
    }
  });

  app.post('/api/files', async (req: Request, res: Response) => {
    try {
      const validation = insertMigrationFileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid file data', 
          errors: validation.error.errors 
        });
      }
      
      const file = await storage.createMigrationFile(validation.data);
      broadcast({ type: 'file_created', data: file });
      res.status(201).json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create file' });
    }
  });

  app.put('/api/files/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }
      
      const validation = insertMigrationFileSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid file data', 
          errors: validation.error.errors 
        });
      }
      
      const file = await storage.updateMigrationFile(id, validation.data);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      broadcast({ type: 'file_updated', data: file });
      res.json(file);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  app.delete('/api/files/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }
      
      const deleted = await storage.deleteMigrationFile(id);
      if (!deleted) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      broadcast({ type: 'file_deleted', data: { id } });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Migration Analysis routes
  app.get('/api/analysis/:fileId', async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: 'Invalid file ID' });
      }
      
      const analysis = await storage.getMigrationAnalysisByFileId(fileId);
      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch analysis' });
    }
  });

  app.post('/api/analysis', async (req: Request, res: Response) => {
    try {
      const validation = insertMigrationAnalysisSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid analysis data', 
          errors: validation.error.errors 
        });
      }
      
      const analysis = await storage.createMigrationAnalysis(validation.data);
      broadcast({ type: 'analysis_created', data: analysis });
      res.status(201).json(analysis);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create analysis' });
    }
  });

  // Code Migration Route - Integrated with OpenAI
  app.post('/api/migrate', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        sourceCode: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
        projectName: z.string().optional(),
        sourceVersion: z.string().optional(),
        targetVersion: z.string().optional(),
        fileName: z.string().optional(),
        migrationType: z.string().optional(),
      });

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid migration request', 
          errors: validation.error.errors 
        });
      }

      const { 
        sourceCode, sourceLanguage, targetLanguage, 
        sourceVersion, targetVersion, migrationType 
      } = validation.data;
      
      // Call OpenAI API to migrate the code
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are an Intelligent Code Migration Agent specializing in migrating code from ${sourceLanguage} to ${targetLanguage}. Your task is to translate the provided source code accurately while preserving business logic. Use appropriate idioms, patterns, and best practices for the target language. Return only the migrated code without explanations.`
            },
            {
              role: "user",
              content: `Please migrate this ${sourceLanguage}${sourceVersion ? ` ${sourceVersion}` : ''} code to ${targetLanguage}${targetVersion ? ` ${targetVersion}` : ''}:\n\n${sourceCode}`
            }
          ],
          temperature: 0.2,
          max_tokens: 4000,
        });

        const migratedCode = response.choices[0].message.content || "";
        
        // Now let's analyze the migration to provide insights
        const analysisResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert code reviewer specializing in analyzing code migrations from ${sourceLanguage} to ${targetLanguage}. Analyze the source and target code to identify key changes, performance implications, and business logic preservation. Respond with a detailed analysis in JSON format.`
            },
            {
              role: "user",
              content: `Source (${sourceLanguage}):\n${sourceCode}\n\nTarget (${targetLanguage}):\n${migratedCode}\n\nProvide a detailed analysis including: keyChanges (array of changes), performanceMetrics (object with ratings), businessLogicPreservation (object with ratings), and generatedTests (string with example tests).`
            }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        });

        const analysisData = JSON.parse(analysisResponse.choices[0].message.content || "{}");
        
        // Store the generated results if we have a file ID
        if (req.body.fileId) {
          const fileId = parseInt(req.body.fileId);
          if (!isNaN(fileId)) {
            // Update the file with the migrated code
            await storage.updateMigrationFile(fileId, {
              targetCode: migratedCode,
              status: "completed"
            });
            
            // Create the analysis
            await storage.createMigrationAnalysis({
              fileId,
              keyChanges: analysisData.keyChanges || [],
              performanceMetrics: analysisData.performanceMetrics || {},
              businessLogicPreservation: analysisData.businessLogicPreservation || {},
              generatedTests: analysisData.generatedTests || "",
              createdAt: new Date().toISOString()
            });
            
            broadcast({ 
              type: 'migration_completed', 
              data: { 
                fileId,
                status: "completed"
              } 
            });
          }
        }
        
        res.json({ 
          migratedCode,
          analysis: analysisData
        });
      } catch (error: any) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ message: 'OpenAI API error', error: error.message });
      }
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ message: 'Failed to migrate code' });
    }
  });

  // Generate Tests Route
  app.post('/api/generate-tests', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        sourceCode: z.string(),
        targetCode: z.string(),
        sourceLanguage: z.string(),
        targetLanguage: z.string(),
      });

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Invalid test generation request', 
          errors: validation.error.errors 
        });
      }

      const { sourceCode, targetCode, sourceLanguage, targetLanguage } = validation.data;
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
          messages: [
            {
              role: "system",
              content: `You are an expert in writing tests for ${targetLanguage} code. Generate comprehensive unit tests for the provided code that validate all the key functionality and edge cases. Focus on ensuring that the business logic from the original code is preserved in the migrated code. Return only the test code.`
            },
            {
              role: "user",
              content: `Original ${sourceLanguage} code:\n${sourceCode}\n\nMigrated ${targetLanguage} code:\n${targetCode}\n\nGenerate unit tests that validate the migrated code preserves the functionality of the original code.`
            }
          ],
          temperature: 0.2,
        });
        
        const generatedTests = response.choices[0].message.content || "";
        
        // Update the analysis if we have a file ID
        if (req.body.fileId) {
          const fileId = parseInt(req.body.fileId);
          const analysis = await storage.getMigrationAnalysisByFileId(fileId);
          
          if (analysis) {
            await storage.updateMigrationAnalysis(analysis.id, {
              generatedTests
            });
            
            broadcast({ 
              type: 'tests_generated', 
              data: { 
                fileId,
                generatedTests
              } 
            });
          }
        }
        
        res.json({ generatedTests });
      } catch (error: any) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ message: 'OpenAI API error', error: error.message });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate tests' });
    }
  });

  return httpServer;
}
