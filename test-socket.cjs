
const net = require('net');

const client = new net.Socket();
const port = 3306;
const host = '127.0.0.1';

console.log(`Connecting to ${host}:${port}...`);

client.setTimeout(5000);

client.connect(port, host, () => {
    console.log('Connected!');
    client.destroy();
});

client.on('error', (err) => {
    console.error('Connection error:', err.message);
    client.destroy();
});

client.on('timeout', () => {
    console.error('Connection timed out');
    client.destroy();
});
