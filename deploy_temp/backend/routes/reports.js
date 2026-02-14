import express from 'express';
import { getAll, getOne } from '../db.js';

const router = express.Router();

// ============================================================================
// SALES REPORT
// ============================================================================

router.get('/sales', async (req, res) => {
    try {
        const { start, end, vendor_id } = req.query;

        let sql = `
      SELECT 
        p.id, p.name, p.project_number, p.status, p.total_amount, p.paid_amount, p.quantity, p.created_at,
        v.id as vendor_id, v.business_name as vendor_name,
        c.institution_name as client_name,
        pr.name as product_name, pr.category as product_category
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN products pr ON p.product_id = pr.id
      WHERE p.created_at >= ? AND p.created_at <= ?
    `;

        const params = [start, end + ' 23:59:59'];

        if (vendor_id && vendor_id !== 'all') {
            sql += ' AND p.vendor_id = ?';
            params.push(vendor_id);
        }

        sql += ' ORDER BY p.created_at DESC';

        const projects = await getAll(sql, params);

        // Aggregations
        const totalSales = projects.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const totalCollected = projects.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        const totalQuantity = projects.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
        const totalPending = totalSales - totalCollected;

        // Group by vendor
        const byVendorMap = projects.reduce((acc, p) => {
            const vId = p.vendor_id || 'unknown';
            if (!acc[vId]) {
                acc[vId] = {
                    name: p.vendor_name || 'Unknown',
                    totalSales: 0,
                    totalCollected: 0,
                    projectCount: 0,
                    quantity: 0
                };
            }
            acc[vId].totalSales += Number(p.total_amount || 0);
            acc[vId].totalCollected += Number(p.paid_amount || 0);
            acc[vId].projectCount += 1;
            acc[vId].quantity += Number(p.quantity || 0);
            return acc;
        }, {});

        // Group by status
        const byStatus = projects.reduce((acc, p) => {
            const status = p.status || 'draft';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        res.json({
            projects,
            summary: {
                totalSales,
                totalCollected,
                totalPending,
                totalQuantity,
                projectCount: projects.length,
                collectionRate: totalSales > 0 ? Math.round((totalCollected / totalSales) * 100) : 0,
            },
            byVendor: Object.values(byVendorMap),
            byStatus
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// PROFIT REPORT
// ============================================================================

router.get('/profit', async (req, res) => {
    try {
        const { start, end, vendor_id } = req.query;

        let sql = `
      SELECT 
        p.id, p.amount, p.payment_method, p.created_at,
        v.id as vendor_id, v.business_name as vendor_name, v.commission_percentage
      FROM payments p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.created_at >= ? AND p.created_at <= ?
    `;

        const params = [start, end + ' 23:59:59'];

        if (vendor_id && vendor_id !== 'all') {
            sql += ' AND p.vendor_id = ?';
            params.push(vendor_id);
        }

        const payments = await getAll(sql, params);

        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const byVendorMap = payments.reduce((acc, p) => {
            const vId = p.vendor_id || 'unknown';
            const commission = p.commission_percentage || 0;
            if (!acc[vId]) {
                acc[vId] = {
                    name: p.vendor_name || 'Unknown',
                    revenue: 0,
                    commission,
                    commissionAmount: 0,
                    transactionCount: 0
                };
            }
            const amount = Number(p.amount || 0);
            acc[vId].revenue += amount;
            acc[vId].commissionAmount += (amount * commission) / 100;
            acc[vId].transactionCount += 1;
            return acc;
        }, {});

        const totalCommission = Object.values(byVendorMap).reduce((sum, v) => sum + v.commissionAmount, 0);

        res.json({
            payments,
            summary: {
                totalRevenue,
                totalCommission,
                netRevenue: totalRevenue - totalCommission,
                transactionCount: payments.length,
            },
            byVendor: Object.values(byVendorMap)
        });
    } catch (error) {
        console.error('Profit report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

router.get('/activity', async (req, res) => {
    try {
        const [projects, payments, complaints] = await Promise.all([
            getAll(`
        SELECT p.id, p.name, p.project_number, p.status, p.created_at, 
               c.name as client_name, c.institution_name as client_institution,
               v.business_name as vendor_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        ORDER BY p.created_at DESC LIMIT 5
      `),
            getAll(`
        SELECT p.id, p.amount, p.payment_method, p.created_at,
               cl.name as client_name, cl.institution_name as client_institution,
               v.business_name as vendor_name
        FROM payments p
        LEFT JOIN clients cl ON p.client_id = cl.id
        LEFT JOIN vendors v ON p.vendor_id = v.id
        ORDER BY p.created_at DESC LIMIT 5
      `),
            getAll(`
        SELECT c.id, c.title, c.status, c.priority, c.created_at,
               cl.name as client_name, cl.institution_name as client_institution,
               v.business_name as vendor_name
        FROM complaints c
        LEFT JOIN clients cl ON c.client_id = cl.id
        LEFT JOIN vendors v ON c.vendor_id = v.id
        ORDER BY c.created_at DESC LIMIT 5
      `)
        ]);

        const items = [];

        projects.forEach(p => items.push({
            id: p.id,
            type: 'project',
            title: `${p.project_number} - ${p.name}`,
            subtitle: `${p.vendor_name} → ${p.client_institution || p.client_name}`,
            status: p.status,
            created_at: p.created_at
        }));

        payments.forEach(p => items.push({
            id: p.id,
            type: 'payment',
            title: `₹${Number(p.amount).toLocaleString()} via ${p.payment_method}`,
            subtitle: `${p.vendor_name} from ${p.client_institution || p.client_name}`,
            amount: Number(p.amount),
            created_at: p.created_at
        }));

        complaints.forEach(c => items.push({
            id: c.id,
            type: 'complaint',
            title: c.title,
            subtitle: `${c.vendor_name} - ${cl?.client_institution || cl?.client_name}`,
            status: c.status,
            created_at: c.created_at
        }));

        // Re-calculating subtitle for complaints correctly
        complaints.forEach((c, idx) => {
            const complaintItem = items.find(i => i.id === c.id && i.type === 'complaint');
            if (complaintItem) {
                complaintItem.subtitle = `${c.vendor_name} - ${c.client_institution || c.client_name}`;
            }
        });

        const sorted = items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
        res.json(sorted);
    } catch (error) {
        console.error('Activity report error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
