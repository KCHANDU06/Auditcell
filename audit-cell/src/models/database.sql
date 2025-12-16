-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'inspect', 'user') DEFAULT 'user',
    lastLogin DATETIME,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create academic_forms table
CREATE TABLE IF NOT EXISTS academic_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL DEFAULT 'academic_information',
    collegeName VARCHAR(255) NOT NULL,
    collegeCode VARCHAR(50) NOT NULL,
    programme VARCHAR(90) NOT NULL,
    submittedBy VARCHAR(255),
    submittedByName VARCHAR(255),
    academicYear VARCHAR(20),
    submissionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    formData JSON,
    status ENUM('pending_review', 'in_review', 'approved', 'rejected', 'inspection_pending', 'inspection_completed') DEFAULT 'pending_review',
    reviewedBy INT,
    reviewedAt DATETIME,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (submittedBy) REFERENCES users(email)
);

-- Create inspection_forms table
CREATE TABLE IF NOT EXISTS inspection_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name of the College INT NOT NULL,
    inspector INT NOT NULL,
    date of Inspection  DATE NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    remarks TEXT,
    infrastructureScore INT,
    academicScore INT,
    adminScore INT,
    totalScore INT,
    recommendations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (inspectorId) REFERENCES users(id)
);

-- Create colleges table
CREATE TABLE IF NOT EXISTS colleges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    principalName VARCHAR(255),
    principalEmail VARCHAR(255),
    principalPhone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
    isRead BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default admin user
INSERT INTO users (name, email, password, role) 
VALUES ('Admin User', 'gugulothusai877@gmail.com', '$2b$10$YourHashedPasswordHere', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

-- Insert default inspector
INSERT INTO users (name, email, password, role)
VALUES ('Inspector User', 'ganesh123@gmail.com', '$2b$10$YourHashedPasswordHere', 'inspect')
ON DUPLICATE KEY UPDATE role = 'inspect';

-- Create sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    userId INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);