import { useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import ConfigurationPanel from "@/components/layout/ConfigurationPanel";
import MigrationWorkspace from "@/components/editor/MigrationWorkspace";
import MigrationFooter from "@/components/editor/MigrationFooter";
import MigrationAnalysisPanel from "@/components/layout/MigrationAnalysis";
import { MigrationProject } from "@/types/migration";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<MigrationProject | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(undefined);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // Handle project selection from sidebar
  const handleProjectSelect = (project: MigrationProject) => {
    setSelectedProject(project);
    setSelectedFileId(undefined); // Reset file selection when project changes
  };
  
  // Handle file selection from workspace
  const handleFileSelect = (fileId: number) => {
    setSelectedFileId(fileId);
  };
  
  // Handle starting migration
  const handleStartMigration = () => {
    // This just passes the click to the Workspace component
    // The migration itself happens in the MigrationWorkspace component
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project before starting migration",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFileId) {
      toast({
        title: "No File Selected",
        description: "Please select or create a file first",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Ready to Migrate",
      description: "Click the refresh icon in the source editor to start migration",
    });
  };

  return (
    <div className="flex h-screen pt-14">
      <Sidebar onProjectSelect={handleProjectSelect} selectedProject={selectedProject} />
      
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        <ConfigurationPanel 
          project={selectedProject} 
          onStartMigration={handleStartMigration} 
          disabled={isMigrating}
        />
        
        <div className="flex-grow flex overflow-hidden">
          <MigrationWorkspace 
            project={selectedProject}
            onFileSelected={handleFileSelect}
          />
        </div>
        
        <MigrationFooter 
          fileId={selectedFileId}
          projectId={selectedProject?.id}
        />
      </div>
      
      <MigrationAnalysisPanel fileId={selectedFileId} />
      
      <AppHeader />
    </div>
  );
}
