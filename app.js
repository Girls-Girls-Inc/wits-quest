const express = require("express");

const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
app.use(express.static("frontend/dist"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
});
