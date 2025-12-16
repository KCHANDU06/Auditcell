const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetPasswords() {
    try {
        // Create database connection
        const connection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'auditcell_db'
        });

        // Generate password hashes
        const adminPassword = await bcrypt.hash('admin123', 10);
        const inspectorPassword = await bcrypt.hash('inspector123', 10);
        const userPassword = await bcrypt.hash('user123', 10);

        // Update admin user
        await connection.promise().query(
            'UPDATE users SET password = ? WHERE name = ?',
            [adminPassword, 'Admin user']
        );

        // Update inspector user
        await connection.promise().query(
            'UPDATE users SET password = ? WHERE email = ?',
            [inspectorPassword, 'ganesh123@gmail.com']
        );

        // Update regular user
        await connection.promise().query(
            'UPDATE users SET password = ? WHERE email = ?',
            [userPassword, 'raju@gamil.com']
        );

        console.log('✅ Passwords reset successfully');
        console.log('\nLogin Credentials:');
        console.log('\n1. Admin Account:');
        console.log('   Email: gugulothusai877@gmail.com');
        console.log('   Password: admin123');
        console.log('   Role: admin');
        
        console.log('\n2. Inspector Account:');
        console.log('   Email: ganesh123@gmail.com');
        console.log('   Password: inspector123');
        console.log('   Role: inspect');
        
        console.log('\n3. Regular User Account:');
        console.log('   Email: raju@gamil.com');
        console.log('   Password: user123');
        console.log('   Role: user');

        connection.end();
    } catch (error) {
        console.error('Error resetting passwords:', error);
        process.exit(1);
    }
}

resetPasswords();