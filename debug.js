const express = require('express');
const multer = require('multer');
const app = express();
const upload = multer(); // Multer middleware to handle FormData

// Middleware to log raw request body
app.use((req, res, next) => {
  let rawBody = '';
  req.on('data', chunk => {
    rawBody += chunk+''; // Collect raw body chunks
  });

  req.on('end', () => {
    console.log('Raw Request Body (including boundary):');
    console.log(rawBody); // Logs the raw body with boundary and encoded data
    next(); // Proceed to the next middleware
  });
});

// Route to handle FormData
app.post('/api/data', upload.none(), (req, res) => {
  console.log('Parsed FormData:', req.body); // Logs the parsed fields from FormData
  res.json({ message: 'FormData received', data: req.body });
});

// Start the server
app.listen(3010, () => {
  console.log('Server is listening on port 3000');
});