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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

export default function AdminStaff() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // Get all vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const result = await apiService.vendorsAPI.getAll();
      return result.data || [];
    },
  });

  // Get all staff
  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['admin-staff', vendorFilter],
    queryFn: async () => {
      try {
        const response = await apiService.staffAPI.getAll();
        let allStaff = response.data || response || [];
        
        // Filter by vendor if needed
        if (vendorFilter !== 'all') {
          allStaff = allStaff.filter((s: any) => s.vendor_id === vendorFilter);
        }
        
        return allStaff;
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        return [];
      }
    },
  });

  const filteredStaff = staffMembers.filter((staff) =>
    searchQuery === '' ||
    (staff.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (staff.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-destructive font-semibold">Access Denied: Admin only</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Staff Members</h1>
        <p className="text-muted-foreground text-sm sm:text-base">View staff across all vendors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by vendor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors.map((vendor: any) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {vendor.business_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => {
                const vendor = vendors.find((v: any) => v.id === staff.vendor_id);
                return (
                  <TableRow key={staff.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div>{staff.full_name || 'N/A'}</div>
                      <div className="sm:hidden text-xs text-muted-foreground">{staff.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{vendor?.business_name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{staff.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{staff.phone || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {staff.role?.replace(/_/g, ' ') || 'Staff'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
