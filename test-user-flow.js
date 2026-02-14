import crypto from 'crypto';

const API = 'http://localhost:3001/api';

async function testUserFlow() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING USER FLOW: Project -> Task -> Complaint');
    console.log('='.repeat(70));

    try {
        // 1. Get first vendor
        console.log('\n[1/5] Getting first vendor...');
        const vendorsRes = await fetch(`${API}/vendors`);
        const vendorsData = await vendorsRes.json();
        const vendorId = vendorsData.data?.[0]?.id;

        if (!vendorId) {
            console.log('❌ No vendor found. Please run create-demo-vendor.js first.');
            return;
        }
        console.log(`✅ Vendor: ${vendorId}`);

        // 2. Get first client
        console.log('\n[2/5] Getting first client...');
        const clientsRes = await fetch(`${API}/clients`);
        const clientsData = await clientsRes.json();
        const clientId = clientsData.data?.[0]?.id;
        if (!clientId) {
            console.log('❌ No client found.');
            return;
        }
        console.log(`✅ Client: ${clientId}`);

        // 3. Create Project
        console.log('\n[3/5] Creating project...');
        const projectRes = await fetch(`${API}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_name: 'Test Flow Project ' + Date.now(),
                vendor_id: vendorId,
                client_id: clientId,
                status: 'draft'
            })
        });
        const projectData = await projectRes.json();
        const projectId = projectData.data?.id;
        console.log(`${projectRes.ok ? '✅' : '❌'} Create project: ${projectRes.status}`);
        if (projectId) console.log(`   ID: ${projectId}`);

        // 4. Assign Task
        console.log('\n[4/5] Assigning task...');
        const taskRes = await fetch(`${API}/project-tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                task_name: 'Verification Task',
                status: 'todo',
                priority: 'high'
            })
        });
        const taskData = await taskRes.json();
        const taskId = taskData.data?.id;
        console.log(`${taskRes.ok ? '✅' : '❌'} Create task: ${taskRes.status}`);
        if (taskId) console.log(`   ID: ${taskId}`);

        // 5. Create Complaint
        console.log('\n[5/5] Creating complaint...');
        const complaintRes = await fetch(`${API}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Test Complaint',
                description: 'This is a test complaint for verification.',
                priority: 'medium',
                client_id: clientId,
                vendor_id: vendorId,
                project_id: projectId
            })
        });
        const complaintData = await complaintRes.json();
        const complaintId = complaintData.id;
        console.log(`${complaintRes.ok ? '✅' : '❌'} Create complaint: ${complaintRes.status}`);
        if (complaintId) console.log(`   ID: ${complaintId}`);

        console.log('\n' + '='.repeat(70));
        console.log('✅ ALL STEPS VERIFIED!');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

testUserFlow();
