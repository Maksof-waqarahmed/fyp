'use client'
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/trpc/trpc-server/react';
import { projectSchema } from '@/schemas/project.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import z from 'zod';
import { AllProjects } from './all-projects';

export interface Project {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  projectName: string;
  description: string | null;
}

export interface ProjectsResponse {
  message: string;
  data: Project[];
  total: number;
  page: number;
  totalPages: number;
}
const CreateProject = ({ data, page, total, totalPages }: ProjectsResponse) => {
  const [showForm, setShowForm] = useState(data.length !== 0);
  const router = useRouter();

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
    router.refresh();
  }

  return (
    <>
      {data.length === 0 && !showForm && (
        <EmptyDemo onClickCreate={() => setShowForm(true)} />
      )}

      {showForm && (
        <>
          <div className='pb-4'>
            <h1 className="text-3xl font-bold tracking-tight">Create Project</h1>
            <p className="text-muted-foreground">
              Create a new project to start monitoring your websites and APIs for uptime, availability, and performance.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card className="gap-0 py-3 rounded-sm">
                <CardContent>
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-muted-foreground'>Name</FormLabel>
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
                          <FormLabel className='text-muted-foreground'>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Project Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex w-full gap-4 mt-4 justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Creating...' : 'Create Project'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>

          <div className="mt-8">
            <AllProjects
              allProject={data}
              totalPages={totalPages}
              totalProjects={total}
              page={page}
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
