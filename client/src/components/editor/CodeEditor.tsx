import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, File, Download } from "lucide-react";

// Load Monaco dynamically on the client side only
import * as monaco from 'monaco-editor';

// Define available languages and their syntax highlighting
const LANGUAGE_MAP: Record<string, string> = {
  "JavaScript": "javascript",
  "TypeScript": "typescript",
  "Python": "python",
  "Java": "java",
  "C#": "csharp",
  "PHP": "php",
  "Ruby": "ruby",
  "Go": "go",
  "Rust": "rust",
  "Swift": "swift",
  "Kotlin": "kotlin",
  "C++": "cpp",
  "C": "c",
  "Node.js": "javascript",
  "React": "javascript",
  "Angular": "typescript",
  "Vue.js": "javascript",
  "Django": "python",
  "Flask": "python",
  "Express": "javascript",
  // Default to typescript for others
  "default": "typescript"
};

interface CodeEditorProps {
  code: string;
  language: string;
  title?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onSave?: () => void;
}

export default function CodeEditor({ 
  code,
  language,
  title = "",
  readOnly = false,
  onChange,
  onSave
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editorValue, setEditorValue] = useState(code);
  
  // Map the specified language to Monaco's supported languages
  const getMonacoLanguage = (lang: string): string => {
    return LANGUAGE_MAP[lang] || LANGUAGE_MAP.default;
  };

  // Initialize Monaco editor
  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      const editor = monaco.editor.create(editorRef.current, {
        value: code,
        language: getMonacoLanguage(language),
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        readOnly,
        lineNumbers: 'on',
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        }
      });

      editor.onDidChangeModelContent(() => {
        const value = editor.getValue();
        setEditorValue(value);
        onChange?.(value);
      });

      monacoEditorRef.current = editor;
      
      return () => {
        editor.dispose();
        monacoEditorRef.current = null;
      };
    }
  }, []);

  // Update editor when code or language changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      // Only update if the content actually changed (prevents cursor jumping)
      if (code !== editorValue) {
        monacoEditorRef.current.setValue(code);
        setEditorValue(code);
      }
      
      // Update language model if needed
      monaco.editor.setModelLanguage(
        monacoEditorRef.current.getModel()!,
        getMonacoLanguage(language)
      );
    }
  }, [code, language]);

  // Download code as file
  const downloadCode = () => {
    const blob = new Blob([editorValue], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'code'}.${getMonacoLanguage(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-100 border-b border-gray-200 p-3 flex justify-between items-center">
        <h3 className="font-medium">{title}</h3>
        <div className="flex space-x-2">
          {onSave && !readOnly && (
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" onClick={onSave}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" onClick={downloadCode}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-grow overflow-auto">
        <div ref={editorRef} className="h-full"></div>
      </div>
    </div>
  );
}
