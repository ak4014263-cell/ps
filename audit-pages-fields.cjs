const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('              📊 COMPREHENSIVE PAGE FIELDS AUDIT');
console.log('='.repeat(80) + '\n');

// Define expected field mappings for each entity
const expectedFields = {
  clients: {
    db: ['id', 'client_name', 'company', 'phone', 'email', 'address', 'city', 'state', 'postal_code', 'country', 'notes', 'vendor_id'],
    form: ['client_name', 'company', 'phone', 'email', 'address', 'city', 'state', 'postal_code', 'country', 'notes']
  },
  projects: {
    db: ['id', 'project_name', 'description', 'vendor_id', 'client_id', 'status', 'start_date', 'end_date', 'budget', 'notes'],
    form: ['project_name', 'description', 'client_id', 'status', 'start_date', 'end_date', 'budget', 'notes']
  },
  tasks: {
    db: ['id', 'task_name', 'description', 'project_id', 'status', 'priority', 'due_date', 'assigned_to'],
    form: ['task_name', 'description', 'project_id', 'status', 'priority', 'due_date']
  },
  templates: {
    db: ['id', 'template_name', 'description', 'vendor_id', 'template_type', 'template_data', 'is_active'],
    form: ['template_name', 'description', 'template_type', 'template_data']
  }
};

function checkPage(pageName, filePath) {
  console.log(`\n📄 ${pageName}`);
  console.log('-'.repeat(80));
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    return { status: 'NOT FOUND', issues: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Check 1: API Service import
  if (!content.includes('import') || (!content.includes('apiService') && !content.includes('apiClient'))) {
    issues.push('❌ No API service import found');
  } else {
    console.log('   ✅ API service imported');
  }

  // Check 2: React Query usage
  if (content.includes('useQuery')) {
    console.log('   ✅ Using React Query for data fetching');
  } else {
    console.log('   ⚠️  No React Query found');
  }

  // Check 3: Form handling
  if (content.includes('useState') && content.includes('formData')) {
    console.log('   ✅ Form state management present');
  } else if (!content.includes('useState') && pageName.includes('Form')) {
    issues.push('❌ Form component but no useState found');
  }

  // Check 4: No Supabase references (except stub)
  if (content.includes("from '@/integrations/supabase/client'")) {
    if (!content.includes('// stub')) {
      issues.push('⚠️  Potential Supabase import (not stub)');
    }
  }

  // Check 5: Submit handlers
  if (pageName.includes('Form')) {
    if (content.includes('handleSubmit') || content.includes('onSubmit')) {
      console.log('   ✅ Submit handler defined');
    } else {
      issues.push('❌ Form component missing submit handler');
    }
  }

  // Check 6: Error handling
  if (content.includes('try') && content.includes('catch')) {
    console.log('   ✅ Error handling with try-catch');
  } else if (pageName.includes('Form')) {
    console.log('   ⚠️  Consider adding error handling');
  }

  // Check 7: Loading states
  if (content.includes('isLoading') || content.includes('loading')) {
    console.log('   ✅ Loading state management');
  } else if (content.includes('useQuery')) {
    console.log('   ⚠️  useQuery without explicit loading check');
  }

  // Check 8: Toast notifications
  if (content.includes('toast')) {
    console.log('   ✅ Toast notifications');
  } else if (pageName.includes('Form')) {
    console.log('   ⚠️  Consider adding toast notifications');
  }

  if (issues.length === 0) {
    console.log('   ✅ All checks passed');
    return { status: 'PASS', issues: [] };
  } else {
    issues.forEach(issue => console.log(`   ${issue}`));
    return { status: 'ISSUES', issues: issues };
  }
}

// Check all pages
const basePath = path.join(__dirname, 'src/pages');
const pages = [
  { name: 'Auth.tsx', type: 'auth' },
  { name: 'Clients.tsx', type: 'list' },
  { name: 'Projects.tsx', type: 'list' },
  { name: 'ProjectTasks.tsx', type: 'list' },
  { name: 'Dashboard.tsx', type: 'dashboard' },
  { name: 'Products.tsx', type: 'list' },
  { name: 'Vendors.tsx', type: 'list' },
  { name: 'Staff.tsx', type: 'list' },
  { name: 'Settings.tsx', type: 'settings' }
];

console.log('\n🔍 PAGES ANALYSIS\n');
const pageResults = {};

pages.forEach(page => {
  const result = checkPage(page.name, path.join(basePath, page.name));
  pageResults[page.name] = result;
});

// Check forms
console.log('\n\n' + '='.repeat(80));
console.log('\n🔍 FORM COMPONENTS ANALYSIS\n');

const forms = [
  { name: 'AddClientForm.tsx', type: 'clients', fields: expectedFields.clients.form },
  { name: 'AddProjectForm.tsx', type: 'projects', fields: expectedFields.projects.form },
  { name: 'AddTaskForm.tsx', type: 'tasks', fields: expectedFields.tasks.form }
];

const formsPath = path.join(__dirname, 'src/components/admin');

forms.forEach(form => {
  console.log(`\n📋 ${form.name} (${form.type})`);
  console.log('-'.repeat(80));
  
  const filePath = path.join(formsPath, form.name);
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check API service
  if (content.includes('apiService')) {
    console.log('   ✅ Using apiService');
  }

  // Check form fields
  let foundFields = 0;
  form.fields.forEach(field => {
    if (content.includes(`formData.${field}`) || content.includes(`'${field}'`) || content.includes(`"${field}"`)) {
      foundFields++;
    }
  });

  console.log(`   ✅ Found ${foundFields}/${form.fields.length} expected fields`);
  
  // List form fields
  console.log(`   📝 Expected fields: ${form.fields.join(', ')}`);

  // Check submit handler
  if (content.includes('apiService') && content.includes('Create') || content.includes('.create')) {
    console.log('   ✅ Create API call present');
  }
});

// API Service Check
console.log('\n\n' + '='.repeat(80));
console.log('\n🔍 API SERVICE VERIFICATION\n');

const apiPath = path.join(__dirname, 'src/lib/api.ts');
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf-8');
  
  const hasExport = apiContent.includes('export const apiService');
  const hasClients = apiContent.includes('clientsAPI');
  const hasProjects = apiContent.includes('projectsAPI');
  const hasTasks = apiContent.includes('projectTasksAPI');
  const hasTemplates = apiContent.includes('templatesAPI');

  console.log('API Service (src/lib/api.ts)');
  console.log('-'.repeat(80));
  console.log(`   ${hasExport ? '✅' : '❌'} Main export: export const apiService`);
  console.log(`   ${hasClients ? '✅' : '❌'} clientsAPI module`);
  console.log(`   ${hasProjects ? '✅' : '❌'} projectsAPI module`);
  console.log(`   ${hasTasks ? '✅' : '❌'} projectTasksAPI module`);
  console.log(`   ${hasTemplates ? '✅' : '❌'} templatesAPI module`);

  // Check methods
  const methods = ['getAll', 'getById', 'create', 'update', 'delete'];
  let methodsFound = 0;
  methods.forEach(method => {
    if (apiContent.includes(method)) methodsFound++;
  });
  console.log(`   ✅ CRUD methods: ${methodsFound}/${methods.length}`);
}

// Backend Routes Check
console.log('\n\n' + '='.repeat(80));
console.log('\n🔍 BACKEND ROUTES VERIFICATION\n');

const backendPath = path.join(__dirname, 'backend/routes');
const routes = ['clients.js', 'projects.js', 'project-tasks.js', 'templates.js'];

console.log('Backend API Routes (backend/routes/)');
console.log('-'.repeat(80));

routes.forEach(route => {
  const routePath = path.join(backendPath, route);
  if (fs.existsSync(routePath)) {
    const content = fs.readFileSync(routePath, 'utf-8');
    const hasGet = content.includes("router.get");
    const hasPost = content.includes("router.post");
    const hasPut = content.includes("router.put");
    const hasDelete = content.includes("router.delete");
    
    console.log(`   ${route}`);
    console.log(`      ${hasGet ? '✅' : '❌'} GET    ${hasPost ? '✅' : '❌'} POST    ${hasPut ? '✅' : '❌'} PUT    ${hasDelete ? '✅' : '❌'} DELETE`);
  }
});

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('\n                          📊 AUDIT SUMMARY\n');

const passCount = Object.values(pageResults).filter(r => r.status === 'PASS').length;
const issueCount = Object.values(pageResults).filter(r => r.status === 'ISSUES').length;

console.log(`Pages Audited: ${Object.keys(pageResults).length}`);
console.log(`✅ Passing: ${passCount}`);
console.log(`⚠️  Issues: ${issueCount}`);

console.log('\n' + '='.repeat(80) + '\n');
