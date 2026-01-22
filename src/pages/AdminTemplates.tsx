import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
import { format } from 'date-fns';

export default function AdminTemplates() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Get all templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['admin-templates', vendorFilter],
    queryFn: async () => {
      try {
        const response = await apiService.templatesAPI.getAll();
        let allTemplates = response.data || response || [];
        
        // Filter by vendor if needed
        if (vendorFilter !== 'all') {
          allTemplates = allTemplates.filter((t: any) => t.vendor_id === vendorFilter);
        }
        
        return allTemplates;
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }
    },
  });

  const filteredTemplates = templates.filter((template) =>
    searchQuery === '' ||
    (template.template_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.category || '').toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Templates</h1>
        <p className="text-muted-foreground text-sm sm:text-base">View templates across all vendors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
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
              <TableHead>Template Name</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Dimensions</TableHead>
              <TableHead className="hidden lg:table-cell">Created</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => {
                const vendor = vendors.find((v: any) => v.id === template.vendor_id);
                return (
                  <TableRow 
                    key={template.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/templates/${template.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div>{template.template_name || 'Untitled'}</div>
                      <div className="md:hidden text-xs text-muted-foreground">{template.category}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{vendor?.business_name || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{template.category || 'General'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">
                      {template.width_mm || '-'} × {template.height_mm || '-'} mm
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {template.created_at ? format(new Date(template.created_at), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-500 hover:bg-blue-600">Active</Badge>
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
