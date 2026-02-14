import { useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export function AddClientForm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    notes: '',
    balance: '',
    credit_limit: '',
    institution: '',
    contact: '',
    company_logo: null as File | null,
    signature_logo: null as File | null,
  });
  const [logoPreview, setLogoPreview] = useState({
    company_logo: '',
    signature_logo: '',
  });

  const { data: vendorData, isLoading: vendorLoading } = useQuery({
    queryKey: ['vendor', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const response = await apiService.profilesAPI.getById(user.id);
        const profile = response.data || response;

        const vendorId = profile?.vendor_id ||
          (typeof user?.vendor === 'object' ? user.vendor.id : user?.vendor) ||
          'default-vendor';

        return {
          ...profile,
          id: vendorId
        };
      } catch (error) {
        console.error('Failed to fetch vendor:', error);
        return {
          id: (typeof user?.vendor === 'object' ? user.vendor.id : user?.vendor) || 'default-vendor'
        };
      }
    },
    enabled: !!user?.id,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (vendorLoading) {
      toast.error('Still loading vendor information, please wait...');
      return;
    }

    if (!vendorData?.id) {
      toast.error('Vendor not found. Please check console for details.');
      console.error('vendorData:', vendorData);
      console.error('user:', user);
      return;
    }
    setLoading(true);

    try {
      const submitData = {
        client_name: formData.client_name.trim(),
        company: formData.company.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        postal_code: formData.postal_code.trim() || null,
        country: formData.country.trim() || null,
        notes: formData.notes.trim() || null,
        balance: formData.balance ? parseFloat(formData.balance) : 0,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        institution: formData.institution.trim() || null,
        contact: formData.contact.trim() || null,
        company_logo: logoPreview.company_logo || null,
        signature_logo: logoPreview.signature_logo || null,
        vendor_id: vendorData.id,
      };

      await apiService.clientsAPI.create(submitData);

      toast.success('Client added successfully');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      setFormData({
        client_name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        notes: '',
        balance: '',
        credit_limit: '',
        institution: '',
        contact: '',
        company_logo: null,
        signature_logo: null,
      });
      setLogoPreview({
        company_logo: '',
        signature_logo: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (field: 'company_logo' | 'signature_logo', file: File | null) => {
    if (file) {
      setFormData({ ...formData, [field]: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview({ ...logoPreview, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, [field]: null });
      setLogoPreview({ ...logoPreview, [field]: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Add Client</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client Name *</Label>
            <Input
              id="client_name"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="e.g., ABC Company"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                placeholder="e.g., School/College Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="e.g., Contact Person"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <Input
                id="credit_limit"
                type="number"
                step="0.01"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_logo">Company Logo</Label>
            <Input
              id="company_logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('company_logo', e.target.files?.[0] || null)}
            />
            {logoPreview.company_logo && (
              <img src={logoPreview.company_logo} alt="Company Logo Preview" className="h-20 object-contain mt-2" />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature_logo">Signature Logo</Label>
            <Input
              id="signature_logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange('signature_logo', e.target.files?.[0] || null)}
            />
            {logoPreview.signature_logo && (
              <img src={logoPreview.signature_logo} alt="Signature Logo Preview" className="h-20 object-contain mt-2" />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || vendorLoading}>
            {loading ? 'Adding...' : vendorLoading ? 'Loading vendor...' : 'Add Client'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
