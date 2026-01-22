import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Edit, Percent } from 'lucide-react';
import { toast } from 'sonner';

export default function Items() {
  const { user } = useAuth();
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState('0');

  // Get vendor ID from user
  const vendorId = user?.vendor_id || user?.id;

  // Get vendor products
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['vendor-items', vendorId],
    queryFn: async () => {
      try {
        if (!vendorId) return [];
        const result = await apiService.productsAPI.getByVendor(vendorId);
        return result.data || [];
      } catch (error) {
        console.error('Failed to fetch items:', error);
        toast.error('Failed to load items');
        return [];
      }
    },
    enabled: !!vendorId,
  });

  const handleDiscountClick = (product: any) => {
    setEditingProduct(product);
    setDiscountValue(product.discount || '0');
    setDiscountDialogOpen(true);
  };

  const handleSaveDiscount = async () => {
    try {
      if (!editingProduct) return;
      
      await apiService.productsAPI.update(editingProduct.id, {
        discount: parseFloat(discountValue) || 0,
      });
      
      toast.success('Discount updated successfully');
      setDiscountDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update discount');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 bg-background">
        <div className="text-muted-foreground">Loading items...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 bg-background">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Items</h1>
        <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Percent className="h-4 w-4 mr-2" />
              Manage Discount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Product Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {editingProduct && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Product: {editingProduct.product_name}</Label>
                  </div>
                  <div>
                    <Label>Discount (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <Button onClick={handleSaveDiscount} className="w-full">
                    Save Discount
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Product Code</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.product_code}</TableCell>
                  <TableCell>₹{parseFloat(item.price || 0).toFixed(2)}</TableCell>
                  <TableCell>₹{parseFloat(item.cost || 0).toFixed(2)}</TableCell>
                  <TableCell>{item.quantity_available}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category}</Badge>
                  </TableCell>
                  <TableCell>{item.discount || 0}%</TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDiscountClick(item)}
                    >
                      <Percent className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
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
