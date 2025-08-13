import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit, Trash2, Save, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const keyResultSchema = z.object({
  description: z.string().min(1, 'Key result description is required'),
  target: z.string().min(1, 'Target is required'),
  current: z.string().default('0'),
});

const okrSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  objective: z.string().min(1, 'Objective is required'),
  quarter: z.string().min(1, 'Quarter is required'),
  year: z.number().min(2020).max(2030),
  status: z.enum(['active', 'completed', 'archived']),
  progress: z.number().min(0).max(100),
  keyResults: z.array(keyResultSchema).min(1, 'At least one key result is required'),
});

type OKRFormData = z.infer<typeof okrSchema>;

interface OKR {
  id: string;
  title: string;
  description: string;
  objective: string;
  key_results: any;
  quarter: string;
  year: number;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

const OKRDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [okr, setOkr] = useState<OKR | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<OKRFormData>({
    resolver: zodResolver(okrSchema),
    defaultValues: {
      title: '',
      description: '',
      objective: '',
      quarter: '',
      year: new Date().getFullYear(),
      status: 'active',
      progress: 0,
      keyResults: [{ description: '', target: '', current: '0' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'keyResults',
  });

  useEffect(() => {
    if (id) {
      fetchOKR();
    }
  }, [id]);

  const fetchOKR = async () => {
    try {
      const { data, error } = await supabase
        .from('okrs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch OKR',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setOkr(data);
      
      // Populate form with existing data
      const keyResults = Array.isArray(data.key_results) ? data.key_results : [];
      form.reset({
        title: data.title,
        description: data.description || '',
        objective: data.objective,
        quarter: data.quarter,
        year: data.year,
        status: data.status as 'active' | 'completed' | 'archived',
        progress: data.progress,
        keyResults: keyResults.length > 0 ? keyResults : [{ description: '', target: '', current: '0' }],
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: OKRFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('okrs')
        .update({
          title: data.title,
          description: data.description,
          objective: data.objective,
          quarter: data.quarter,
          year: data.year,
          status: data.status,
          progress: data.progress,
          key_results: data.keyResults,
        })
        .eq('id', id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'OKR updated successfully!',
        });
        setIsEditing(false);
        fetchOKR(); // Refresh the data
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('okrs')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'OKR deleted successfully!',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!okr) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">OKR Not Found</h2>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{okr.title}</h1>
              <p className="text-muted-foreground mt-2">
                {okr.quarter} {okr.year}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={`${getStatusColor(okr.status)} text-white`}>
                {okr.status}
              </Badge>
              
              {!isEditing ? (
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the OKR
                          and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isSaving}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                      fetchOKR();
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!isEditing ? (
          <div className="space-y-6">
            {/* Progress Section */}
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{okr.progress}%</span>
                  </div>
                  <Progress value={okr.progress} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Objective Section */}
            <Card>
              <CardHeader>
                <CardTitle>Objective</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{okr.objective}</p>
                {okr.description && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">{okr.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Results Section */}
            <Card>
              <CardHeader>
                <CardTitle>Key Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.isArray(okr.key_results) && okr.key_results.map((kr: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Key Result {index + 1}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {kr.current} / {kr.target}
                        </span>
                      </div>
                      <p className="font-medium">{kr.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Edit OKR</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter OKR title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quarter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quarter</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select quarter" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Q1">Q1</SelectItem>
                                <SelectItem value="Q2">Q2</SelectItem>
                                <SelectItem value="Q3">Q3</SelectItem>
                                <SelectItem value="Q4">Q4</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2024"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="progress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Progress (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide additional context for this OKR"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objective</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What do you want to achieve?"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Key Results */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Key Results</h3>
                      <Button
                        type="button"
                        onClick={() => append({ description: '', target: '', current: '0' })}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Key Result
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="secondary">Key Result {index + 1}</Badge>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => remove(index)}
                              variant="outline"
                              size="sm"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-1">
                            <FormField
                              control={form.control}
                              name={`keyResults.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Key result description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`keyResults.${index}.target`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Target</FormLabel>
                                <FormControl>
                                  <Input placeholder="Target value" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`keyResults.${index}.current`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current</FormLabel>
                                <FormControl>
                                  <Input placeholder="Current value" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default OKRDetail;