const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdminPassword() {
    try {
        // Create database connection
        const connection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'auditcell_db'
        });

        // Generate password hash
        const adminPassword = 'admin123';
        const inspectorPassword = 'inspector123';
        const adminHash = await bcrypt.hash(adminPassword, 10);
        const inspectorHash = await bcrypt.hash(inspectorPassword, 10);

        // Update admin user
        await connection.promise().query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?, role = ?',
            ['Admin User', 'gugulothusai877@gmail.com', adminHash, 'admin', adminHash, 'admin']
        );

        // Update inspector user
        await connection.promise().query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?, role = ?',
            ['Inspector User', 'ganesh123@gmail.com', inspectorHash, 'inspect', inspectorHash, 'inspect']
        );

        console.log('✅ Admin password reset successfully');
        console.log('Admin credentials:');
        console.log('Email: gugulothusai877@gmail.com');
        console.log('Password: admin123');
        console.log('\nInspector credentials:');
        console.log('Email: ganesh123@gmail.com');
        console.log('Password: inspector123');

        connection.end();
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
}

resetAdminPassword();