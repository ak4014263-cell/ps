import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { AddTaskForm } from '@/components/admin/AddTaskForm';

export default function ProjectTasks() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Get vendor info
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const profile = await apiService.profilesAPI.getById(user.id);
        return {
          id: profile?.vendor_id || user?.vendor || 'default-vendor',
          ...profile
        };
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        return {
          id: user?.vendor || 'default-vendor'
        };
      }
    },
    enabled: !!user?.id,
  });

  // Get vendor projects first, then get all tasks and filter
  const { data: vendorProjects = [] } = useQuery({
    queryKey: ['projects-for-tasks', vendorData?.id],
    queryFn: async () => {
      try {
        if (vendorData?.id && vendorData.id !== 'default-vendor') {
          const result = await apiService.projectsAPI.getByVendor(vendorData.id);
          return result.data || [];
        }
        return [];
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
      }
    },
    enabled: !!vendorData?.id && vendorData.id !== 'default-vendor',
  });

  // Get all tasks and filter by vendor projects
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', vendorData?.id],
    queryFn: async () => {
      try {
        if (vendorData?.id && vendorData.id !== 'default-vendor') {
          // Use vendor-specific endpoint
          const result = await apiService.projectTasksAPI.getByVendor(vendorData.id);
          return result.data || [];
        } else {
          // Get all tasks for admin
          const result = await apiService.projectTasksAPI.getAll();
          return result.data || [];
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return [];
      }
    },
    enabled: !!vendorData?.id,
  });

  const filteredTasks = tasks.filter((task) =>
    searchQuery === '' ||
    (task.task_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 bg-background">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Project Tasks</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Track and manage project tasks</p>
        </div>
        <AddTaskForm />
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Project</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Due Date</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">
                    <div>{task.title}</div>
                    <div className="sm:hidden text-xs text-muted-foreground">{task.project?.name || '-'}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{task.project?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs uppercase">
                      {task.task_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.status === 'completed'
                          ? 'default'
                          : task.status === 'in_progress'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={`text-xs ${
                        task.status === 'completed'
                          ? 'bg-green-500 hover:bg-green-600'
                          : ''
                      }`}
                    >
                      {task.status?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {task.due_date
                      ? format(new Date(task.due_date), 'dd MMM')
                      : '-'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {format(new Date(task.created_at), 'dd MMM')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
