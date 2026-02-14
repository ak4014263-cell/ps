import mysql from 'mysql2/promise';
import fs from 'fs';

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'id_card'
        });

        const tables = ['profiles', 'user_credentials', 'user_roles', 'vendor_staff'];
        const result = {};
        for (const table of tables) {
            try {
                const [rows] = await conn.execute(`DESCRIBE ${table}`);
                result[table] = rows;
            } catch (err) {
                result[table] = { error: err.message };
            }
        }

        fs.writeFileSync('staff_tables.json', JSON.stringify(result, null, 2));
        await conn.end();
        console.log('Done');
    } catch (e) {
        console.error('✗ Connection Error:', e.message);
    }
})();
