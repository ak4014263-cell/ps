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

  async getAll() {
    const response = await fetch(`${API_URL}/clients`);
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

  async getAll() {
    const response = await fetch(`${API_URL}/projects`);
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

  async getAll() {
    const response = await fetch(`${API_URL}/templates`);
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

  async getAll() {
    const response = await fetch(`${API_URL}/vendors`);
    if (!response.ok) throw new Error('Failed to fetch vendors');
    return response.json();
  },

  async getById(id) {
    const response = await fetch(`${API_URL}/vendors/${id}`);
    if (!response.ok) throw new Error('Failed to fetch vendor');
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

  async getByProject(projectId, options = {}) {
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

  async getByVendor(vendorId, options = {}) {
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

  async getMaxRecordNumber(projectId, options = {}) {
    const params = new URLSearchParams();
    if (options.vendor_id) params.append('vendor_id', options.vendor_id);
    
    const queryString = params.toString();
    const url = `${API_URL}/data-records/project/${projectId}/max-record-number${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch max record number');
    return response.json();
  },

  async getById(id, options = {}) {
    const params = new URLSearchParams();
    if (options.vendor_id) params.append('vendor_id', options.vendor_id);
    
    const queryString = params.toString();
    const url = `${API_URL}/data-records/${id}${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch data record');
    return response.json();
  }
};

// ============================================================================
// API SERVICE EXPORT
// ============================================================================

export const apiService = {
  clientsAPI,
  projectsAPI,
  projectTasksAPI,
  projectGroupsAPI,
  dataRecordsAPI,
  templatesAPI,
  vendorsAPI,
  productsAPI,
  profilesAPI,
  teacherLinksAPI,
  staffAPI,
};
