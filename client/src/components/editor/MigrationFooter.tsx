import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MigrationFile } from "@/types/migration";
import { useQuery } from "@tanstack/react-query";
import { generateTests } from "@/services/openai";
import { queryClient } from "@/lib/queryClient";

interface MigrationFooterProps {
  fileId?: number;
  projectId?: number;
}

export default function MigrationFooter({ fileId, projectId }: MigrationFooterProps) {
  const { toast } = useToast();
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  
  const { data: file, isLoading: isFileLoading } = useQuery<MigrationFile>({
    queryKey: fileId ? [`/api/files/single/${fileId}`] : null,
    enabled: !!fileId,
  });
  
  const { data: analysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: fileId ? [`/api/analysis/${fileId}`] : null,
    enabled: !!fileId,
  });
  
  const isLoading = isFileLoading || isAnalysisLoading;
  const isCompleted = file?.status === "completed";
  
  const handleGenerateTests = async () => {
    if (!file || !file.sourceCode || !file.targetCode) return;
    
    setIsGeneratingTests(true);
    toast({
      title: "Generating Tests",
      description: "Creating unit tests for your migrated code...",
    });
    
    try {
      const result = await generateTests({
        sourceCode: file.sourceCode,
        targetCode: file.targetCode,
        sourceLanguage: "Source Language", // Ideally get this from project or file
        targetLanguage: "Target Language", // Ideally get this from project or file
        fileId: file.id,
      });
      
      // Invalidate the analysis query to get updated test data
      queryClient.invalidateQueries({ queryKey: [`/api/analysis/${fileId}`] });
      
      toast({
        title: "Tests Generated",
        description: "Unit tests have been created successfully!",
      });
    } catch (error: any) {
      console.error("Test generation error:", error);
      toast({
        title: "Test Generation Failed",
        description: error.message || "An error occurred during test generation",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTests(false);
    }
  };

  // Helper to render rating dots
  const renderRatingDots = (rating: number, max = 5) => {
    return (
      <div className="flex">
        {Array.from({ length: max }).map((_, index) => (
          <div
            key={index}
            className={`w-2.5 h-2.5 rounded-full mr-1 ${
              index < rating ? "bg-green-500" : "bg-gray-300"
            }`}
          ></div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
        <div>
          <span className="text-sm text-gray-500">Migration Status:</span>
          {isLoading ? (
            <Skeleton className="ml-2 h-4 w-20 inline-block" />
          ) : (
            <span className={`ml-2 text-sm font-medium flex items-center ${
              file?.status === "completed" ? "text-green-600" :
              file?.status === "failed" ? "text-red-600" :
              "text-amber-600"
            }`}>
              {file?.status === "completed" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {file?.status === "failed" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {file?.status === "pending" && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {file?.status || "No File Selected"}
            </span>
          )}
        </div>
        
        {isLoading || !analysis ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Skeleton className="h-4 w-40" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">Code Quality:</span>
              {renderRatingDots(4)}
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">Performance:</span>
              {renderRatingDots(5)}
            </div>
          </div>
        )}
        
        <div>
          <Button
            onClick={handleGenerateTests}
            disabled={!isCompleted || isGeneratingTests}
            className="bg-secondary-600 hover:bg-secondary-500 text-white"
            size="sm"
          >
            <Edit className="h-4 w-4 mr-1" />
            {isGeneratingTests ? "Generating..." : "Generate Tests"}
          </Button>
        </div>
      </div>
    </div>
  );
}
