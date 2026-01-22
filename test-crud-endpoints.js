import crypto from 'crypto';

async function testAllEndpoints() {
  const API = 'http://localhost:5000/api';
  
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TESTING ALL CRUD ENDPOINTS');
  console.log('='.repeat(70));

  try {
    // Get first vendor
    console.log('\n[1/10] Getting first vendor...');
    const vendorsRes = await fetch(`${API}/vendors`);
    const vendorsData = await vendorsRes.json();
    const vendorId = vendorsData.data[0]?.id;
    
    if (!vendorId) {
      console.log('❌ No vendor found');
      return;
    }
    console.log(`✅ Vendor: ${vendorId}`);

    // CREATE CLIENT
    console.log('\n[2/10] Creating client...');
    const clientRes = await fetch(`${API}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Test Client Inc',
        company: 'Test Corp',
        vendor_id: vendorId,
        email: 'test@example.com',
        phone: '9876543210',
        address: '123 Test St',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        country: 'TestCountry'
      })
    });
    const clientData = await clientRes.json();
    const clientId = clientData.data?.id;
    console.log(`${clientRes.ok ? '✅' : '❌'} Create client: ${clientRes.status}`);
    if (clientId) console.log(`   ID: ${clientId}`);

    // UPDATE CLIENT
    console.log('\n[3/10] Updating client...');
    const updateRes = await fetch(`${API}/clients/${clientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Updated Client' })
    });
    console.log(`${updateRes.ok ? '✅' : '❌'} Update client: ${updateRes.status}`);

    // GET CLIENT
    console.log('\n[4/10] Getting client...');
    const getRes = await fetch(`${API}/clients/${clientId}`);
    console.log(`${getRes.ok ? '✅' : '❌'} Get client: ${getRes.status}`);

    // CREATE PROJECT
    console.log('\n[5/10] Creating project...');
    const projectRes = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: 'Test Project',
        vendor_id: vendorId,
        client_id: clientId,
        status: 'draft'
      })
    });
    const projectData = await projectRes.json();
    const projectId = projectData.data?.id;
    console.log(`${projectRes.ok ? '✅' : '❌'} Create project: ${projectRes.status}`);
    if (projectId) console.log(`   ID: ${projectId}`);

    // UPDATE PROJECT
    console.log('\n[6/10] Updating project...');
    const updateProjRes = await fetch(`${API}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'design' })
    });
    console.log(`${updateProjRes.ok ? '✅' : '❌'} Update project: ${updateProjRes.status}`);

    // CREATE TASK
    console.log('\n[7/10] Creating project task...');
    const taskRes = await fetch(`${API}/project-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        task_name: 'Test Task',
        status: 'todo',
        priority: 'high'
      })
    });
    const taskData = await taskRes.json();
    const taskId = taskData.data?.id;
    console.log(`${taskRes.ok ? '✅' : '❌'} Create task: ${taskRes.status}`);
    if (taskId) console.log(`   ID: ${taskId}`);

    // UPDATE TASK
    console.log('\n[8/10] Updating task...');
    const updateTaskRes = await fetch(`${API}/project-tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in-progress' })
    });
    console.log(`${updateTaskRes.ok ? '✅' : '❌'} Update task: ${updateTaskRes.status}`);

    // CREATE TEMPLATE
    console.log('\n[9/10] Creating template...');
    const templateRes = await fetch(`${API}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_name: 'Test Template',
        vendor_id: vendorId,
        template_type: 'design'
      })
    });
    const templateData = await templateRes.json();
    const templateId = templateData.data?.id;
    console.log(`${templateRes.ok ? '✅' : '❌'} Create template: ${templateRes.status}`);
    if (templateId) console.log(`   ID: ${templateId}`);

    // GET ALL LISTS
    console.log('\n[10/10] Fetching all lists...');
    const clientsListRes = await fetch(`${API}/clients`);
    const projectsListRes = await fetch(`${API}/projects`);
    const tasksListRes = await fetch(`${API}/project-tasks`);
    const templatesListRes = await fetch(`${API}/templates`);

    const clientsList = await clientsListRes.json();
    const projectsList = await projectsListRes.json();
    const tasksList = await tasksListRes.json();
    const templatesList = await templatesListRes.json();

    console.log(`${clientsListRes.ok ? '✅' : '❌'} Clients: ${clientsList.count}`);
    console.log(`${projectsListRes.ok ? '✅' : '❌'} Projects: ${projectsList.count}`);
    console.log(`${tasksListRes.ok ? '✅' : '❌'} Tasks: ${tasksList.count}`);
    console.log(`${templatesListRes.ok ? '✅' : '❌'} Templates: ${templatesList.count}`);

    // DELETE OPERATIONS
    console.log('\n[Cleanup] Deleting test records...');
    if (taskId) {
      const deleteTaskRes = await fetch(`${API}/project-tasks/${taskId}`, {
        method: 'DELETE'
      });
      console.log(`${deleteTaskRes.ok ? '✅' : '❌'} Delete task: ${deleteTaskRes.status}`);
    }

    if (templateId) {
      const deleteTemplateRes = await fetch(`${API}/templates/${templateId}`, {
        method: 'DELETE'
      });
      console.log(`${deleteTemplateRes.ok ? '✅' : '❌'} Delete template: ${deleteTemplateRes.status}`);
    }

    if (projectId) {
      const deleteProjectRes = await fetch(`${API}/projects/${projectId}`, {
        method: 'DELETE'
      });
      console.log(`${deleteProjectRes.ok ? '✅' : '❌'} Delete project: ${deleteProjectRes.status}`);
    }

    if (clientId) {
      const deleteClientRes = await fetch(`${API}/clients/${clientId}`, {
        method: 'DELETE'
      });
      console.log(`${deleteClientRes.ok ? '✅' : '❌'} Delete client: ${deleteClientRes.status}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETE!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAllEndpoints();
