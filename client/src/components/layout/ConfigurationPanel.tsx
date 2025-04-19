import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MigrationProject, LANGUAGES, MIGRATION_TYPES } from "@/types/migration";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ConfigurationPanelProps {
  project: MigrationProject | null;
  onStartMigration: () => void;
  disabled?: boolean;
}

export default function ConfigurationPanel({ project, onStartMigration, disabled = false }: ConfigurationPanelProps) {
  const { toast } = useToast();
  const [updatedProject, setUpdatedProject] = useState<Partial<MigrationProject>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Track if the project has been modified
  const hasChanges = Object.keys(updatedProject).length > 0;

  // Handle input changes
  const handleChange = (field: string, value: string) => {
    setUpdatedProject(prev => ({ ...prev, [field]: value }));
  };

  // Save project changes
  const saveChanges = async () => {
    if (!project || !hasChanges) return;
    
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/projects/${project.id}`, updatedProject);
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Success", description: "Project updated successfully" });
      setUpdatedProject({});
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update project", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Combine project with updates for display
  const displayProject = project ? { ...project, ...updatedProject } : null;

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
        <div className="flex-grow">
          <h2 className="text-lg font-semibold mb-3">Migration Configuration</h2>
          {!project ? (
            <div className="text-gray-500 italic">
              Select or create a project to configure migration settings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Migration Type</Label>
                <Select
                  value={displayProject?.migrationType}
                  onValueChange={(value) => handleChange("migrationType", value)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select migration type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MIGRATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Project Name</Label>
                <Input
                  type="text"
                  value={displayProject?.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter project name"
                  disabled={disabled}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Source Language/Framework</Label>
                <div className="flex space-x-2">
                  <Select
                    value={displayProject?.sourceLanguage}
                    onValueChange={(value) => handleChange("sourceLanguage", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    className="w-20"
                    value={displayProject?.sourceVersion || ""}
                    onChange={(e) => handleChange("sourceVersion", e.target.value)}
                    placeholder="Version"
                    disabled={disabled}
                  />
                </div>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-1">Target Language/Framework</Label>
                <div className="flex space-x-2">
                  <Select
                    value={displayProject?.targetLanguage}
                    onValueChange={(value) => handleChange("targetLanguage", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select target" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    className="w-20"
                    value={displayProject?.targetVersion || ""}
                    onChange={(e) => handleChange("targetVersion", e.target.value)}
                    placeholder="Version"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-2 justify-end">
          {hasChanges && (
            <Button
              variant="outline"
              onClick={saveChanges}
              disabled={isSaving || disabled}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
          
          <Button
            className="bg-primary-600 hover:bg-primary-500 text-white"
            onClick={onStartMigration}
            disabled={!project || disabled}
          >
            <Zap className="h-5 w-5 mr-2" />
            Start Migration
          </Button>
        </div>
      </div>
    </div>
  );
}
