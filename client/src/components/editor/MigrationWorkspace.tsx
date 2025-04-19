import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import CodeEditor from "./CodeEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { migrateCode } from "@/services/openai";
import { MigrationProject, MigrationFile } from "@/types/migration";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fileFormSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  sourceCode: z.string().min(1, "Source code is required"),
});

interface MigrationWorkspaceProps {
  project: MigrationProject | null;
  onFileSelected: (fileId: number) => void;
}

export default function MigrationWorkspace({ project, onFileSelected }: MigrationWorkspaceProps) {
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MigrationFile | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Fetch files for the selected project
  const { data: files = [], isLoading, refetch } = useQuery<MigrationFile[]>({
    queryKey: project ? [`/api/files/${project.id}`] : null,
    enabled: !!project,
  });

  // Reset selectedFile when project changes
  useEffect(() => {
    setSelectedFile(null);
    // If there are files after loading, select the first one
    if (project && files.length > 0 && !isLoading) {
      setSelectedFile(files[0]);
      onFileSelected(files[0].id);
    }
  }, [project, files.length]);

  const form = useForm<z.infer<typeof fileFormSchema>>({
    resolver: zodResolver(fileFormSchema),
    defaultValues: {
      fileName: "",
      sourceCode: "",
    },
  });

  // Handle file creation
  const onSubmitFile = async (values: z.infer<typeof fileFormSchema>) => {
    if (!project) return;
    
    try {
      const newFile: Partial<MigrationFile> = {
        fileName: values.fileName,
        sourceCode: values.sourceCode,
        projectId: project.id,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      
      const response = await apiRequest("POST", "/api/files", newFile);
      const createdFile = await response.json();
      
      queryClient.invalidateQueries({ queryKey: [`/api/files/${project.id}`] });
      toast({ title: "Success", description: "File created successfully" });
      setOpenDialog(false);
      form.reset();
      
      // Select the newly created file
      setSelectedFile(createdFile);
      onFileSelected(createdFile.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create file",
        variant: "destructive",
      });
    }
  };

  // Handle file selection
  const handleFileSelect = (file: MigrationFile) => {
    setSelectedFile(file);
    onFileSelected(file.id);
  };

  // Handle source code update
  const handleSourceCodeChange = async (sourceCode: string) => {
    if (!selectedFile) return;
    
    try {
      await apiRequest("PUT", `/api/files/${selectedFile.id}`, {
        sourceCode,
      });
      
      // We don't need to invalidate the query here to avoid UI flicker
      // Just update the local selectedFile
      setSelectedFile((prev) => prev ? { ...prev, sourceCode } : null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update source code",
        variant: "destructive",
      });
    }
  };

  // Start the migration process
  const startMigration = async () => {
    if (!project || !selectedFile) return;
    
    setIsMigrating(true);
    toast({
      title: "Migration Started",
      description: "Processing your code...",
    });
    
    try {
      const result = await migrateCode({
        sourceCode: selectedFile.sourceCode,
        sourceLanguage: project.sourceLanguage,
        sourceVersion: project.sourceVersion,
        targetLanguage: project.targetLanguage,
        targetVersion: project.targetVersion,
        migrationType: project.migrationType,
        fileName: selectedFile.fileName,
        fileId: selectedFile.id,
      });
      
      // Update the file with the migrated code
      await apiRequest("PUT", `/api/files/${selectedFile.id}`, {
        targetCode: result.migratedCode,
        status: "completed",
      });
      
      // Refetch to update the UI
      refetch();
      
      toast({
        title: "Migration Complete",
        description: "Your code has been successfully migrated!",
      });
    } catch (error: any) {
      console.error("Migration error:", error);
      toast({
        title: "Migration Failed",
        description: error.message || "An error occurred during migration",
        variant: "destructive",
      });
      
      // Update file status to failed
      if (selectedFile) {
        await apiRequest("PUT", `/api/files/${selectedFile.id}`, {
          status: "failed",
        });
        refetch();
      }
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full overflow-hidden">
      <Tabs defaultValue="editor" className="w-full h-full">
        <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
          </TabsList>
          
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!project}>
                <PlusCircle className="h-4 w-4 mr-1" />
                New File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New File</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitFile)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="fileName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter file name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sourceCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Code</FormLabel>
                        <FormControl>
                          <textarea
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                            placeholder="Paste your source code here"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create File</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        <TabsContent value="editor" className="flex flex-col md:flex-row w-full h-full">
          {project && selectedFile ? (
            <>
              <div className="w-full md:w-1/2 flex flex-col border-r border-gray-200 h-full">
                <CodeEditor
                  code={selectedFile.sourceCode || ""}
                  language={project.sourceLanguage}
                  title={`Source: ${project.sourceLanguage} ${project.sourceVersion || ""}`}
                  onChange={handleSourceCodeChange}
                  onSave={startMigration}
                />
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col h-full">
                <CodeEditor
                  code={selectedFile.targetCode || "// Migrated code will appear here after migration"}
                  language={project.targetLanguage}
                  title={`Target: ${project.targetLanguage} ${project.targetVersion || ""}`}
                  readOnly={true}
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-8 text-center">
              <div>
                <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                <p className="text-gray-500 mb-4">
                  {project 
                    ? "Create a new file or select an existing one to start migration."
                    : "Select a project from the sidebar to begin."
                  }
                </p>
                
                {project && (
                  <Button onClick={() => setOpenDialog(true)}>
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Create New File
                  </Button>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="files" className="h-full overflow-auto p-4">
          {isLoading ? (
            <div className="text-center p-4">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-gray-500 mb-4">No files yet</p>
              <Button onClick={() => setOpenDialog(true)} disabled={!project}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Create New File
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`p-3 border rounded-md cursor-pointer transition-colors ${
                    selectedFile?.id === file.id
                      ? "bg-primary-50 border-primary-200"
                      : "hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                  <div className="flex justify-between">
                    <div className="font-medium">{file.fileName}</div>
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      file.status === "completed" ? "bg-green-100 text-green-800" :
                      file.status === "failed" ? "bg-red-100 text-red-800" :
                      "bg-amber-100 text-amber-800"
                    }`}>
                      {file.status}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created: {new Date(file.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
