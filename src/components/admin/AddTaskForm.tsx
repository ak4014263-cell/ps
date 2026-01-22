import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function AddTaskForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    project_id: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        console.log('Starting vendor lookup...');
        
        // Try to get vendor from user object first (if user is a vendor)
        if (user?.vendor?.id) {
          console.log('✅ Got vendor from user object:', user.vendor.id);
          return { id: user.vendor.id, ...user.vendor };
        }

        // Try to get from profile
        console.log('Fetching profile for user:', user.id);
        const profile = await apiService.profilesAPI.getById(user.id);
        console.log('Profile fetched:', profile);
        
        if (profile?.vendor_id) {
          console.log('✅ Got vendor from profile:', profile.vendor_id);
          return { id: profile.vendor_id, ...profile };
        }

        // Last resort: get all vendors and use the first one (for testing/development)
        console.log('Fetching all vendors...');
        const allVendors = await apiService.vendorsAPI.getAll();
        console.log('All vendors response:', allVendors);
        
        if (allVendors && Array.isArray(allVendors) && allVendors.length > 0) {
          console.log('✅ Using first available vendor:', allVendors[0].id);
          return { id: allVendors[0].id, ...allVendors[0] };
        }

        if (allVendors?.data && Array.isArray(allVendors.data) && allVendors.data.length > 0) {
          console.log('✅ Using first available vendor (from data):', allVendors.data[0].id);
          return { id: allVendors.data[0].id, ...allVendors.data[0] };
        }

        console.error('❌ No vendors found in database');
        console.error('Vendor response structure:', allVendors);
        return null;
      } catch (error) {
        console.error('❌ Failed to fetch vendor:', error);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-dropdown', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) return [];
      try {
        // Fetch only vendor's projects
        const response = await apiService.projectsAPI.getByVendor(vendorData.id);
        return response.data || response || [];
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        return [];
      }
    },
    enabled: open && !!vendorData?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (vendorLoading) {
      toast.error('Still loading vendor information, please wait...');
      return;
    }
    
    if (!vendorData?.id) {
      toast.error('Vendor not found. Please check console for details.');
      console.error('vendorData:', vendorData);
      console.error('user:', user);
      return;
    }
    setLoading(true);

    try {
      await apiService.projectTasksAPI.create({
        task_name: formData.task_name.trim(),
        description: formData.description.trim() || null,
        project_id: formData.project_id,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        vendor_id: vendorData.id, // Include vendor_id for backend validation
      });

      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      setOpen(false);
      setFormData({
        task_name: '',
        description: '',
        project_id: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">New Task</span>
          <span className="sm:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task_name">Task Name *</Label>
            <Input
              id="task_name"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.project_id || !formData.task_name}>
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
