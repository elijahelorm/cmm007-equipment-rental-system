require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

// Create the express application
const app = express();


// DATABASE CONNECTION
// Import mysql2 to connect to our database
const mysql = require("mysql2");

// Create the database connection using our .env values
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Actually connect to the database
db.connect((err) => {
  // If there's an error
  if (err) {
    console.log("Database connection failed:", err);
    return;
  }
  // If successful
  console.log("Connected to MySQL database successfully!");
});

// Make db accessible throughout the app
app.set("db", db);


// MIDDLEWARE SETUP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set up sessions so we can track who is logged in
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      // Session expires after 24 hours
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);


// VIEW ENGINE SETUP
// Tell Express we're using EJS for our HTML templates
app.set("view engine", "ejs");

// Tell Express where our view files are
app.set("views", path.join(__dirname, "views"));


// ROUTES
// Import our route files (we'll create these next)
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const userRoutes = require("./routes/user");

// Tell Express which routes to use
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/user", userRoutes);


// START THE SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
