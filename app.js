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
//const userRoutes = require("./backend/routes/user-routes");
//app.use("", userRoutes.routes);

const leaderboardRoutes = require('./backend/routes/leaderboardRoutes');
app.use("", leaderboardRoutes);

const collectiblesRoutes = require('./backend/routes/collectiblesRoutes');
app.use("", collectiblesRoutes);

const questRoutes = require('./backend/routes/questRoutes');
app.use("", questRoutes);

const locationRoutes = require('./backend/routes/locationRoutes');
app.use("/locations", locationRoutes);

const userRoutes = require('./backend/routes/userRoutes');
app.use("", userRoutes);

const huntRoutes = require('./backend/routes/huntRoutes');
app.use("", huntRoutes);


// Catch-all to serve index.html for SPA routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});


// Start server
app.listen(PORT, () => {
  console.log(`Server Listening on PORT: ${PORT}`);
});
