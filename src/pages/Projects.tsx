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
import { Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AddProjectForm } from '@/components/admin/AddProjectForm';

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Get vendor info
  const { data: vendorData } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await apiService.profilesAPI.getById(user.id);
        // Unwrap the response data
        const profile = response?.data || response;
        console.log('🔍 Profile response:', response);
        console.log('🔍 Unwrapped profile:', profile);
        console.log('🔍 Profile vendor_id:', profile?.vendor_id);

        // Make sure vendor_id is a string, not an object
        const vendorId = profile?.vendor_id ? String(profile.vendor_id) : (user?.vendor || 'default-vendor');
        console.log('🔍 Final vendor_id:', vendorId, '(type:', typeof vendorId, ')');

        return {
          ...profile,
          id: vendorId  // Set id AFTER spread to ensure it doesn't get overwritten
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

  // Get all projects and filter by vendor
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', vendorData?.id, searchQuery],
    queryFn: async () => {
      try {
        const vendorId = vendorData?.id && vendorData.id !== 'default-vendor' ? vendorData.id : undefined;
        const response = await apiService.projectsAPI.getAll({
          vendor_id: vendorId,
          keyword: searchQuery || undefined
        });
        return response?.data || [];
      } catch (error) {
        console.error('❌ Failed to fetch projects:', error);
        return [];
      }
    },
    enabled: !!vendorData?.id,
  });

  const projects = projectsData || [];
  const filteredProjects = projects;

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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your projects</p>
        </div>
        <AddProjectForm />
      </div>

      <div className="mb-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
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
              <TableHead>ID</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="hidden lg:table-cell">End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project: any) => (
                <TableRow
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <TableCell className="font-mono text-xs sm:text-sm">{project.id?.substring(0, 8) || '-'}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {project.project_name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground hidden sm:block" />
                    </div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {project.description?.substring(0, 40) || 'No description'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs">{project.description?.substring(0, 40) || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {project.status?.replace(/_/g, ' ') || 'draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      Not set
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{Number(project.budget || 0).toFixed(0)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {project.end_date
                      ? format(new Date(project.end_date), 'dd MMM')
                      : '-'}
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
