import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'id_card'
});

const [columns] = await conn.execute('DESCRIBE projects');
console.log('Projects table columns:');
columns.forEach(col => {
  console.log(`  ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'nullable' : 'required'})`);
});

const [projects] = await conn.execute('SELECT * FROM projects LIMIT 1');
if (projects.length > 0) {
  console.log('\nSample project:');
  console.log(projects[0]);
} else {
  console.log('\nNo projects found in database');
}

await conn.end();
