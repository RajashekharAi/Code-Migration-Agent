import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Settings, Users, Lock, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MigrationProject } from "@/types/migration";

interface SidebarItemProps {
  project: MigrationProject;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem = ({ project, isActive, onClick }: SidebarItemProps) => {
  // Determine the color based on the migration type
  const getIndicatorColor = (type: string) => {
    switch (type) {
      case "Framework Transition":
        return "bg-secondary-400";
      case "Language Version Upgrade":
        return "bg-amber-500";
      case "API Adaptation":
        return "bg-green-500";
      case "Architectural Shift":
        return "bg-purple-500";
      case "Full Rewrite":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div 
      className={`sidebar-item flex items-center px-4 py-3 cursor-pointer ${isActive ? 'bg-gray-700' : ''}`}
      onClick={onClick}
    >
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor(project.migrationType)} mr-3`}></div>
      <div>
        <div className="font-medium">{project.name}</div>
        <div className="text-xs text-gray-400">{project.sourceLanguage} → {project.targetLanguage}</div>
      </div>
    </div>
  );
};

interface SidebarProps {
  onProjectSelect: (project: MigrationProject) => void;
  selectedProject?: MigrationProject;
}

export default function Sidebar({ onProjectSelect, selectedProject }: SidebarProps) {
  const [location, setLocation] = useLocation();
  
  const { data: projects = [], isLoading } = useQuery<MigrationProject[]>({
    queryKey: ['/api/projects'],
  });

  // Handle project selection
  const handleProjectClick = (project: MigrationProject) => {
    onProjectSelect(project);
  };

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full shadow-lg hidden md:flex">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
        </div>
      </div>
      <div className="overflow-y-auto flex-grow">
        <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold">
          Recent
        </div>
        
        {isLoading ? (
          <>
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-3/4 bg-gray-700 mb-2" />
              <Skeleton className="h-3 w-1/2 bg-gray-700" />
            </div>
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-2/3 bg-gray-700 mb-2" />
              <Skeleton className="h-3 w-1/2 bg-gray-700" />
            </div>
          </>
        ) : projects.length > 0 ? (
          projects.map(project => (
            <SidebarItem 
              key={project.id} 
              project={project} 
              isActive={selectedProject?.id === project.id}
              onClick={() => handleProjectClick(project)}
            />
          ))
        ) : (
          <div className="px-4 py-3 text-sm text-gray-400">
            No projects yet. Create one with the "New Project" button.
          </div>
        )}
        
        <div className="px-4 py-2 mt-4 text-xs uppercase tracking-wider text-gray-400 font-semibold">
          Settings
        </div>
        <div className="sidebar-item flex items-center px-4 py-3 cursor-pointer">
          <Settings className="h-5 w-5 mr-3 text-gray-400" />
          <span>Preferences</span>
        </div>
        <div className="sidebar-item flex items-center px-4 py-3 cursor-pointer">
          <Users className="h-5 w-5 mr-3 text-gray-400" />
          <span>Team</span>
        </div>
        <div className="sidebar-item flex items-center px-4 py-3 cursor-pointer">
          <Lock className="h-5 w-5 mr-3 text-gray-400" />
          <span>API Keys</span>
        </div>
      </div>
      <div className="p-4 border-t border-gray-700 mt-auto">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-sm font-medium">
              JD
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium">John Doe</div>
            <div className="text-xs text-gray-400">john.doe@example.com</div>
          </div>
          <button className="ml-auto text-gray-400 hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
