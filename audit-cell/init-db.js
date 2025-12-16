const mysql = require('mysql2');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Create database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initializeDatabase() {
  try {
    console.log('Connecting to MySQL server...');
    // Create database if it doesn't exist
    await connection.promise().query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    console.log(`✅ Database ${process.env.DB_NAME} created or already exists`);
    
    // Test connection
    await connection.promise().query('SELECT 1');
    console.log('✅ MySQL connection successful');

    // Use the database
    await connection.promise().query(`USE ${process.env.DB_NAME}`);

    // Read and execute SQL file
    const sqlPath = path.join(__dirname, 'src', 'models', 'database.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Split SQL content into individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());

    // Execute each statement
    for (let statement of statements) {
      if (statement.trim()) {
        await connection.promise().query(statement);
      }
    }

    console.log('✅ Database schema initialized successfully');
    
    // Close connection
    connection.end();
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();