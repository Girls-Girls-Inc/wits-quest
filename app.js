const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static frontend
const frontendPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendPath));

// Your API routes here (if any)
// app.use('/api', require('./routes/api'));

// Catch-all to serve index.html for SPA routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


// Start server
app.listen(PORT, () => {
  console.log(`Server Listening on PORT: ${PORT}`);
});
