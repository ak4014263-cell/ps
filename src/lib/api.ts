/**
 * API Service - Handles all backend API calls
 * Replaces Supabase calls with backend REST API
 */

const API_URL = 'http://localhost:3001/api';

// ============================================================================
// CLIENTS API
// ============================================================================

export const clientsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create client');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update client');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete client');
    }
    return response.json();
  },

  async getAll(filters: { vendor_id?: string; keyword?: string; } = {}) {
    const params = new URLSearchParams();
    if (filters.vendor_id) params.append('vendor_id', filters.vendor_id);
    if (filters.keyword) params.append('keyword', filters.keyword);

    const queryString = params.toString();
    const response = await fetch(`${API_URL}/clients${queryString ? '?' + queryString : ''}`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/clients/${id}`);
    if (!response.ok) throw new Error('Failed to fetch client');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/clients/vendor/${vendorId}`);
    if (!response.ok) throw new Error('Failed to fetch vendor clients');
    return response.json();
  }
};

// ============================================================================
// PROJECTS API
// ============================================================================

export const projectsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }
    return response.json();
  },

  async getAll(filters: { vendor_id?: string; client_id?: string; status?: string; keyword?: string; } = {}) {
    const params = new URLSearchParams();
    if (filters.vendor_id) params.append('vendor_id', filters.vendor_id);
    if (filters.client_id) params.append('client_id', filters.client_id);
    if (filters.status) params.append('status', filters.status);
    if (filters.keyword) params.append('keyword', filters.keyword);

    const queryString = params.toString();
    const response = await fetch(`${API_URL}/projects${queryString ? '?' + queryString : ''}`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/projects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/projects?vendor_id=${encodeURIComponent(vendorId)}`);
    if (!response.ok) throw new Error('Failed to fetch vendor projects');
    return response.json();
  }
};

// ============================================================================
// PROJECT TASKS API
// ============================================================================

export const projectTasksAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/project-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create task');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/project-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update task');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/project-tasks/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete task');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/project-tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/project-tasks/${id}`);
    if (!response.ok) throw new Error('Failed to fetch task');
    return response.json();
  },

  async getByProject(projectId) {
    const response = await fetch(`${API_URL}/project-tasks/project/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project tasks');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/project-tasks?vendor_id=${encodeURIComponent(vendorId)}`);
    if (!response.ok) throw new Error('Failed to fetch vendor tasks');
    return response.json();
  }
};

// ============================================================================
// TEMPLATES API
// ============================================================================

export const templatesAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create template');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update template');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete template');
    }
    return response.json();
  },

  async getAll(params = {}) {
    const queryString = new URLSearchParams(params as any).toString();
    const url = `${API_URL}/templates${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/templates/${id}`);
    if (!response.ok) throw new Error('Failed to fetch template');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/templates/vendor/${vendorId}`);
    if (!response.ok) throw new Error('Failed to fetch vendor templates');
    return response.json();
  },

  async generatePDF(data: any) {
    const response = await fetch(`${API_URL}/templates/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate PDF');
    }
    return response.json();
  }
};

// ============================================================================
// PROJECT GROUPS API
// ============================================================================

export const projectGroupsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/project-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create group');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/project-groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update group');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/project-groups/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete group');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/project-groups`);
    if (!response.ok) throw new Error('Failed to fetch groups');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/project-groups/${id}`);
    if (!response.ok) throw new Error('Failed to fetch group');
    return response.json();
  },

  async getByProject(projectId) {
    const response = await fetch(`${API_URL}/project-groups?project_id=${encodeURIComponent(projectId)}`);
    if (!response.ok) throw new Error('Failed to fetch project groups');
    return response.json();
  }
};

// ============================================================================
// VENDORS API
// ============================================================================

export const vendorsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create vendor');
    return response.json();
  },

  async getAll(filters: { keyword?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    const queryString = params.toString();
    const response = await fetch(`${API_URL}/vendors${queryString ? '?' + queryString : ''}`);
    if (!response.ok) throw new Error('Failed to fetch vendors');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/vendors/${id}`);
    if (!response.ok) throw new Error('Failed to fetch vendor');
    return response.json();
  },

  async getByUserId(userId: string) {
    const response = await fetch(`${API_URL}/vendors/user/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch vendor by user ID');
    return response.json();
  },

  async getSubVendors(id) {
    const response = await fetch(`${API_URL}/vendors/${id}/sub-vendors`);
    if (!response.ok) throw new Error('Failed to fetch sub-vendors');
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update vendor');
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/vendors/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete vendor');
    return response.json();
  },

  async bulkUpdate(ids: string[], data: any) {
    const response = await fetch(`${API_URL}/vendors/bulk-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, data }),
    });
    if (!response.ok) throw new Error('Failed to bulk update vendors');
    return response.json();
  }
};

// ============================================================================
// PRODUCTS API
// ============================================================================

export const productsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/products/vendor/${vendorId}`);
    if (!response.ok) throw new Error('Failed to fetch vendor products');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/products/${id}`);
    if (!response.ok) throw new Error('Failed to fetch product');
    return response.json();
  },

  async bulkCreate(data: any[]) {
    const response = await fetch(`${API_URL}/products/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: data })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk create products');
    }
    return response.json();
  }
};

// ============================================================================
// PROFILES API
// ============================================================================

export const profilesAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create profile');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update profile');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/profiles/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete profile');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/profiles`);
    if (!response.ok) throw new Error('Failed to fetch profiles');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/profiles/${id}`);
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  }
};

// ============================================================================
// TEACHER LINKS API
// ============================================================================

export const teacherLinksAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/teacher-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create teacher link');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/teacher-links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update teacher link');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/teacher-links/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete teacher link');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/teacher-links`);
    if (!response.ok) throw new Error('Failed to fetch teacher links');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/teacher-links/${id}`);
    if (!response.ok) throw new Error('Failed to fetch teacher link');
    return response.json();
  },

  async getByToken(token) {
    const response = await fetch(`${API_URL}/teacher-links/token/${token}`);
    if (!response.ok) throw new Error('Failed to fetch teacher link');
    return response.json();
  },

  async getSubmissions(id) {
    const response = await fetch(`${API_URL}/teacher-links/${id}/submissions`);
    if (!response.ok) throw new Error('Failed to fetch submissions');
    return response.json();
  },

  async submitData(token, data) {
    const response = await fetch(`${API_URL}/teacher-links/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_data: data })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit data');
    }
    return response.json();
  }
};

// ============================================================================
// STAFF API
// ============================================================================

export const staffAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create staff');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update staff');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete staff');
    }
    return response.json();
  },

  async getAll() {
    const response = await fetch(`${API_URL}/staff`);
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/staff/${id}`);
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  },

  async getByVendor(vendorId) {
    const response = await fetch(`${API_URL}/staff/vendor/${vendorId}`);
    if (!response.ok) throw new Error('Failed to fetch vendor staff');
    return response.json();
  }
};

// ============================================================================
// DATA RECORDS API
// ============================================================================

export const dataRecordsAPI = {
  async create(data) {
    const response = await fetch(`${API_URL}/data-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create data record');
    }
    return response.json();
  },

  async createBatch(records) {
    const response = await fetch(`${API_URL}/data-records/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create data records');
    }
    return response.json();
  },

  async update(id, data) {
    const response = await fetch(`${API_URL}/data-records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update data record');
    }
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_URL}/data-records/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete data record');
    }
    return response.json();
  },

  async deleteBatch(ids: string[]) {
    const response = await fetch(`${API_URL}/data-records/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete data records');
    }
    return response.json();
  },

  async getByProject(projectId: string, options: any = {}) {
    const params = new URLSearchParams();
    if (options.group_id) params.append('group_id', options.group_id);
    if (options.vendor_id) params.append('vendor_id', options.vendor_id);
    if (options.order_by) params.append('order_by', options.order_by);
    if (options.order) params.append('order', options.order);
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));

    const queryString = params.toString();
    const url = `${API_URL}/data-records/project/${projectId}${queryString ? '?' + queryString : ''}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        let body = '';
        try { body = await response.text(); } catch (e) { /* ignore */ }
        throw new Error(`Failed to fetch data records: ${response.status} ${response.statusText} ${body}`);
      }
      return response.json();
    } catch (err) {
      throw new Error(`Failed to fetch data records from ${url}: ${err?.message || err}`);
    }
  },

  async getByVendor(vendorId: string, options: any = {}) {
    const params = new URLSearchParams();
    if (options.project_id) params.append('project_id', options.project_id);
    if (options.group_id) params.append('group_id', options.group_id);
    if (options.order_by) params.append('order_by', options.order_by);
    if (options.order) params.append('order', options.order);
    if (options.limit) params.append('limit', String(options.limit));
    if (options.offset) params.append('offset', String(options.offset));

    const queryString = params.toString();
    const url = `${API_URL}/data-records/vendor/${vendorId}${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch data records by vendor');
    return response.json();
  },

  async getMaxRecordNumber(projectId: string, options: any = {}) {
    const params = new URLSearchParams();
    if (options.vendor_id) params.append('vendor_id', options.vendor_id);

    const queryString = params.toString();
    const url = `${API_URL}/data-records/project/${projectId}/max-record-number${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch max record number');
    return response.json();
  },

  async getById(id: string, options: any = {}) {
    const params = new URLSearchParams();
    if (options.vendor_id) params.append('vendor_id', options.vendor_id);

    const queryString = params.toString();
    const url = `${API_URL}/data-records/${id}${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch data record');
    return response.json();
  }
};

export const libraryAPI = {
  async getFonts(vendorId) {
    const response = await fetch(`${API_URL}/library/fonts?vendor_id=${encodeURIComponent(vendorId)}`);
    if (!response.ok) throw new Error('Failed to fetch library fonts');
    return response.json();
  },

  async uploadFont(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('is_public', String(data.isPublic));
    formData.append('vendor_id', data.vendorId);

    const response = await fetch(`${API_URL}/library/fonts`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload font');
    return response.json();
  },

  async deleteFont(id) {
    const response = await fetch(`${API_URL}/library/fonts/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete font');
    return response.json();
  },

  async getShapes(vendorId) {
    const response = await fetch(`${API_URL}/library/shapes?vendor_id=${encodeURIComponent(vendorId)}`);
    if (!response.ok) throw new Error('Failed to fetch library shapes');
    return response.json();
  },

  async uploadShape(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('is_public', String(data.isPublic));
    formData.append('vendor_id', data.vendorId);

    const response = await fetch(`${API_URL}/library/shapes`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload shape');
    return response.json();
  },

  async deleteShape(id) {
    const response = await fetch(`${API_URL}/library/shapes/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete shape');
    return response.json();
  },

  async getIcons(vendorId) {
    const response = await fetch(`${API_URL}/library/icons?vendor_id=${encodeURIComponent(vendorId)}`);
    if (!response.ok) throw new Error('Failed to fetch library icons');
    return response.json();
  },

  async uploadIcon(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('name', data.name);
    formData.append('is_public', String(data.isPublic));
    formData.append('vendor_id', data.vendorId);

    const response = await fetch(`${API_URL}/library/icons`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload icon');
    return response.json();
  },

  async deleteIcon(id) {
    const response = await fetch(`${API_URL}/library/icons/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete icon');
    return response.json();
  }
};

export const imageAPI = {
  async uploadProjectPhoto(data: { file: Blob | File, projectId: string, fileName?: string }) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('projectId', data.projectId);
    if (data.fileName) formData.append('fileName', data.fileName);

    const response = await fetch(`${API_URL}/image/upload-project-photo`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload project photo');
    }

    return response.json();
  }
};

// ============================================================================
// REPORTS API
// ============================================================================

export const reportsAPI = {
  async getSalesReport(params: { start: string, end: string, vendor_id?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_URL}/reports/sales?${query}`);
    if (!response.ok) throw new Error('Failed to fetch sales report');
    return response.json();
  },

  async getProfitReport(params: { start: string, end: string, vendor_id?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_URL}/reports/profit?${query}`);
    if (!response.ok) throw new Error('Failed to fetch profit report');
    return response.json();
  },

  async getRecentActivity() {
    const response = await fetch(`${API_URL}/reports/activity`);
    if (!response.ok) throw new Error('Failed to fetch recent activity');
    return response.json();
  }
};

// ============================================================================
// COMPLAINTS API
// ============================================================================

export const complaintsAPI = {
  async create(data: any) {
    const response = await fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create complaint');
    }
    return response.json();
  },

  async getAll(params = {}) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${API_URL}/complaints?${query}`);
    if (!response.ok) throw new Error('Failed to fetch complaints');
    return response.json();
  },

  async updateStatus(id: string, data: any) {
    const response = await fetch(`${API_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update complaint');
    }
    return response.json();
  }
};

// ============================================================================
// PROJECT FILES API
// ============================================================================

export const projectFilesAPI = {
  async getByProject(projectId: string) {
    const response = await fetch(`${API_URL}/project-files/project/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch project files');
    return response.json();
  },

  async create(data: any) {
    const response = await fetch(`${API_URL}/project-files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add file metadata');
    }
    return response.json();
  },

  async delete(id: string) {
    const response = await fetch(`${API_URL}/project-files/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file metadata');
    }
    return response.json();
  }
};

// ============================================================================
// MAIN API SERVICE
// ============================================================================

export const apiService = {
  clientsAPI,
  projectsAPI,
  projectTasksAPI,
  projectGroupsAPI,
  dataRecordsAPI,
  reportsAPI,
  templatesAPI: {
    ...templatesAPI,
    async generatePDF(payload) {
      const response = await fetch(`${API_URL}/templates/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate PDF');
      }
      return response.json();
    }
  },
  vendorsAPI,
  productsAPI,
  profilesAPI,
  teacherLinksAPI,
  staffAPI,
  libraryAPI,
  imageAPI,
  complaintsAPI,
  projectFilesAPI,
};
