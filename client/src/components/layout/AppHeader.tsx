import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Code, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { LANGUAGES, MIGRATION_TYPES, MigrationProjectFormData } from "@/types/migration";

const formSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  migrationType: z.enum([
    "Language Version Upgrade",
    "Framework Transition",
    "API Adaptation",
    "Architectural Shift",
    "Full Rewrite"
  ]),
  sourceLanguage: z.string().min(1, "Source language is required"),
  sourceVersion: z.string().optional(),
  targetLanguage: z.string().min(1, "Target language is required"),
  targetVersion: z.string().optional(),
});

export default function AppHeader() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<MigrationProjectFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      migrationType: "Framework Transition",
      sourceLanguage: "",
      sourceVersion: "",
      targetLanguage: "",
      targetVersion: "",
    },
  });

  async function onSubmit(values: MigrationProjectFormData) {
    try {
      await apiRequest("POST", "/api/projects", {
        ...values,
        createdAt: new Date().toISOString(),
        userId: 1, // Default user ID for demo
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({ title: "Success", description: "Project created successfully" });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to create project", 
        variant: "destructive" 
      });
    }
  }

  return (
    <header className="bg-primary-600 text-white shadow-md fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Code className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Intelligent Code Migration Assistant</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-primary-500 hover:bg-primary-400 text-white border-none">
                <Plus className="h-4 w-4 mr-1" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Migration Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter project name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="migrationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Migration Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select migration type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MIGRATION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sourceLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Language/Framework</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sourceVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Version</FormLabel>
                          <FormControl>
                            <Input placeholder="Version" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Language/Framework</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="targetVersion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Version</FormLabel>
                          <FormControl>
                            <Input placeholder="Version" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Project</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Button variant="ghost" className="rounded-full p-2">
            <Settings className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-primary-400 flex items-center justify-center text-sm font-medium">
              JD
            </div>
            <span className="hidden md:inline">John Doe</span>
          </div>
        </div>
      </div>
    </header>
  );
}
