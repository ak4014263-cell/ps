import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Building2,
  FolderOpen,
  CreditCard,
  AlertCircle,
  FileText,
  Package,
  TrendingUp,
  Printer,
  Clock,
  CheckCircle,
  Truck,
  RefreshCcw,
  GraduationCap,
  UserCog,
  Layers,
  DollarSign,
  Palette,
} from 'lucide-react';
import { RecentActivityFeed } from './RecentActivityFeed';

export function SuperAdminDashboard() {
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-dashboard-stats'],
    queryFn: async () => {
      try {
        // Fetch all data from API endpoints
        const [vendorsRes, clientsRes, projectsRes, productsRes, templatesRes] = await Promise.all([
          apiService.vendorsAPI.getAll().catch(() => ({ success: false, data: [] })),
          apiService.clientsAPI.getAll().catch(() => ({ success: false, data: [] })),
          apiService.projectsAPI.getAll().catch(() => ({ success: false, data: [] })),
          apiService.productsAPI.getAll().catch(() => ({ success: false, data: [] })),
          apiService.templatesAPI.getAll().catch(() => ({ success: false, data: [] })),
        ]);

        const vendors = vendorsRes.data || [];
        const clients = clientsRes.data || [];
        const projects = projectsRes.data || [];
        const products = productsRes.data || [];
        const templates = templatesRes.data || [];

        // Calculate basic stats
        const totalRevenue = 0; // Would need payment data
        const totalProjectValue = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const totalPaid = projects.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        const pendingAmount = totalProjectValue - totalPaid;
        const totalQuantity = projects.reduce((sum, p) => sum + Number(p.quantity_available || 0), 0);

        return {
          vendors: { total: vendors.length, active: vendors.length },
          clients: { total: clients.length, active: clients.length },
          projects: { 
            total: projects.length, 
            byStatus: {
              draft: 0,
              data_upload: 0,
              design: 0,
              proof_ready: 0,
              approved: 0,
              printing: 0,
              dispatched: 0,
              delivered: 0,
              cancelled: 0,
            }, 
            withoutTemplate: 0, 
            totalQuantity,
            subProjects: 0,
          },
          payments: { total: 0, revenue: totalRevenue },
          complaints: { total: 0, open: 0, highPriority: 0 },
          products: { total: products.length, active: products.length, categories: [] },
          templates: { total: templates.length, public: templates.length },
          tasks: { total: 0, pending: 0 },
          dataRecords: { total: 0, byStatus: { pending: 0, processing: 0, completed: 0, error: 0 } },
          transactions: { total: 0 },
          financial: { totalValue: totalProjectValue, paid: totalPaid, pending: pendingAmount, revenue: totalRevenue },
          idCardStats: {
            total: 0,
            inProcess: 0,
            readyForPrint: 0,
            printing: 0,
            printed: 0,
            pendingDelivery: 0,
            delivered: 0,
          },
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const primaryStats = [
    {
      title: 'Total Vendors',
      value: stats?.vendors.total || 0,
      subtitle: `${stats?.vendors.active || 0} active`,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Clients',
      value: stats?.clients.total || 0,
      subtitle: `Schools/Institutes`,
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Active Projects',
      value: stats?.projects.total || 0,
      subtitle: `${stats?.projects.totalQuantity || 0} total items`,
      icon: FolderOpen,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.financial.revenue || 0).toLocaleString()}`,
      subtitle: `${stats?.payments.total || 0} transactions`,
      icon: CreditCard,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  const secondaryStats = [
    {
      title: 'Pending Amount',
      value: `₹${(stats?.financial.pending || 0).toLocaleString()}`,
      subtitle: `of ₹${(stats?.financial.totalValue || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      title: 'Open Complaints',
      value: stats?.complaints.open || 0,
      subtitle: stats?.complaints.highPriority ? `${stats.complaints.highPriority} high priority` : 'None critical',
      icon: AlertCircle,
      color: stats?.complaints.highPriority ? 'text-red-500' : 'text-yellow-500',
    },
    {
      title: 'Pending Tasks',
      value: stats?.tasks.pending || 0,
      subtitle: `${stats?.tasks.total || 0} total`,
      icon: Clock,
      color: 'text-cyan-500',
    },
    {
      title: 'Without Templates',
      value: stats?.projects.withoutTemplate || 0,
      subtitle: 'Need design',
      icon: Palette,
      color: 'text-pink-500',
    },
  ];

  const projectStatusCards = [
    { label: 'Draft', value: stats?.projects.byStatus.draft || 0, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Data Upload', value: stats?.projects.byStatus.data_upload || 0, icon: Package, color: 'text-blue-500' },
    { label: 'Design', value: stats?.projects.byStatus.design || 0, icon: Palette, color: 'text-yellow-500' },
    { label: 'Proof Ready', value: stats?.projects.byStatus.proof_ready || 0, icon: CheckCircle, color: 'text-indigo-500' },
    { label: 'Approved', value: stats?.projects.byStatus.approved || 0, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Printing', value: stats?.projects.byStatus.printing || 0, icon: Printer, color: 'text-orange-500' },
    { label: 'Dispatched', value: stats?.projects.byStatus.dispatched || 0, icon: Truck, color: 'text-purple-500' },
    { label: 'Delivered', value: stats?.projects.byStatus.delivered || 0, icon: CheckCircle, color: 'text-emerald-500' },
  ];

  const collectionRate = stats?.financial.totalValue 
    ? Math.round((stats.financial.paid / stats.financial.totalValue) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time platform statistics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryStats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${stat.bgColor} opacity-50`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {secondaryStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product Processing Stats - ID Cards Example */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            ID Card Processing Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{stats?.idCardStats.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <div className="text-lg font-bold text-blue-600">{stats?.idCardStats.inProcess || 0}</div>
              <div className="text-xs text-muted-foreground">In Process</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-500/10">
              <div className="text-lg font-bold text-yellow-600">{stats?.idCardStats.readyForPrint || 0}</div>
              <div className="text-xs text-muted-foreground">Ready for Print</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-500/10">
              <div className="text-lg font-bold text-orange-600">{stats?.idCardStats.printing || 0}</div>
              <div className="text-xs text-muted-foreground">Printing</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/10">
              <div className="text-lg font-bold text-purple-600">{stats?.idCardStats.pendingDelivery || 0}</div>
              <div className="text-xs text-muted-foreground">Pending Delivery</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-500/10">
              <div className="text-lg font-bold text-green-600">{stats?.idCardStats.delivered || 0}</div>
              <div className="text-xs text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-500/10">
              <div className="text-lg font-bold text-red-600">{stats?.dataRecords.byStatus.error || 0}</div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Status Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {projectStatusCards.map((item) => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
                <div className="text-lg font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground truncate">{item.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Project Value</span>
              <span className="font-semibold">₹{(stats?.financial.totalValue || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount Received</span>
              <span className="font-semibold text-green-500">₹{(stats?.financial.paid || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending Amount</span>
              <span className="font-semibold text-orange-500">₹{(stats?.financial.pending || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">All Transactions</span>
              <Badge variant="outline">{stats?.transactions.total || 0}</Badge>
            </div>
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Collection Rate</span>
                <span className="font-semibold">{collectionRate}%</span>
              </div>
              <Progress value={collectionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Data Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="h-5 w-5 text-blue-500" />
              Data Processing Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Records</span>
              <Badge variant="outline">{stats?.dataRecords.total || 0}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <div className="text-lg font-bold text-yellow-600">{stats?.dataRecords.byStatus.pending || 0}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <div className="text-lg font-bold text-blue-600">{stats?.dataRecords.byStatus.processing || 0}</div>
                <div className="text-xs text-muted-foreground">Processing</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <div className="text-lg font-bold text-green-600">{stats?.dataRecords.byStatus.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <div className="text-lg font-bold text-red-600">{stats?.dataRecords.byStatus.error || 0}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products & Templates Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats?.products.total || 0}</span>
              <div className="flex gap-2">
                <Badge variant="outline">{stats?.products.active || 0} active</Badge>
                <Badge variant="secondary">{stats?.products.categories?.length || 0} categories</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-500" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats?.templates.total || 0}</span>
              <Badge variant="outline">{stats?.templates.public || 0} public</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <RecentActivityFeed />
    </div>
  );
}
