'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { projectSchema } from '@/types';
import { AllProjects } from './all-projects';
import { api } from '@/trpc/trpc-server/react';
import z from 'zod';

export type Project = {
  id: string;
  projectName: string;
  description: string | null;
  createdAt: Date;
};

interface CreateProjectProps {
  data: {
    projects: Project[];
    totalPages: number;
    totalProjects: number;
    page: number;
    limit: number;
  };
}

const CreateProject = ({ data }: CreateProjectProps) => {
  const [showForm, setShowForm] = useState(data.projects.length > 0);

  const { mutateAsync: createProjectMutation, isPending } = api.project.create.useMutation({
    onError: (error) => console.error('API error:', error),
  });

  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { projectName: '', description: '' },
  });

  async function onSubmit(values: z.infer<typeof projectSchema>) {
    await createProjectMutation({ ...values });
    toast.success('Project Created Successfully');
    form.reset();
  }

  return (
    <>
      {data.projects.length === 0 && !showForm && (
        <EmptyDemo onClickCreate={() => setShowForm(true)} />
      )}

      {showForm && (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="gap-0 py-5">
                <CardHeader />
                <CardContent>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Project Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Project Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-4 mt-6">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Always show table below form */}
          <div className="mt-8">
            <AllProjects
              allProject={data.projects}
              totalPages={data.totalPages}
              totalProjects={data.totalProjects}
              page={data.page}
              limit={data.limit}
            />
          </div>
        </>
      )}
    </>
  );
};

export default CreateProject;

function EmptyDemo({ onClickCreate }: { onClickCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-lg font-medium">No Projects Yet</p>
      <p className="text-muted-foreground text-center">
        You haven&apos;t created any projects yet. Get started by creating your first project.
      </p>
      <Button onClick={onClickCreate}>Create Project</Button>
    </div>
  );
}
