import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, TrendingUp, PieChart, Download, Calendar, Building2 } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export function AdminReports() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [selectedVendor, setSelectedVendor] = useState<string>('all');

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-for-reports'],
    queryFn: async () => {
      const response = await apiService.vendorsAPI.getAll();
      return (response.data || response || []);
    },
  });

  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', dateRange, selectedVendor],
    queryFn: async () => {
      const params: any = {
        start: dateRange.start,
        end: dateRange.end
      };
      if (selectedVendor !== 'all') {
        params.vendor_id = selectedVendor;
      }
      return await apiService.reportsAPI.getSalesReport(params);
    },
  });

  const { data: profitReport, isLoading: profitLoading } = useQuery({
    queryKey: ['profit-report', dateRange, selectedVendor],
    queryFn: async () => {
      const params: any = {
        start: dateRange.start,
        end: dateRange.end
      };
      if (selectedVendor !== 'all') {
        params.vendor_id = selectedVendor;
      }
      return await apiService.reportsAPI.getProfitReport(params);
    },
  });

  const handleExport = (type: string) => {
    // TODO: Implement actual export functionality
    console.log(`Exporting ${type} report...`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">
            <BarChart className="h-4 w-4 mr-2" />
            Sales Report
          </TabsTrigger>
          <TabsTrigger value="profit">
            <TrendingUp className="h-4 w-4 mr-2" />
            Profit Report
          </TabsTrigger>
          <TabsTrigger value="vendor">
            <Building2 className="h-4 w-4 mr-2" />
            Vendor Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">₹{(salesReport?.summary.totalSales || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Sales</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">₹{(salesReport?.summary.totalCollected || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Collected</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-500">₹{(salesReport?.summary.totalPending || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{salesReport?.summary.projectCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Projects</div>
                </CardContent>
              </Card>
            </div>

            {/* Collection Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{salesReport?.summary.collectionRate || 0}%</span>
                  </div>
                  <Progress value={salesReport?.summary.collectionRate || 0} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Vendor Breakdown */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Sales by Vendor</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport('sales')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Projects</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(salesReport?.byVendor || []).map((vendor: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell className="text-right">{vendor.projectCount}</TableCell>
                        <TableCell className="text-right">{vendor.quantity}</TableCell>
                        <TableCell className="text-right">₹{vendor.totalSales.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-500">₹{vendor.totalCollected.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-orange-500">
                          ₹{(vendor.totalSales - vendor.totalCollected).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profit">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">₹{(profitReport?.summary.totalRevenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-500">₹{(profitReport?.summary.totalCommission || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Commission</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">₹{(profitReport?.summary.netRevenue || 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Net Revenue</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{profitReport?.summary.transactionCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                </CardContent>
              </Card>
            </div>

            {/* Profit by Vendor */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Revenue by Vendor</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleExport('profit')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Commission %</TableHead>
                      <TableHead className="text-right">Commission Amt</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(profitReport?.byVendor || []).map((vendor: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell className="text-right">{vendor.transactionCount}</TableCell>
                        <TableCell className="text-right">₹{vendor.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{vendor.commission}%</TableCell>
                        <TableCell className="text-right text-orange-500">₹{vendor.commissionAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-500">
                          ₹{(vendor.revenue - vendor.commissionAmount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendor">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Summary</CardTitle>
              <CardDescription>Performance metrics for all vendors in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Projects</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Collection Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(salesReport?.byVendor || []).map((vendor: any, index: number) => {
                    const collectionRate = vendor.totalSales > 0
                      ? Math.round((vendor.totalCollected / vendor.totalSales) * 100)
                      : 0;
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell className="text-right">{vendor.projectCount}</TableCell>
                        <TableCell className="text-right">{vendor.quantity}</TableCell>
                        <TableCell className="text-right">₹{vendor.totalSales.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={collectionRate} className="w-20 h-2" />
                            <span className="text-sm">{collectionRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={collectionRate >= 80 ? 'default' : collectionRate >= 50 ? 'secondary' : 'outline'}
                            className={collectionRate >= 80 ? 'bg-green-500' : ''}>
                            {collectionRate >= 80 ? 'Excellent' : collectionRate >= 50 ? 'Good' : 'Needs Attention'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
