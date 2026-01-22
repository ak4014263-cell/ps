import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Staff() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'vendor_staff',
  });

  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await apiService.profilesAPI.getById(user.id);
        const profile = response.data || response;
        // Profile should have vendor_id or we use user.vendor from auth
        return {
          id: profile?.vendor_id || user?.vendor_id || user?.vendor || 'default-vendor',
          ...profile
        };
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        // Return a default vendor object
        return {
          id: user?.vendor_id || user?.vendor || 'default-vendor'
        };
      }
    },
    enabled: !!user?.id,
  });

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['vendor-staff', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id || vendorData.id === 'default-vendor') return [];
      try {
        // Get staff for this vendor
        const result = await apiService.staffAPI.getByVendor(vendorData.id);
        return result.data || [];
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        return [];
      }
    },
    enabled: !!vendorData?.id && vendorData.id !== 'default-vendor',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!vendorData?.id || vendorData.id === 'default-vendor') {
        toast.error('Vendor not found - please log in again');
        return;
      }

      if (editingStaffId) {
        // Update staff member (phone only for now, name/email/role disabled)
        await apiService.staffAPI.update(editingStaffId, {
          phone: formData.phone || null,
        });
        toast.success('Staff member updated successfully');
      } else {
        // Create new staff member - need password
        const password = Math.random().toString(36).slice(-8); // Generate temp password
        const staffData = {
          fullName: formData.full_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          role: formData.role,
          vendorId: vendorData.id,
          password: password,
        };

        await apiService.staffAPI.create(staffData);
        toast.success(`Staff member created successfully. Password: ${password}`);
      }

      queryClient.invalidateQueries({ queryKey: ['vendor-staff'] });
      setOpen(false);
      setEditingStaffId(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: 'vendor_staff',
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (staff?: any) => {
    if (staff) {
      setEditingStaffId(staff.id);
      setFormData({
        full_name: staff.full_name || '',
        email: staff.email || '',
        phone: staff.phone || '',
        role: staff.role || 'vendor_staff',
      });
    } else {
      setEditingStaffId(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        role: 'vendor_staff',
      });
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingStaffId(null);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }
    
    try {
      await apiService.staffAPI.delete(staffId);
      toast.success('Staff member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['vendor-staff'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete staff');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Manage your staff members</p>
        </div>
        <Dialog open={open} onOpenChange={handleCloseDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStaffId ? 'Edit Staff Member' : 'Create Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  disabled={!!editingStaffId}
                />
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  disabled={!!editingStaffId}
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={!!editingStaffId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor_staff">Vendor Staff</SelectItem>
                    <SelectItem value="designer_staff">Designer Staff</SelectItem>
                    <SelectItem value="data_operator">Data Operator</SelectItem>
                    <SelectItem value="sales_person">Sales Person</SelectItem>
                    <SelectItem value="accounts_manager">Accounts Manager</SelectItem>
                    <SelectItem value="production_manager">Production Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !formData.full_name || !formData.email}>
                {loading ? 'Saving...' : editingStaffId ? 'Update Staff Member' : 'Create Staff Member'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No staff members found. Add your first staff member to get started.
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">
                    {staff.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{staff.email || 'N/A'}</TableCell>
                  <TableCell>{staff.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {staff.role?.replace(/_/g, ' ') || 'Staff'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500 hover:bg-green-600">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDialog(staff)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteStaff(staff.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
