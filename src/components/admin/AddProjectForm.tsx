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

export function AddProjectForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    client_id: '',
    status: 'draft',
    start_date: '',
    end_date: '',
    budget: '',
    notes: '',
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-form', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log('❌ [AddProjectForm] No user ID available');
        return null;
      }
      
      try {
        console.log('🔍 [AddProjectForm] Starting vendor lookup for user:', user.id);
        
        // Get profile which contains vendor_id
        const profileResponse = await apiService.profilesAPI.getById(user.id);
        console.log('📦 [AddProjectForm] Profile response:', profileResponse);
        
        // Extract vendor_id from response
        const profileData = profileResponse?.data || profileResponse;
        const vendorId = profileData?.vendor_id;
        
        if (!vendorId) {
          console.error('❌ [AddProjectForm] No vendor_id found in profile:', profileData);
          throw new Error('No vendor_id found in profile');
        }
        
        console.log('✅ [AddProjectForm] Got vendor_id:', vendorId);
        return { id: vendorId };
      } catch (error) {
        console.error('❌ [AddProjectForm] Vendor lookup failed:', error.message);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-project', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) {
        console.log('⏸️  [AddProjectForm] Skipping clients query - no vendorData.id yet');
        return [];
      }
      try {
        console.log('🔍 [AddProjectForm] Fetching clients for vendor:', vendorData.id);
        const response = await apiService.clientsAPI.getByVendor(vendorData.id);
        console.log('📦 [AddProjectForm] Clients response:', response);
        
        // Handle response structure { success, data: [...] }
        const clientsList = response?.data || (Array.isArray(response) ? response : []);
        console.log('✅ [AddProjectForm] Processed clients:', clientsList);
        return clientsList;
      } catch (error) {
        console.error('❌ [AddProjectForm] Failed to fetch clients:', error.message);
        return [];
      }
    },
    enabled: !!vendorData?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (vendorLoading) {
      toast.error('Still loading vendor information, please wait...');
      console.warn('❌ [AddProjectForm] Form submitted while vendor is still loading');
      return;
    }
    
    if (!vendorData?.id) {
      toast.error('Vendor not found. Please check console for details.');
      console.error('❌ [AddProjectForm] No vendorData.id on submit');
      console.error('  vendorData:', vendorData);
      console.error('  user:', user);
      return;
    }
    
    if (!formData.project_name.trim()) {
      toast.error('Project name is required');
      console.warn('❌ [AddProjectForm] Project name is empty');
      return;
    }
    
    setLoading(true);

    try {
      const projectPayload = {
        project_name: formData.project_name.trim(),
        description: formData.description.trim() || null,
        vendor_id: vendorData.id,
        client_id: formData.client_id || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        notes: formData.notes.trim() || null,
      };
      
      console.log('📤 [AddProjectForm] Sending project creation payload:', projectPayload);
      const response = await apiService.projectsAPI.create(projectPayload);
      console.log('✅ [AddProjectForm] Project created successfully:', response);

      toast.success('Project created successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      setFormData({
        project_name: '',
        description: '',
        client_id: '',
        status: 'draft',
        start_date: '',
        end_date: '',
        budget: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('❌ [AddProjectForm] Project creation failed:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_name">Project Name *</Label>
            <Input
              id="project_name"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client (Optional)</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client (optional)" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(clients) && clients.length > 0 ? (
                  clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.institution || client.company || client.client_name}
                    </SelectItem>
                  ))
                ) : null}
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="data_upload">Data Upload</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="proof_ready">Proof Ready</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="printing">Printing</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.project_name.trim()}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
