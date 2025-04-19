import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { MigrationAnalysis } from "@/types/migration";

interface MigrationAnalysisPanelProps {
  fileId?: number;
  expanded?: boolean;
}

export default function MigrationAnalysisPanel({ fileId, expanded = false }: MigrationAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  const { data: analysis, isLoading } = useQuery<MigrationAnalysis>({
    queryKey: fileId ? [`/api/analysis/${fileId}`] : null,
    enabled: !!fileId
  });

  // Toggle panel expansion
  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`fixed bottom-0 right-0 w-full md:w-1/3 lg:w-1/4 bg-white shadow-lg rounded-t-lg border border-gray-200 
                ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-2.5rem)]'} 
                transition-transform duration-300 z-10`}
    >
      <div 
        className="p-2 border-b border-gray-200 flex justify-between items-center cursor-pointer"
        onClick={togglePanel}
      >
        <h3 className="font-medium flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Migration Analysis
        </h3>
        <button>
          <ChevronUp className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
        </button>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto">
        {!fileId ? (
          <div className="text-sm text-gray-500 italic">
            No file selected. Start a migration to see analysis.
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !analysis ? (
          <div className="text-sm text-gray-500 italic">
            No analysis available. Complete a migration first.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Key Changes</h4>
              {analysis.keyChanges && analysis.keyChanges.length > 0 ? (
                <ul className="text-sm space-y-2">
                  {analysis.keyChanges.map((change, index) => (
                    <li key={index} className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-secondary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{change.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500 italic">No key changes detected</div>
              )}
            </div>
            
            {analysis.performanceMetrics && Object.keys(analysis.performanceMetrics).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Analysis</h4>
                {Object.entries(analysis.performanceMetrics).map(([key, metric]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded border border-gray-200 mb-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">{metric.name}</span>
                      <span className="text-sm font-medium text-green-600">
                        {metric.score >= 80 ? 'Optimized' : metric.score >= 50 ? 'Acceptable' : 'Needs Improvement'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`${metric.score >= 80 ? 'bg-green-500' : metric.score >= 50 ? 'bg-amber-500' : 'bg-red-500'} h-2.5 rounded-full`}
                        style={{ width: `${metric.score}%` }}
                      ></div>
                    </div>
                    {metric.description && (
                      <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {analysis.businessLogicPreservation && Object.keys(analysis.businessLogicPreservation).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Business Logic Preservation</h4>
                {Object.entries(analysis.businessLogicPreservation).map(([key, item]) => (
                  <div key={key}>
                    <div className="flex items-center space-x-1">
                      <div className="w-1/4 h-2 bg-green-500 rounded-l"></div>
                      <div className="w-1/4 h-2 bg-green-500"></div>
                      <div className="w-1/4 h-2 bg-green-500"></div>
                      <div 
                        className={`w-1/4 h-2 ${item.score >= 75 ? 'bg-green-500' : item.score >= 50 ? 'bg-amber-500' : 'bg-red-500'} rounded-r`}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{item.category}</span>
                      <span>{item.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {analysis.generatedTests && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Tests</h4>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-x-auto">
                  <pre>{analysis.generatedTests}</pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
