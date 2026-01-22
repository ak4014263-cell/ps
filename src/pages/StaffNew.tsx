import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffPermissionsSelector } from '@/components/project/StaffPermissionsSelector';
import { 
  DEFAULT_VENDOR_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_STAFF_PERMISSIONS,
  ADMIN_STAFF_PERMISSIONS,
  VENDOR_STAFF_PERMISSIONS,
} from '@/lib/staffPermissions';
import { Plus, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

type StaffType = 'vendor' | 'admin';

export default function Staff() {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<StaffType>(isSuperAdmin ? 'admin' : 'vendor');
  const [open, setOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'vendor_staff',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Vendor Data Query
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Mock vendor data - TODO: Create GET /api/vendors/by-user endpoint
      return { id: '1', name: 'Main Vendor' };
    },
    enabled: !!user?.id && !isSuperAdmin,
  });

  // Vendor Staff Query
  const { data: vendorStaffMembers = [], isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor-staff-list', vendorData?.id],
    queryFn: async () => {
      if (!vendorData?.id) return [];
      
      // Mock data - TODO: Create GET /api/vendors/:id/staff endpoint
      return [];
    },
    enabled: !!vendorData?.id,
  });

  // Admin Staff Query
  const { data: adminStaffMembers = [], isLoading: adminLoading } = useQuery({
    queryKey: ['admin-staff-list', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSuperAdmin) return [];
      
      // Mock data - TODO: Create GET /api/admin/staff endpoint
      return [];
    },
    enabled: !!user?.id && isSuperAdmin,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Create POST /api/staff/create endpoint
      // For now, use mock implementation
      console.log('[STUB] Creating staff:', {
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        permissions: selectedPermissions,
        staffType: activeTab,
      });

      toast.success(`${activeTab === 'admin' ? 'Admin' : 'Vendor'} staff created successfully`);
      queryClient.invalidateQueries({
        queryKey: activeTab === 'admin' ? ['admin-staff-list'] : ['vendor-staff-list'],
      });
      
      setOpen(false);
      setEditingStaffId(null);
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: activeTab === 'admin' ? 'admin_staff' : 'vendor_staff',
      });
      setSelectedPermissions([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create staff');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (staff?: any) => {
    if (staff) {
      setEditingStaffId(staff.user_id || staff.staff_user_id);
      setFormData({
        email: staff.profile?.email || '',
        password: '',
        fullName: staff.profile?.full_name || '',
        phone: staff.profile?.phone || '',
        role: staff.role,
      });
      const defaultPerms = activeTab === 'admin' 
        ? DEFAULT_ADMIN_STAFF_PERMISSIONS[staff.role]
        : DEFAULT_VENDOR_STAFF_PERMISSIONS[staff.role];
      setSelectedPermissions(staff.permissions || defaultPerms || []);
    } else {
      setEditingStaffId(null);
      const defaultRole = activeTab === 'admin' ? 'admin_staff' : 'vendor_staff';
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        role: defaultRole,
      });
      const defaultPerms = activeTab === 'admin'
        ? DEFAULT_ADMIN_STAFF_PERMISSIONS[defaultRole]
        : DEFAULT_VENDOR_STAFF_PERMISSIONS[defaultRole];
      setSelectedPermissions(defaultPerms || []);
    }
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingStaffId(null);
  };

  const renderRoleOptions = () => {
    if (activeTab === 'admin') {
      return (
        <>
          <SelectItem value="admin_staff">Admin Staff</SelectItem>
          <SelectItem value="admin_manager">Admin Manager</SelectItem>
          <SelectItem value="admin_support">Admin Support</SelectItem>
        </>
      );
    } else {
      return (
        <>
          <SelectItem value="vendor_staff">Vendor Staff</SelectItem>
          <SelectItem value="designer_staff">Designer Staff</SelectItem>
          <SelectItem value="data_operator">Data Operator</SelectItem>
          <SelectItem value="sales_person">Sales Person</SelectItem>
          <SelectItem value="accounts_manager">Accounts Manager</SelectItem>
          <SelectItem value="production_manager">Production Manager</SelectItem>
        </>
      );
    }
  };

  const renderStaffTable = (staffMembers: any[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex-1 p-6 bg-background">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Sections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staffMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No {activeTab === 'admin' ? 'admin' : 'vendor'} staff members found. Add your first staff member to get started.
                </TableCell>
              </TableRow>
            ) : (
              staffMembers.map((staff) => (
                <TableRow key={staff.user_id || staff.staff_user_id}>
                  <TableCell className="font-medium">
                    {staff.profile?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{staff.profile?.email || 'N/A'}</TableCell>
                  <TableCell>{staff.profile?.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {staff.role.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {(staff.permissions || []).length} section(s)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={staff.active ? "bg-green-500 hover:bg-green-600" : "bg-muted"}>
                      {staff.active ? 'Active' : 'Inactive'}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // If not admin and not vendor, show message
  if (!isSuperAdmin && !vendorData) {
    return (
      <main className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
        <p className="text-muted-foreground">Manage your staff members and their permissions</p>
      </div>

      {/* Only show tabs if user is super admin */}
      {isSuperAdmin ? (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StaffType)} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-max grid-cols-2">
              <TabsTrigger value="admin">System Admin Staff</TabsTrigger>
              <TabsTrigger value="vendor">Vendor Staff</TabsTrigger>
            </TabsList>
            <Dialog open={open} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab === 'admin' ? 'Admin' : 'Vendor'} Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingStaffId ? 'Edit' : 'Create'} {activeTab === 'admin' ? 'Admin' : 'Vendor'} Staff Account
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        required
                        disabled={!!editingStaffId}
                      />
                    </div>
                  </div>

                  {!editingStaffId && (
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => {
                        setFormData({ ...formData, role: value });
                        const defaultPerms = activeTab === 'admin'
                          ? DEFAULT_ADMIN_STAFF_PERMISSIONS[value]
                          : DEFAULT_VENDOR_STAFF_PERMISSIONS[value];
                        setSelectedPermissions(defaultPerms || []);
                      }}
                      disabled={!!editingStaffId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {renderRoleOptions()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t pt-4">
                    <StaffPermissionsSelector
                      selectedPermissions={selectedPermissions}
                      onPermissionsChange={setSelectedPermissions}
                      role={formData.role}
                      showDefaults={true}
                      staffType={activeTab}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving...' : editingStaffId ? 'Update Staff Account' : 'Create Staff Account'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <TabsContent value="admin">
            {renderStaffTable(adminStaffMembers, adminLoading)}
          </TabsContent>

          <TabsContent value="vendor">
            {renderStaffTable(vendorStaffMembers, vendorLoading)}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <Dialog open={open} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingStaffId ? 'Edit' : 'Create'} Vendor Staff Account
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        required
                        disabled={!!editingStaffId}
                      />
                    </div>
                  </div>

                  {!editingStaffId && (
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => {
                        setFormData({ ...formData, role: value });
                        setSelectedPermissions(DEFAULT_VENDOR_STAFF_PERMISSIONS[value] || []);
                      }}
                      disabled={!!editingStaffId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {renderRoleOptions()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border-t pt-4">
                    <StaffPermissionsSelector
                      selectedPermissions={selectedPermissions}
                      onPermissionsChange={setSelectedPermissions}
                      role={formData.role}
                      showDefaults={true}
                      staffType="vendor"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving...' : editingStaffId ? 'Update Staff Account' : 'Create Staff Account'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {renderStaffTable(vendorStaffMembers, vendorLoading)}
        </div>
      )}
    </main>
  );
}
