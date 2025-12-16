const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Get the path to the frontend directory
const frontendPath = path.join(__dirname, '..', 'front');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'auditcell_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(frontendPath));
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use((req, res, next) => {
  const logMessage = `[${new Date().toISOString()}] 📩 ${req.method} request received at ${req.url}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE_PATH, logMessage + '\n');

  if (Object.keys(req.body).length > 0) {
    const bodyMessage = `[${new Date().toISOString()}] 🧾 Request Body: ${JSON.stringify(req.body)}`;
    console.log(bodyMessage);
    fs.appendFileSync(LOG_FILE_PATH, bodyMessage + '\n');
  }
  next();
});

// ------------------ Root Route ------------------
app.get('/', (req, res) => {
  // Redirect root to login page
  res.redirect('/login.html');
});

// Simple health check for quick connectivity tests
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// ------------------ MySQL Connection ------------------
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'auditcell_db',
  connectTimeout: 10000,
  waitForConnections: true
});

function connectDatabase() {
  db.connect(err => {
    if (err) {
      console.error('❌ DB Connection Failed:', err);
      console.log('⚠️ Please ensure MySQL is running and database exists');
      console.log('🔄 Retrying connection in 5 seconds...');
      setTimeout(connectDatabase, 5000);
    } else {
      console.log('✅ Database Connected Successfully!');
    }
  });

  db.on('error', function(err) {
    console.error('❌ Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('🔄 Lost connection to database. Reconnecting...');
      connectDatabase();
    } else {
      throw err;
    }
  });
}

connectDatabase();

// ------------------ Nodemailer Transporter ------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: (process.env.SMTP_SECURE === 'true') || false,
  auth: {
    user: process.env.SMTP_USER || 'auditsystemsender@gmail.com',
    pass: process.env.SMTP_PASS || ''
  },
  requireTLS: true,
  tls: { rejectUnauthorized: false }, // allow self-signed during local development
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
  logger: false,
  debug: false,
});

// Verify transporter at startup to surface SMTP configuration issues early
transporter.verify(function(error, success) {
  if (error) {
    console.warn('⚠️ SMTP transporter verification failed:', error.message || error);
  } else {
    console.log('✅ SMTP transporter is ready to send messages');
  }
});

// Folder to store submitted forms
const FORMS_DIR = path.join(__dirname, 'forms');
if (!fs.existsSync(FORMS_DIR)) {
  fs.mkdirSync(FORMS_DIR, { recursive: true });
}

// Folder to store generated affiliation orders
const ORDERS_DIR = path.join(__dirname, 'orders');
if (!fs.existsSync(ORDERS_DIR)) {
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
}

// Logging setup
const LOGS_DIR = path.join(__dirname, 'logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
const LOG_FILE_PATH = path.join(LOGS_DIR, 'server.log');

// Serve orders directory statically
app.use('/orders', express.static(ORDERS_DIR));

// Helper function to write affiliation order files
function writeOrderFilePayload(payload) {
  try {
    if (!payload || !payload.orderId) {
      console.error('❌ Invalid payload for order file write');
      return { success: false, message: 'Invalid payload' };
    }
    const fileName = `order-${payload.orderId}.json`;
    const filePath = path.join(ORDERS_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    console.log(`✅ Order file written: ${fileName}`);
    return { success: true, orderId: payload.orderId, orderPath: `/orders/${fileName}` };
  } catch (err) {
    console.error('❌ Error writing order file:', err);
    return { success: false, message: 'Failed to write order file' };
  }
}

// ------------------ Academic Form Structure ------------------
const ACADEMIC_FIELDS = {
  personalInfo: ['facultyName', 'employeeId', 'department', 'designation', 'academicYear'],
  teaching: ['coursesTaught', 'studentFeedback', 'innovativeMethods'],
  research: ['publications', 'conferences', 'researchProjects', 'patents'],
  extension: ['workshopsOrganized', 'guestLectures', 'communityService'],
  adminResponsibilities: ['committeeMemberships', 'rolesHeld']
};

// ------------------ Test Academic Form Submission ------------------
app.post('/submit-academicinfo', (req, res) => {
  try {
    console.log('📝 Received academic info data:', req.body);
    
    // Validate minimal required fields for a basic submission
    const requiredFields = ['collegeName', 'collegeCode', 'programme', 'intake', 'collegeEmail'];
    const missingFields = requiredFields.filter(field => !req.body[field] || String(req.body[field]).trim() === '');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }
    
    // Here you can save to database or file
    res.json({ 
      success: true, 
      message: 'Academic data received and validated successfully',
      data: req.body 
    });
  } catch (error) {
    console.error('❌ Error in submit-academicinfo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// ------------------ Save Academic Form ------------------
app.post('/save-academic-form', (req, res) => {
  try {
    const { email, formData, formType = 'academic' } = req.body;
    
    if (!email || !formData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and form data are required' 
      });
    }

    const filePath = path.join(FORMS_DIR, `${email}.json`);
    let forms = [];

    // Read existing forms if file exists
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        forms = JSON.parse(fileData);
      } catch (readError) {
        console.log('⚠️ Error reading existing forms, starting fresh:', readError);
        forms = [];
      }
    }

    // Create new academic form
    const academicForm = {
      id: Date.now().toString(),
      type: formType,
      ...formData,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
      reviewedBy: null,
      reviewedAt: null,
      comments: null
    };

    forms.push(academicForm);
    
    // Save to file
    fs.writeFileSync(filePath, JSON.stringify(forms, null, 2));
    
    console.log(`✅ Academic form submitted by ${email}`);
    // If this is an inspection submission, also try to insert into the database
    if (String(formType).toLowerCase() === 'inspection') {
      try {
        // Use submission timestamp as the DB submissionDate to detect duplicates
        const submissionDate = academicForm.submittedAt;
        const submittedBy = email || null;

        // Format date for MySQL DATETIME column
        const mysqlSubmissionDate = new Date(submissionDate).toISOString().slice(0, 19).replace('T', ' ');

        // Basic duplication check: same type + submittedBy + submissionDate
        const dupCheckSql = 'SELECT id FROM academic_forms WHERE type = ? AND submittedBy = ? AND submissionDate = ? LIMIT 1';
        db.query(dupCheckSql, ['inspection', submittedBy, mysqlSubmissionDate], (dupErr, dupRows) => {
          if (dupErr) {
            console.warn('⚠️ Could not perform duplicate check for inspection DB insert:', dupErr);
            // still respond to client; do not fail the file save
            return res.json({ success: true, message: 'Academic form submitted (file) — DB insert attempted', formId: academicForm.id });
          }

          if (dupRows && dupRows.length > 0) {
            console.log('ℹ️ Inspection already exists in DB; skipping duplicate insert');
            return res.json({ success: true, message: 'Academic form submitted (file). DB already contains this inspection.', formId: academicForm.id });
          }

          // Prepare values for DB insert
          const insertSql = `
            INSERT INTO academic_forms
            (type, collegeName, collegeCode, submittedBy, submittedByName, academicYear, submissionDate, formData, status, programme)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const collegeName = academicForm.collegeName || formData?.collegeName || null;
          const collegeCode = academicForm.collegeCode || formData?.collegeCode || null;
          const programme = academicForm.course || academicForm.programme || (formData && formData.course) || null;
          const submittedByName = academicForm.submittedByName || null;
          const academicYear = academicForm.academicYear || null;
          const status = (academicForm.status || 'inspection_pending');

          // Ensure course is in formData for the database
          if (programme && formData) {
            formData.course = programme;
          }

          db.query(insertSql, [
            'inspection',
            collegeName,
            collegeCode,
            submittedBy,
            submittedByName,
            academicYear,
            mysqlSubmissionDate,
            JSON.stringify(formData || {}),
            status,
            programme
          ], (insErr, insResult) => {
            if (insErr) {
              console.error('❌ Failed to insert inspection into DB after file save:', insErr);
              return res.json({ success: true, message: 'Academic form saved to file; DB insert failed (see server logs)', formId: academicForm.id });
            }

            console.log(`✅ Inspection inserted into DB with ID: ${insResult.insertId}`);
            return res.json({ success: true, message: 'Academic form submitted and saved to DB', formId: academicForm.id, dbId: insResult.insertId });
          });
        });
      } catch (dbSaveErr) {
        console.error('❌ Error while inserting inspection into DB:', dbSaveErr);
        return res.json({ success: true, message: 'Academic form saved to file; DB insert encountered an error', formId: academicForm.id });
      }
    } else {
      // Not an inspection — just respond normally
      res.json({ 
        success: true, 
        message: 'Academic form submitted successfully!',
        formId: academicForm.id 
      });
    }
  } catch (error) {
    console.error('❌ Error saving academic form:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error saving academic form' 
    });
  }
});

// ------------------ Get All Forms for Admin ------------------
app.get('/admin/forms', (req, res) => {
  const formsDir = path.join(__dirname, 'forms');
  
  fs.readdir(formsDir, (err, files) => {
    if (err) {
      console.log('❌ Error reading forms directory:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error reading forms directory' 
      });
    }

    const allForms = [];
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return res.json({ 
        success: true, 
        forms: [] 
      });
    }

    let processed = 0;
    
    jsonFiles.forEach(file => {
      const email = file.replace('.json', '');
      const filePath = path.join(formsDir, file);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.log(`❌ Error reading file ${file}:`, err);
        } else {
          try {
            const userForms = JSON.parse(data);
            userForms.forEach(form => {
              allForms.push({
                ...form,
                userEmail: email,
                userName: form.facultyName || form.name || 'Unknown Faculty'
              });
            });
          } catch (parseErr) {
            console.log(`❌ JSON parse error in ${file}:`, parseErr);
          }
        }

        processed++;
        if (processed === jsonFiles.length) {
          // Sort by submission date (newest first)
          allForms.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
          res.json({ 
            success: true, 
            forms: allForms 
          });
        }
      });
    });
  });
});

// ------------------ Update Form Status ------------------
app.post('/admin/update-form-status', (req, res) => {
  try {
    const { userEmail, formId, status, comments, reviewedBy, forceUpdate } = req.body;

    if (!userEmail || !formId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'User email, form ID, and status are required' 
      });
    }
    // First try updating a database record (if the form exists in academic_forms)
    const normalizedStatus = String(status).toLowerCase();
    const dbStatusMap = {
      'approved': 'approved',
      'rejected': 'rejected',
      'pending': 'pending_review',
      'pending_review': 'pending_review',
      'in_review': 'in_review',
      'inspection_pending': 'inspection_pending',
      'inspection_completed': 'inspection_completed'
    };

    const targetStatus = dbStatusMap[normalizedStatus] || normalizedStatus;

    // If formId looks like a numeric DB id, try updating the database first
    const numericId = Number(formId);
    if (!Number.isNaN(numericId)) {
      // Helper to run DB update with a resolved reviewer id (or null)
      function runDbUpdate(resolvedReviewerId) {
        // Use COALESCE for optional fields so null from frontend does not overwrite existing DB values.
        const updateSql = `UPDATE academic_forms SET status = ?, comments = ?, reviewedAt = NOW(), reviewedBy = ?, collegeCode = COALESCE(?, collegeCode), collegeName = COALESCE(?, collegeName) WHERE id = ?`;
        const progParam = (typeof req.body.programme !== 'undefined') ? req.body.programme : null;
        const collegeCodeParam = (typeof req.body.collegeCode !== 'undefined') ? req.body.collegeCode : null;
        const collegeNameParam = (typeof req.body.collegeName !== 'undefined') ? req.body.collegeName : null;
        db.query(updateSql, [targetStatus, comments || null, resolvedReviewerId, collegeCodeParam, collegeNameParam, numericId], (err, result) => {
          if (err) {
            console.error('❌ Database error while updating form status:', err);
            // fall through to file-based update
          } else if (result.affectedRows > 0) {
            // Prevent downgrading statuses unless forceUpdate is true
            if (!forceUpdate) {
              // Fetch current status to decide
              db.query('SELECT * FROM academic_forms WHERE id = ?', [numericId], (sErr, sRows) => {
                if (sErr) {
                  console.error('❌ Error checking current status:', sErr);
                  // continue to respond success even if check fails
                  console.log(`✅ DB: Form ${formId} status updated to ${targetStatus}`);
                  // After update, if status is approved or inspection_completed, generate order
                  if (targetStatus === 'approved' || targetStatus === 'inspection_completed') {
                    // Try fetch updated row for details
                    db.query('SELECT * FROM academic_forms WHERE id = ?', [numericId], (rErr, rRows) => {
                      if (!rErr && rRows && rRows[0]) {
                        try {
                          const row = rRows[0];
                          const payload = {
                            formId: String(row.id),
                            formType: row.type || 'academic',
                            collegeName: row.collegeName,
                            collegeCode: row.collegeCode,
                            submittedBy: row.submittedBy,
                            formData: row.formData ? JSON.parse(row.formData) : {}
                          };
                          const w = writeOrderFilePayload(payload);
                          if (w && w.success) {
                            return res.json({ success: true, message: 'Form status updated successfully (database)', order: w });
                          }
                        } catch (e) {
                          console.warn('⚠️ Order generation after DB update failed', e);
                        }
                      }
                      return res.json({ success: true, message: 'Form status updated successfully (database)' });
                    });
                    return;
                  }
                  return res.json({ success: true, message: 'Form status updated successfully (database)' });
                } else if (sRows && sRows[0]) {
                  const current = String(sRows[0].status || '').toLowerCase();
                  // If current is approved or rejected and targetStatus is pending, block it
                  if ((current === 'approved' || current === 'rejected' || current === 'inspection_completed') && (targetStatus.includes('pending') || targetStatus === 'pending_review')) {
                    console.log(`⚠️ Preventing downgrade of form ${formId} from ${current} to ${targetStatus}`);
                    return res.status(400).json({ success: false, message: 'Cannot downgrade approved/rejected forms to pending without forceUpdate' });
                  }
                }

                // After update, generate order when moving to approved/completed
                if (targetStatus === 'approved' || targetStatus === 'inspection_completed') {
                  db.query('SELECT * FROM academic_forms WHERE id = ?', [numericId], (rErr, rRows) => {
                    if (!rErr && rRows && rRows[0]) {
                      try {
                        const row = rRows[0];
                        const payload = {
                          formId: String(row.id),
                          formType: row.type || 'academic',
                          collegeName: row.collegeName,
                          collegeCode: row.collegeCode,
                          submittedBy: row.submittedBy,
                          formData: row.formData ? JSON.parse(row.formData) : {}
                        };
                        const w = writeOrderFilePayload(payload);
                        if (w && w.success) {
                          console.log(`✅ DB: Form ${formId} status updated to ${targetStatus}`);
                          return res.json({ success: true, message: 'Form status updated successfully (database)', order: w });
                        }
                      } catch (e) {
                        console.warn('⚠️ Order generation after DB update failed', e);
                      }
                    }
                    console.log(`✅ DB: Form ${formId} status updated to ${targetStatus}`);
                    return res.json({ success: true, message: 'Form status updated successfully (database)' });
                  });
                  return;
                }

                console.log(`✅ DB: Form ${formId} status updated to ${targetStatus}`);
                return res.json({ success: true, message: 'Form status updated successfully (database)' });
              });
              return;
            }
            console.log(`✅ DB: Form ${formId} status updated to ${targetStatus}`);
            return res.json({ success: true, message: 'Form status updated successfully (database)' });
          }

          // If DB update didn't happen (no rows affected) fall back to file-based storage
          const filePath = path.join(__dirname, 'forms', `${userEmail}.json`);

          if (!fs.existsSync(filePath)) {
            // If caller asked to force the update, continue and let DB path be the authoritative source.
            if (forceUpdate) {
              console.log(`⚠️ forms file for ${userEmail} not found, but forceUpdate requested — attempting DB-only update result.`);
              return res.json({ success: true, message: 'No file-based forms found; database update attempted (if applicable)' });
            }
            return res.status(404).json({ success: false, message: 'User forms not found' });
          }

          const forms = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const formIndex = forms.findIndex(form => form.id === formId || String(form.id) === String(formId));

          if (formIndex === -1) {
            if (forceUpdate) {
              console.log(`⚠️ form id ${formId} not found in file for ${userEmail}, but forceUpdate requested.`);
              return res.json({ success: true, message: 'Form not found in file storage; database update attempted (if applicable)' });
            }
            return res.status(404).json({ success: false, message: 'Form not found' });
          }

          // Prevent downgrades in file-based forms as well
          const currentStatus = String(forms[formIndex].status || '').toLowerCase();
          if (!forceUpdate && (currentStatus === 'approved' || currentStatus === 'rejected' || currentStatus === 'inspection_completed') && (String(status).toLowerCase().includes('pending') || String(status).toLowerCase() === 'pending_review')) {
            return res.status(400).json({ success: false, message: 'Cannot downgrade approved/rejected forms to pending without forceUpdate' });
          }

          // Update file-based form status
          forms[formIndex].status = status;
          forms[formIndex].comments = comments || null;
          forms[formIndex].reviewedBy = reviewedBy || 'Admin';
          forms[formIndex].reviewedAt = new Date().toISOString();
          // Only overwrite programme in file storage when frontend explicitly provides it
          if (typeof req.body.programme !== 'undefined' && req.body.programme !== null) {
            forms[formIndex].programme = req.body.programme;
          }

          fs.writeFileSync(filePath, JSON.stringify(forms, null, 2));

          console.log(`✅ File: Form ${formId} status updated to ${status}`);
          return res.json({ success: true, message: 'Form status updated successfully (file)' });
        });
      }

      // Resolve reviewedBy to a user id when possible
      if (reviewedBy) {
        const reviewerNumeric = Number(reviewedBy);
        if (!Number.isNaN(reviewerNumeric)) {
          // reviewedBy already an id
          runDbUpdate(reviewerNumeric);
        } else {
          // treat reviewedBy as email -> lookup user id
          db.query('SELECT id FROM users WHERE email = ?', [reviewedBy], (err2, rows2) => {
            if (err2) {
              console.error('❌ Error resolving reviewer email to id:', err2);
              runDbUpdate(null);
            } else {
              const reviewerId = (rows2 && rows2[0]) ? rows2[0].id : null;
              runDbUpdate(reviewerId);
            }
          });
        }
      } else {
        runDbUpdate(null);
      }
      return;
    }

    // If formId is not numeric, fall back to file-based update
    const filePath = path.join(__dirname, 'forms', `${userEmail}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'User forms not found' });
    }

    const forms = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const formIndex = forms.findIndex(form => form.id === formId);

    if (formIndex === -1) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Update form status
    forms[formIndex].status = status;
    forms[formIndex].comments = comments || null;
    forms[formIndex].reviewedBy = reviewedBy || 'Admin';
    forms[formIndex].reviewedAt = new Date().toISOString();
    // Preserve existing programme unless explicitly provided
    if (typeof req.body.programme !== 'undefined' && req.body.programme !== null) {
      forms[formIndex].programme = req.body.programme;
    }

    fs.writeFileSync(filePath, JSON.stringify(forms, null, 2));

    console.log(`✅ Form ${formId} status updated to ${status}`);

    // If status is approved or inspection_completed, generate affiliation order for file-based form
    const statusLower = String(status || '').toLowerCase();
    if (statusLower === 'approved' || statusLower === 'inspection_completed') {
      try {
        const f = forms[formIndex];
        const payload = {
          formId: String(f.id),
          formType: f.type || f.formType || 'academic',
          collegeName: f.collegeName || (f.formData && f.formData.collegeName) || null,
          collegeCode: f.collegeCode || (f.formData && f.formData.collegeCode) || null,
          submittedBy: f.userEmail || f.submittedBy || null,
          formData: f.formData || {}
        };
        const w = writeOrderFilePayload(payload);
        if (w && w.success) {
          return res.json({ success: true, message: 'Form status updated successfully (file)', order: w });
        }
      } catch (e) {
        console.warn('⚠️ Order generation for file-based form failed', e);
      }
    }

    res.json({ success: true, message: 'Form status updated successfully' });

  } catch (error) {
    console.log('❌ Error updating form status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating form status' 
    });
  }
});

// ------------------ Admin Dashboard Statistics ------------------
app.get('/admin/stats', (req, res) => {
  const formsDir = path.join(__dirname, 'forms');
  
  fs.readdir(formsDir, (err, files) => {
    if (err) {
      console.log('❌ Error reading forms directory:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error reading stats' 
      });
    }

    const jsonFiles = files.filter(file => file.endsWith('.json'));
    let totalForms = 0;
    const statusCount = { Pending: 0, Approved: 0, 'In Review': 0, Rejected: 0 };
    const departmentStats = {};
    const recentSubmissions = [];

    if (jsonFiles.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalForms: 0,
          statusCount,
          departmentStats,
          recentSubmissions: [],
          totalUsers: 0
        }
      });
    }

    let processed = 0;
    
    jsonFiles.forEach(file => {
      const email = file.replace('.json', '');
      const filePath = path.join(formsDir, file);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (!err) {
          try {
            const userForms = JSON.parse(data);
            totalForms += userForms.length;

            userForms.forEach(form => {
              // Count status
              statusCount[form.status] = (statusCount[form.status] || 0) + 1;

              // Count by department
              const dept = form.department || 'Unknown';
              departmentStats[dept] = (departmentStats[dept] || 0) + 1;

              // Get recent submissions (last 10)
              if (recentSubmissions.length < 10) {
                recentSubmissions.push({
                  userName: form.facultyName || form.name || 'Unknown',
                  userEmail: email,
                  department: form.department || 'Unknown',
                  submittedAt: form.submittedAt,
                  status: form.status
                });
              }
            });
          } catch (parseErr) {
            console.log(`❌ JSON parse error in ${file}:`, parseErr);
          }
        }

        processed++;
        if (processed === jsonFiles.length) {
          // Get total users from database
          db.query('SELECT COUNT(*) as totalUsers FROM users WHERE role="user"', (err, results) => {
            const totalUsers = (results && results[0]) ? results[0].totalUsers : jsonFiles.length;

            // Sort recent submissions by date
            recentSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

            res.json({
              success: true,
              stats: {
                totalForms,
                statusCount,
                departmentStats,
                recentSubmissions: recentSubmissions.slice(0, 10),
                totalUsers
              }
            });
          });
        }
      });
    });
  });
});

// ------------------ Get All Users for Admin ------------------
app.get('/admin/users', (req, res) => {
  db.query('SELECT id, name, email, role, lastLogin, createdAt FROM users ORDER BY createdAt DESC', (err, results) => {
    if (err) {
      console.log('❌ Database error fetching users:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error fetching users' 
      });
    }

    res.json({ 
      success: true, 
      users: results 
    });
  });
});

// ------------------ OTP Store ------------------
const otpStore = {};

// ------------------ Helper to generate OTP ------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ------------------ Send OTP ------------------
app.post('/send-otp', (req, res) => {
  console.log('📨 POST /send-otp called with body:', req.body);
  const { email } = req.body || {};

  // Basic validation
  if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email is required' });
  }

  // Simple rate limiting: allow 1 OTP per 60 seconds per email
  const existing = otpStore[email];
  if (existing && existing.lastSent && (Date.now() - existing.lastSent) < 60 * 1000) {
    return res.status(429).json({ success: false, message: 'OTP already sent recently. Please wait a moment before requesting again.' });
  }

  db.query('SELECT * FROM users WHERE email=?', [email], (err, results) => {
    if (err) {
      console.error('❌ Database error while checking email:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length > 0) {
      console.log(`❌ Email already registered: ${email}`);
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const otp = generateOTP();
    otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000, lastSent: Date.now() };

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'auditsystemsender@gmail.com',
      to: email,
      subject: 'OTP for Academic Audit System',
      text: `Your OTP for registration is: ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (err2, info) => {
      if (err2) {
        console.error('❌ Error sending OTP:', err2);
        // Don't expose raw SMTP errors to client; return a generic message
        return res.status(500).json({ success: false, message: 'Error sending OTP. Check server logs for details.' });
      }

      console.log(`🔑 OTP for ${email}: ${otp} (sent: ${info && info.response ? info.response : 'unknown'})`);
      return res.json({ success: true, message: 'OTP sent successfully' });
    });
  });
});

// ------------------ Verify OTP ------------------
app.post('/verify-otp', (req, res) => {
  console.log('🔍 POST /verify-otp called with body:', req.body);
  const { email, otp } = req.body;
  
  if (!email || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and OTP are required' 
    });
  }

  const record = otpStore[email];
  if (record && record.otp === otp && Date.now() < record.expires) {
    delete otpStore[email];
    console.log(`✅ OTP verified for ${email}`);
    res.json({ 
      success: true, 
      message: 'OTP verified successfully!' 
    });
  } else {
    console.log(`❌ OTP verification failed for ${email}`);
    res.status(400).json({ 
      success: false, 
      message: 'Invalid or expired OTP' 
    });
  }
});

// ------------------ Set New Password ------------------
app.post('/set-new-password', async (req, res) => {
  console.log('🔑 POST /set-new-password called with body:', req.body);
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and new password are required' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('UPDATE users SET password=? WHERE email=?', [hashedPassword, email], (err, results) => {
      if (err) {
        console.log('❌ Database error while resetting password:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.affectedRows === 0) {
        console.log(`❌ Email not found: ${email}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Email not found' 
        });
      }
      
      console.log(`✅ Password reset for ${email}`);
      res.json({ 
        success: true, 
        message: 'Password reset successfully!' 
      });
    });
  } catch (error) {
    console.log('❌ Error hashing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing password reset' 
    });
  }
});

// ------------------ Register ------------------
app.post('/register', async (req, res) => {
  console.log('📝 POST /register called with body:', req.body);
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'All fields are required' 
    });
  }

  // Role assignment
  const adminEmails = ['gugulothusai877@gmail.com', 'cm6@gmail.com'];
  const inspectEmails = ['ganesh123@gmail.com'];
  let role = 'user';
  
  if (adminEmails.includes(email)) role = 'admin';
  else if (inspectEmails.includes(email)) role = 'inspect';

  db.query('SELECT * FROM users WHERE email=?', [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }
    
    if (results.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, role],
        (err) => {
          if (err) {
            return res.status(500).json({ 
              success: false, 
              message: 'Error saving user to database' 
            });
          }
          
          console.log(`✅ Registered as ${role}: ${email}`);
          res.json({ 
            success: true, 
            message: `Registered successfully as ${role}!` 
          });
        }
      );
    } catch (error) {
      console.log('❌ Error hashing password:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing registration' 
      });
    }
  });
});

// ------------------ Login ------------------
app.post('/login', async (req, res) => {
  console.log('🔑 POST /login called with body:', req.body);
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email and password are required' 
    });
  }

  try {
    db.query('SELECT * FROM users WHERE email=?', [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ 
          success: false, 
          message: 'Email not found' 
        });
      }

      const user = results[0];

      // Add inspectdash logging and bcrypt.compare for specific email
      if (email === 'cm123@gmail.com') {
        console.log('inspectdash: Attempting bcrypt.compare for cm123@gmail.com');
        bcrypt.compare('inspect123', '$2b$10$Qz1YkR8vZ7nYH1XhCwFq5e1tU2mYJ5xk9F0bZQKJZxY8JQZrHk1rC').then(match => {
          console.log(`inspectdash: bcrypt.compare result for cm123@gmail.com: ${match}`);
        }).catch(err => {
          console.error('inspectdash: bcrypt.compare error for cm123@gmail.com:', err);
        });
      }
      
      try {
        const match = await bcrypt.compare(password, user.password);
        if (email === 'cm123@gmail.com') {
          console.log(`inspectdash: bcrypt.compare result for ${email}: ${match}`);
          console.log(`inspectdash: Provided password (for ${email} only): ${password}`);
          console.log(`inspectdash: Stored hash: ${user.password}`);
        }
        if (!match) {
          if (email === 'cm123@gmail.com') {
            console.log(`inspectdash: Incorrect password attempt for ${email}`);
            console.log(`inspectdash: Provided password (for cm123@gmail.com only): ${password}`);
            console.log(`inspectdash: Stored hash: ${user.password}`);
            console.log(`inspectdash: bcrypt.compare result: ${match}`);
          }
          return res.status(401).json({ 
            success: false, 
            message: 'Incorrect password' 
          });
        }

        // Update last login
        db.query('UPDATE users SET lastLogin=NOW() WHERE email=?', [email]);

        const role = user.role;
        console.log(`✅ Login successful for ${email} (Role: ${role})`);
        
        res.json({
          success: true,
          message: 'Login successful!',
          role,
          user: { 
            id: user.id, 
            name: user.name, 
            email: user.email 
          }
        });
      } catch (error) {
        console.log('❌ Error comparing passwords:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error during login' 
        });
      }
    });
  } catch (error) {
    console.error('❌ Server error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ------------------ User Activity API ------------------
app.get('/user-activity', (req, res) => {
  const email = req.query.email;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email query parameter is required' 
    });
  }

  const filePath = path.join(__dirname, 'forms', `${email}.json`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return zeros
      if (err.code === 'ENOENT') {
        return res.json({ 
          success: true, 
          activity: { 
            formsSubmitted: 0, 
            pendingVerifications: 0, 
            approved: 0, 
            inReview: 0, 
            rejected: 0 
          } 
        });
      }
      
      console.log('❌ Error reading user activity file:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Could not read user forms' 
      });
    }

    try {
      const forms = JSON.parse(data);
      const formsSubmitted = forms.length;
      const pendingVerifications = forms.filter(f => f.status === 'pending_review').length;
      const approved = forms.filter(f => f.status === 'Approved').length;
      const inReview = forms.filter(f => f.status === 'In Review').length;
      const rejected = forms.filter(f => f.status === 'Rejected').length;

      res.json({ 
        success: true, 
        activity: { 
          formsSubmitted, 
          pendingVerifications, 
          approved, 
          inReview, 
          rejected 
        } 
      });
    } catch (parseErr) {
      console.log('❌ JSON parse error in user activity:', parseErr);
      res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON format in forms file' 
      });
    }
  });
});

// ------------------ Account Details API ------------------
app.get('/account-details', (req, res) => {
  const email = req.query.email;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email query parameter is required' 
    });
  }

  db.query('SELECT id, name, email, role, lastLogin, createdAt FROM users WHERE email=?', [email], (err, results) => {
    if (err) {
      console.log('❌ Database error fetching account details:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Database error' 
      });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = results[0];
    res.json({ 
      success: true, 
      user 
    });
  });
});

// ------------------ Get User Forms ------------------
app.get('/user-forms', (req, res) => {
  const email = req.query.email;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email query parameter is required' 
    });
  }

  const filePath = path.join(__dirname, 'forms', `${email}.json`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      // If file doesn't exist, return empty array
      if (err.code === 'ENOENT') {
        return res.json({ 
          success: true, 
          forms: [] 
        });
      }
      
      console.log('❌ Error reading user forms:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error reading forms file' 
      });
    }

    try {
      const forms = JSON.parse(data);
      // Sort by submission date (newest first)
      forms.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      
      res.json({ 
        success: true, 
        forms 
      });
    } catch (parseErr) {
      console.log('❌ JSON parse error in user forms:', parseErr);
      res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON format in forms file' 
      });
    }
  });
});

// ------------------ Submit Academic Form (MySQL) ------------------
app.post('/submit-academic-form', (req, res) => {
  try {
    const {
      type,
      collegeName,
      collegeCode,
      submittedBy,
      submittedByName,
      academicYear,
      submissionDate,
      formData,
      status,
      programme // Added programme
    } = req.body;

    // For inspection submissions we allow missing collegeCode (some inspection reports may not include the code)
    // but we require collegeName, course and inspectionDate to be present either at top-level or inside formData
    if (String(type).toLowerCase() === 'inspection') {
      const courseVal = (formData && (formData.course || formData.courseName || formData.programme)) || req.body.course || null;
      const inspectionDateVal = (formData && (formData.inspectionDate || formData.dateOfInspection)) || req.body.inspectionDate || req.body.submissionDate || null;
      const missing = [];
      if (!collegeName) missing.push('collegeName');
      if (!courseVal) missing.push('course');
      if (!inspectionDateVal) missing.push('inspectionDate');
      if (missing.length > 0) {
        return res.status(400).json({ success: false, message: `Missing required fields for inspection: ${missing.join(', ')}` });
      }
      // Ensure formData contains course and inspectionDate for storage/visibility in admin
      if (!formData) req.body.formData = {};
      req.body.formData = { ...(req.body.formData || {}), course: courseVal, inspectionDate: inspectionDateVal };
      // allow collegeCode to be null for inspection
    } else {
      if (!collegeName || !collegeCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'College name and code are required.' 
        });
      }
    }

    const sql = `
      INSERT INTO academic_forms 
      (type, collegeName, collegeCode, submittedBy, submittedByName, academicYear, submissionDate, formData, status, programme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        type || 'academic_information',
        collegeName,
        collegeCode,
        submittedBy || null,
        submittedByName || null,
        academicYear || '2024-25',
        submissionDate || new Date(),
        JSON.stringify(formData || {}),
        status || 'pending_review',
        programme // Added programme value
      ],
      (err, result) => {
        if (err) {
          console.error('❌ Error inserting academic form:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Database insert failed' 
          });
        }

        console.log(`✅ Academic form saved with ID: ${result.insertId}`);
        res.json({ 
          success: true, 
          message: 'Form submitted successfully', 
          formId: result.insertId 
        });
      }
    );
  } catch (error) {
    console.error('❌ Error in submit-academic-form:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// ------------------ Admin: View Academic Forms ------------------
app.get('/admin/academic-forms', (req, res) => {
  db.query('SELECT * FROM academic_forms ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('❌ Error fetching academic forms:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching forms from database' 
      });
    }
    
    res.json({ 
      success: true, 
      forms: rows 
    });
  });
});

// ------------------ Get current user's academic forms ------------------
app.get('/my/academic-forms', (req, res) => {
  const email = req.query.
  email;
  if (!email) return res.status(400).json({ success: false, message: 'Email query parameter is required' });

  db.query('SELECT * FROM academic_forms WHERE submittedBy = ? ORDER BY created_at DESC', [email], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching user academic forms:', err);
      return res.status(500).json({ success: false, message: 'Database error fetching forms' });
    }
    res.json({ success: true, forms: rows });
  });
});

// ------------------ Error Handling Middleware ------------------
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error' 
  });
});

// ------------------ 404 Handler ------------------
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found' 
  });
});

// ------------------ Start Server ------------------
app.listen(PORT, () => {
  console.log(`✅ Academic Audit System Server running at http://localhost:${PORT}`);
  console.log(`📁 Forms directory: ${FORMS_DIR}`);
});

// ------------------ Generate Affiliation Order ------------------
app.post('/admin/generate-affiliation', (req, res) => {
  try {
    const { formId, formType = 'academic', userEmail } = req.body;
    if (!formId) return res.status(400).json({ success: false, message: 'formId is required' });

    // Lookup DB record when possible
    const numericId = Number(formId);
    let order = {
      orderId: `ORDER-${Date.now()}`,
      formId,
      formType,
      generatedAt: new Date().toISOString(),
      generatedBy: (req.body.generatedBy || 'system')
    };

    function writeOrderFile(payload) {
      try {
        const ordersDir = path.join(__dirname, 'orders');
        if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });
        const fileName = `order-${payload.orderId}.json`;
        const filePath = path.join(ordersDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
        return { success: true, orderId: payload.orderId, orderPath: `/orders/${fileName}` };
      } catch (err) {
        console.error('❌ Error writing order file:', err);
        return { success: false, message: 'Failed to write order file' };
      }
    }

    if (!Number.isNaN(numericId)) {
      db.query('SELECT * FROM academic_forms WHERE id = ?', [numericId], (err, rows) => {
        if (err) {
          console.error('❌ Error fetching form for order generation:', err);
          const result = writeOrderFile(order);
          return res.json(Object.assign({ success: result.success }, result));
        }

        const form = (rows && rows[0]) ? rows[0] : null;
        if (form) {
          order = Object.assign(order, {
            collegeName: form.collegeName,
            collegeCode: form.collegeCode,
            submittedBy: form.submittedBy,
            formData: form.formData ? JSON.parse(form.formData) : {}
          });
        } else {
          // Try file-based lookup
          if (userEmail) {
            const filePath = path.join(__dirname, 'forms', `${userEmail}.json`);
            if (fs.existsSync(filePath)) {
              try {
                const userForms = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const f = userForms.find(ff => String(ff.id) === String(formId));
                if (f) {
                  order.collegeName = f.collegeName || f.formData?.collegeName;
                  order.collegeCode = f.collegeCode || f.formData?.collegeCode;
                  order.formData = f.formData || {};
                }
              } catch (e) {
                console.warn('⚠️ Failed to parse user forms for order generation', e);
              }
            }
          }
        }

        const writeResult = writeOrderFile(order);
        return res.json(Object.assign({ success: writeResult.success }, writeResult));
      });
    } else {
      // Non-numeric id: try file lookup
      if (userEmail) {
        const filePath = path.join(__dirname, 'forms', `${userEmail}.json`);
        if (fs.existsSync(filePath)) {
          try {
            const userForms = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const f = userForms.find(ff => String(ff.id) === String(formId));
            if (f) {
              order.collegeName = f.collegeName || f.formData?.collegeName;
              order.collegeCode = f.collegeCode || f.formData?.collegeCode;
              order.formData = f.formData || {};
            }
          } catch (e) {
            console.warn('⚠️ Failed to parse user forms for order generation', e);
          }
        }
      }

      const result = writeOrderFile(order);
      return res.json(Object.assign({ success: result.success }, result));
    }
  } catch (error) {
    console.error('❌ Error generating affiliation order:', error);
    res.status(500).json({ success: false, message: 'Failed to generate affiliation order' });
  }
});