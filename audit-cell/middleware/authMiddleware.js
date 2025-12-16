function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please login.' });
}

module.exports = isAuthenticated;



const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors()); // if you’re calling from localhost:8080
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true })); // parse form data
