import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
// Supabase disconnected - using XAMPP MySQL
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const statusOptions = [
  'All',
  'DRAFT',
  'SENT_TO_PRINT',
  'VERIFIED',
  'READY_TO_PRINT',
  'REJECTED',
  'PRINTING_ACCEPTED',
  'PRINTING',
  'PRINTING_COMPLETED',
  'READY_TO_DISPATCH',
  'DISPATCHED',
];

import { projectsAPI, clientsAPI } from '@/lib/api';

export default function PrintOrders() {
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['print-orders', keyword, clientFilter, statusFilter],
    queryFn: async () => {
      const response = await projectsAPI.getAll({
        keyword,
        client_id: clientFilter,
        status: statusFilter === 'All' ? undefined : statusFilter
      });
      return response.data || [];
    },
  });

  const projects = projectsData || [];

  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const response = await clientsAPI.getAll();
      return response.data || [];
    },
  });

  const clients = clientsData || [];

  // Frontend filtering is now mostly handled by the backend, 
  // but we keep the variable for consistency with the rest of the component
  const filteredProjects = projects;

  const handleReset = () => {
    setKeyword('');
    setTypeFilter('All');
    setClientFilter('');
    setStatusFilter('All');
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Print Orders</h1>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Keyword search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Client</label>
            <Input
              placeholder="search client"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleReset}>
            Reset all
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>File Types</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project, index) => (
                <TableRow key={project.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{project.project_name || project.name}</TableCell>
                  <TableCell>
                    {project.client?.institution_name || project.client?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {project.product?.category || '-'}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium uppercase">
                      {project.status?.replace(/_/g, ' ')}
                    </span>
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
