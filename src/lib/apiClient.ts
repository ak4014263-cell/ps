// ============================================================================
// API CLIENT - Connect Frontend to Backend
// Usage: import { apiClient } from '@/lib/apiClient'
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// ============================================================================
// API CLIENT
// ============================================================================

export const apiClient = {
  // ========================================================================
  // PROFILES
  // ========================================================================
  
  profiles: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/profiles`);
      if (!response.ok) throw new Error('Failed to fetch profiles');
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/profiles/${id}`);
      if (!response.ok) throw new Error('Profile not found');
      return response.json();
    },

    search: async (email) => {
      const response = await fetch(`${API_BASE_URL}/profiles/search/${email}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },

  // ========================================================================
  // VENDORS
  // ========================================================================

  vendors: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/vendors`);
      if (!response.ok) throw new Error('Failed to fetch vendors');
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/vendors/${id}`);
      if (!response.ok) throw new Error('Vendor not found');
      return response.json();
    },

    getWithProducts: async (id) => {
      const response = await fetch(`${API_BASE_URL}/vendors/${id}/products`);
      if (!response.ok) throw new Error('Failed to fetch vendor products');
      return response.json();
    },

    search: async (name) => {
      const response = await fetch(`${API_BASE_URL}/vendors/search/${name}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },

  // ========================================================================
  // CLIENTS
  // ========================================================================

  clients: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/clients`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/clients/${id}`);
      if (!response.ok) throw new Error('Client not found');
      return response.json();
    },

    getByVendor: async (vendorId) => {
      const response = await fetch(`${API_BASE_URL}/clients/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor clients');
      return response.json();
    },

    search: async (name) => {
      const response = await fetch(`${API_BASE_URL}/clients/search/${name}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },

  // ========================================================================
  // PRODUCTS
  // ========================================================================

  products: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      return response.json();
    },

    getByVendor: async (vendorId) => {
      const response = await fetch(`${API_BASE_URL}/products/vendor/${vendorId}`);
      if (!response.ok) throw new Error('Failed to fetch vendor products');
      return response.json();
    },

    getByCategory: async (category) => {
      const response = await fetch(`${API_BASE_URL}/products/category/${category}`);
      if (!response.ok) throw new Error('Failed to fetch products by category');
      return response.json();
    },

    search: async (query) => {
      const response = await fetch(`${API_BASE_URL}/products/search/${query}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },

  // ========================================================================
  // PROJECTS
  // ========================================================================

  projects: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/projects`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },

    getById: async (id) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`);
      if (!response.ok) throw new Error('Project not found');
      return response.json();
    },

    getWithTasks: async (id) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch project tasks');
      return response.json();
    },

    getWithAssignments: async (id) => {
      const response = await fetch(`${API_BASE_URL}/projects/${id}/assignments`);
      if (!response.ok) throw new Error('Failed to fetch project assignments');
      return response.json();
    },

    search: async (query) => {
      const response = await fetch(`${API_BASE_URL}/projects/search/${query}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },

  // ========================================================================
  // HEALTH CHECK
  // ========================================================================

  health: {
    check: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.json();
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error.message,
        };
      }
    },
  },
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// In a React component:

import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';

export function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.vendors.getAll()
      .then((data) => {
        setVendors(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {vendors.map((vendor) => (
        <div key={vendor.id}>{vendor.business_name}</div>
      ))}
    </div>
  );
}
*/

export default apiClient;
