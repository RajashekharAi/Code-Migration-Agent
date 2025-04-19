import {
  users, User, InsertUser,
  migrationProjects, MigrationProject, InsertMigrationProject,
  migrationFiles, MigrationFile, InsertMigrationFile,
  migrationAnalyses, MigrationAnalysis, InsertMigrationAnalysis
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Migration Project operations
  getMigrationProject(id: number): Promise<MigrationProject | undefined>;
  getMigrationProjects(userId?: number): Promise<MigrationProject[]>;
  createMigrationProject(project: InsertMigrationProject): Promise<MigrationProject>;
  updateMigrationProject(id: number, project: Partial<InsertMigrationProject>): Promise<MigrationProject | undefined>;
  deleteMigrationProject(id: number): Promise<boolean>;

  // Migration File operations
  getMigrationFile(id: number): Promise<MigrationFile | undefined>;
  getMigrationFiles(projectId: number): Promise<MigrationFile[]>;
  createMigrationFile(file: InsertMigrationFile): Promise<MigrationFile>;
  updateMigrationFile(id: number, file: Partial<InsertMigrationFile>): Promise<MigrationFile | undefined>;
  deleteMigrationFile(id: number): Promise<boolean>;

  // Migration Analysis operations
  getMigrationAnalysis(id: number): Promise<MigrationAnalysis | undefined>;
  getMigrationAnalysisByFileId(fileId: number): Promise<MigrationAnalysis | undefined>;
  createMigrationAnalysis(analysis: InsertMigrationAnalysis): Promise<MigrationAnalysis>;
  updateMigrationAnalysis(id: number, analysis: Partial<InsertMigrationAnalysis>): Promise<MigrationAnalysis | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private migrationProjects: Map<number, MigrationProject>;
  private migrationFiles: Map<number, MigrationFile>;
  private migrationAnalyses: Map<number, MigrationAnalysis>;
  private userIdCounter: number;
  private projectIdCounter: number;
  private fileIdCounter: number;
  private analysisIdCounter: number;

  constructor() {
    this.users = new Map();
    this.migrationProjects = new Map();
    this.migrationFiles = new Map();
    this.migrationAnalyses = new Map();
    this.userIdCounter = 1;
    this.projectIdCounter = 1;
    this.fileIdCounter = 1;
    this.analysisIdCounter = 1;
    
    // Add some sample projects for demo purposes
    const now = new Date().toISOString();
    this.migrationProjects.set(1, {
      id: 1,
      name: "API Migration",
      migrationType: "Framework Transition",
      sourceLanguage: "Python",
      sourceVersion: "3.8",
      targetLanguage: "Node.js",
      targetVersion: "16.x",
      createdAt: now,
      userId: 1
    });
    
    this.migrationProjects.set(2, {
      id: 2,
      name: "Auth Service",
      migrationType: "Language Version Upgrade",
      sourceLanguage: "Java",
      sourceVersion: "8",
      targetLanguage: "Java",
      targetVersion: "17",
      createdAt: now,
      userId: 1
    });
    
    this.migrationProjects.set(3, {
      id: 3,
      name: "Payment Module",
      migrationType: "Framework Transition",
      sourceLanguage: "Angular",
      sourceVersion: "11",
      targetLanguage: "React",
      targetVersion: "18",
      createdAt: now,
      userId: 1
    });
    
    this.projectIdCounter = 4;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Migration Project operations
  async getMigrationProject(id: number): Promise<MigrationProject | undefined> {
    return this.migrationProjects.get(id);
  }

  async getMigrationProjects(userId?: number): Promise<MigrationProject[]> {
    const projects = Array.from(this.migrationProjects.values());
    if (userId) {
      return projects.filter(project => project.userId === userId);
    }
    return projects;
  }

  async createMigrationProject(project: InsertMigrationProject): Promise<MigrationProject> {
    const id = this.projectIdCounter++;
    const newProject: MigrationProject = { ...project, id };
    this.migrationProjects.set(id, newProject);
    return newProject;
  }

  async updateMigrationProject(id: number, projectUpdate: Partial<InsertMigrationProject>): Promise<MigrationProject | undefined> {
    const project = this.migrationProjects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...projectUpdate };
    this.migrationProjects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteMigrationProject(id: number): Promise<boolean> {
    const deleted = this.migrationProjects.delete(id);
    
    // Also delete related files and analyses
    const filesToDelete = Array.from(this.migrationFiles.values())
      .filter(file => file.projectId === id)
      .map(file => file.id);
      
    filesToDelete.forEach(fileId => {
      this.migrationFiles.delete(fileId);
      
      // Delete related analyses
      const analysesToDelete = Array.from(this.migrationAnalyses.values())
        .filter(analysis => analysis.fileId === fileId)
        .map(analysis => analysis.id);
        
      analysesToDelete.forEach(analysisId => {
        this.migrationAnalyses.delete(analysisId);
      });
    });
    
    return deleted;
  }

  // Migration File operations
  async getMigrationFile(id: number): Promise<MigrationFile | undefined> {
    return this.migrationFiles.get(id);
  }

  async getMigrationFiles(projectId: number): Promise<MigrationFile[]> {
    return Array.from(this.migrationFiles.values())
      .filter(file => file.projectId === projectId);
  }

  async createMigrationFile(file: InsertMigrationFile): Promise<MigrationFile> {
    const id = this.fileIdCounter++;
    const newFile: MigrationFile = { ...file, id };
    this.migrationFiles.set(id, newFile);
    return newFile;
  }

  async updateMigrationFile(id: number, fileUpdate: Partial<InsertMigrationFile>): Promise<MigrationFile | undefined> {
    const file = this.migrationFiles.get(id);
    if (!file) return undefined;

    const updatedFile = { ...file, ...fileUpdate };
    this.migrationFiles.set(id, updatedFile);
    return updatedFile;
  }

  async deleteMigrationFile(id: number): Promise<boolean> {
    const deleted = this.migrationFiles.delete(id);
    
    // Also delete related analyses
    const analysesToDelete = Array.from(this.migrationAnalyses.values())
      .filter(analysis => analysis.fileId === id)
      .map(analysis => analysis.id);
      
    analysesToDelete.forEach(analysisId => {
      this.migrationAnalyses.delete(analysisId);
    });
    
    return deleted;
  }

  // Migration Analysis operations
  async getMigrationAnalysis(id: number): Promise<MigrationAnalysis | undefined> {
    return this.migrationAnalyses.get(id);
  }

  async getMigrationAnalysisByFileId(fileId: number): Promise<MigrationAnalysis | undefined> {
    return Array.from(this.migrationAnalyses.values())
      .find(analysis => analysis.fileId === fileId);
  }

  async createMigrationAnalysis(analysis: InsertMigrationAnalysis): Promise<MigrationAnalysis> {
    const id = this.analysisIdCounter++;
    const newAnalysis: MigrationAnalysis = { ...analysis, id };
    this.migrationAnalyses.set(id, newAnalysis);
    return newAnalysis;
  }

  async updateMigrationAnalysis(id: number, analysisUpdate: Partial<InsertMigrationAnalysis>): Promise<MigrationAnalysis | undefined> {
    const analysis = this.migrationAnalyses.get(id);
    if (!analysis) return undefined;

    const updatedAnalysis = { ...analysis, ...analysisUpdate };
    this.migrationAnalyses.set(id, updatedAnalysis);
    return updatedAnalysis;
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Migration Project operations
  async getMigrationProject(id: number): Promise<MigrationProject | undefined> {
    const [project] = await db.select().from(migrationProjects).where(eq(migrationProjects.id, id));
    return project;
  }

  async getMigrationProjects(userId?: number): Promise<MigrationProject[]> {
    if (userId) {
      return await db.select().from(migrationProjects).where(eq(migrationProjects.userId, userId));
    }
    return await db.select().from(migrationProjects);
  }

  async createMigrationProject(project: InsertMigrationProject): Promise<MigrationProject> {
    const [newProject] = await db.insert(migrationProjects).values(project).returning();
    return newProject;
  }

  async updateMigrationProject(id: number, projectUpdate: Partial<InsertMigrationProject>): Promise<MigrationProject | undefined> {
    const [updatedProject] = await db
      .update(migrationProjects)
      .set(projectUpdate)
      .where(eq(migrationProjects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteMigrationProject(id: number): Promise<boolean> {
    try {
      // First, get all files related to this project
      const files = await db.select().from(migrationFiles).where(eq(migrationFiles.projectId, id));
      
      // Delete analyses for these files
      for (const file of files) {
        await db.delete(migrationAnalyses).where(eq(migrationAnalyses.fileId, file.id));
      }
      
      // Delete files
      await db.delete(migrationFiles).where(eq(migrationFiles.projectId, id));
      
      // Delete the project
      const [deletedProject] = await db
        .delete(migrationProjects)
        .where(eq(migrationProjects.id, id))
        .returning();
      
      return !!deletedProject;
    } catch (error) {
      console.error("Error deleting migration project:", error);
      return false;
    }
  }

  // Migration File operations
  async getMigrationFile(id: number): Promise<MigrationFile | undefined> {
    const [file] = await db.select().from(migrationFiles).where(eq(migrationFiles.id, id));
    return file;
  }

  async getMigrationFiles(projectId: number): Promise<MigrationFile[]> {
    return await db.select().from(migrationFiles).where(eq(migrationFiles.projectId, projectId));
  }

  async createMigrationFile(file: InsertMigrationFile): Promise<MigrationFile> {
    const [newFile] = await db.insert(migrationFiles).values(file).returning();
    return newFile;
  }

  async updateMigrationFile(id: number, fileUpdate: Partial<InsertMigrationFile>): Promise<MigrationFile | undefined> {
    const [updatedFile] = await db
      .update(migrationFiles)
      .set(fileUpdate)
      .where(eq(migrationFiles.id, id))
      .returning();
    return updatedFile;
  }

  async deleteMigrationFile(id: number): Promise<boolean> {
    try {
      // Delete related analyses
      await db.delete(migrationAnalyses).where(eq(migrationAnalyses.fileId, id));
      
      // Delete the file
      const [deletedFile] = await db
        .delete(migrationFiles)
        .where(eq(migrationFiles.id, id))
        .returning();
      
      return !!deletedFile;
    } catch (error) {
      console.error("Error deleting migration file:", error);
      return false;
    }
  }

  // Migration Analysis operations
  async getMigrationAnalysis(id: number): Promise<MigrationAnalysis | undefined> {
    const [analysis] = await db.select().from(migrationAnalyses).where(eq(migrationAnalyses.id, id));
    return analysis;
  }

  async getMigrationAnalysisByFileId(fileId: number): Promise<MigrationAnalysis | undefined> {
    const [analysis] = await db.select().from(migrationAnalyses).where(eq(migrationAnalyses.fileId, fileId));
    return analysis;
  }

  async createMigrationAnalysis(analysis: InsertMigrationAnalysis): Promise<MigrationAnalysis> {
    const [newAnalysis] = await db.insert(migrationAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async updateMigrationAnalysis(id: number, analysisUpdate: Partial<InsertMigrationAnalysis>): Promise<MigrationAnalysis | undefined> {
    const [updatedAnalysis] = await db
      .update(migrationAnalyses)
      .set(analysisUpdate)
      .where(eq(migrationAnalyses.id, id))
      .returning();
    return updatedAnalysis;
  }
}

// Use Database Storage for production
export const storage = new DatabaseStorage();
