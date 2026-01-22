import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, DollarSign, MessageSquare, PrinterIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardContent() {
  const { isSuperAdmin, isVendor } = useUserRole();
  const { user } = useAuth();

  // Fetch vendor ID if user is a vendor
  const { data: vendorData } = useQuery({
    queryKey: ['vendor-profile', user?.id],
    queryFn: async () => {
      if (!isVendor || !user?.id) return null;
      try {
        const profile = await apiService.profilesAPI.getById(user.id);
        if (profile?.vendor_id) {
          return { id: profile.vendor_id };
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        return null;
      }
    },
    enabled: isVendor && !!user?.id,
  });

  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', vendorData?.id],
    queryFn: async () => {
      const vendorId = vendorData?.id;
      
      try {
        // Clients count
        let clients = [];
        if (isVendor && vendorId) {
          clients = await apiService.clientsAPI.getByVendor(vendorId);
        } else {
          const response = await apiService.clientsAPI.getAll();
          clients = response.data || response || [];
        }
        const clientsCount = Array.isArray(clients) ? clients.length : 0;

        // Projects count (ongoing)
        let projects = [];
        if (isVendor && vendorId) {
          const response = await apiService.projectsAPI.getByVendor(vendorId);
          projects = response.data || response || [];
        } else {
          const response = await apiService.projectsAPI.getAll();
          projects = response.data || response || [];
        }
        const ongoingStatuses = ['draft', 'data_upload', 'design', 'proof_ready', 'approved', 'printing'];
        const projectsCount = projects.filter((p: any) => ongoingStatuses.includes(p.status)).length;
        const printOrdersCount = projects.filter((p: any) => ['printing', 'dispatched'].includes(p.status)).length;

        // Total amount from projects
        const totalPayments = projects.reduce((sum: number, p: any) => sum + (Number(p.total_amount) || 0), 0);

        // Complaints count (placeholder - no complaints endpoint yet)
        const complaintsCount = 0;

        return {
          clients: clientsCount,
          projects: projectsCount,
          payments: totalPayments,
          complaints: complaintsCount,
          printOrders: printOrdersCount,
        };
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return {
          clients: 0,
          projects: 0,
          payments: 0,
          complaints: 0,
          printOrders: 0,
        };
      }
    },
    enabled: !!vendorData?.id || !isVendor,
  });

  const statCards = [
    { title: 'Total Clients', value: stats?.clients || 0, icon: Users, color: 'text-primary' },
    { title: 'Ongoing Projects', value: stats?.projects || 0, icon: FolderKanban, color: 'text-success' },
    { title: 'Print Orders', value: stats?.printOrders || 0, icon: PrinterIcon, color: 'text-accent' },
    { title: 'Total Payments', value: `₹${stats?.payments.toLocaleString('en-IN') || 0}`, icon: DollarSign, color: 'text-warning' },
    { title: 'Open Complaints', value: stats?.complaints || 0, icon: MessageSquare, color: 'text-destructive' },
  ];

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-5 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No recent activity to display
          </p>
        </CardContent>
      </Card>
    </main>
  );
}