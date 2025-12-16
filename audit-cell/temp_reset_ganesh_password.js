const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetGaneshPassword() {
    try {
        const connection = mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'password',
            database: process.env.DB_NAME || 'auditcell_db'
        });

        const newPassword = 'inspector123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const userEmail = 'ganesh123@gmail.com';

        await connection.promise().query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, userEmail]
        );

        console.log(`✅ Password for ${userEmail} reset successfully to '${newPassword}'`);
        connection.end();
    } catch (error) {
        console.error('❌ Error resetting password:', error);
        process.exit(1);
    }
}

resetGaneshPassword();
