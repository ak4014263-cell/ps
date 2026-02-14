import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderOpen, CreditCard, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

type ActivityItem = {
  id: string;
  type: 'project' | 'payment' | 'complaint';
  title: string;
  subtitle: string;
  status?: string;
  amount?: number;
  created_at: string;
};

export function RecentActivityFeed() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      return await apiService.reportsAPI.getRecentActivity();
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderOpen className="h-4 w-4 text-purple-500" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'complaint':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'project':
        return <Badge variant="outline" className="text-purple-500 border-purple-500">Project</Badge>;
      case 'payment':
        return <Badge variant="outline" className="text-green-500 border-green-500">Payment</Badge>;
      case 'complaint':
        return <Badge variant="outline" className="text-red-500 border-red-500">Complaint</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                <div className="mt-1 p-2 bg-muted rounded-lg">
                  {getIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    {getTypeBadge(activity.type)}
                    {activity.status && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
