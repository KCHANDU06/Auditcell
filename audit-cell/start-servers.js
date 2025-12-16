const { exec } = require('child_process');
const path = require('path');

// Start backend server
const backendServer = exec('node server.js', {
    cwd: __dirname
});

backendServer.stdout.on('data', (data) => {
    console.log('Backend:', data);
});

backendServer.stderr.on('data', (data) => {
    console.error('Backend Error:', data);
});

// Start frontend server using http-server
const frontendPath = path.join(__dirname, '..', 'front');
const frontendServer = exec('npx http-server -p 8080 --cors', {
    cwd: frontendPath
});

frontendServer.stdout.on('data', (data) => {
    console.log('Frontend:', data);
});

frontendServer.stderr.on('data', (data) => {
    console.error('Frontend Error:', data);
});

console.log('Starting servers...');
console.log('Backend will run on http://localhost:8080');
console.log('Frontend will run on http://localhost:8080');

// Handle process termination
process.on('SIGINT', () => {
    backendServer.kill();
    frontendServer.kill();
    process.exit();
});