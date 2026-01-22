async function test() {
  const API = 'http://localhost:5000/api';

  try {
    // Get vendor
    const vendorsRes = await fetch(`${API}/vendors`);
    const vendorsData = await vendorsRes.json();
    const vendorId = vendorsData.data[0]?.id;
    console.log('📦 Using vendor:', vendorId);

    // Create project
    console.log('\n🔨 Creating project...');
    const projectRes = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: 'Full Test Project',
        description: 'Testing complete flow',
        vendor_id: vendorId
      })
    });
    const projectData = await projectRes.json();
    console.log(`Status: ${projectRes.status}`);
    console.log('Response:', JSON.stringify(projectData, null, 2));

    if (!projectRes.ok) {
      console.log('\n❌ Project creation failed!');
      return;
    }

    const projectId = projectData.data?.id;
    console.log('✅ Project created:', projectId);

    // Create task
    console.log('\n🎯 Creating task...');
    const taskRes = await fetch(`${API}/project-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        task_name: 'Setup Test Task',
        status: 'pending',
        priority: 'medium'
      })
    });
    const taskData = await taskRes.json();
    console.log(`Status: ${taskRes.status}`);
    console.log('Response:', JSON.stringify(taskData, null, 2));

    if (!taskRes.ok) {
      console.log('\n❌ Task creation failed!');
      return;
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('Error:', error);
  }
}

test();
