const express = require("express");
const path = require("path");
const app = express();
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });

// Middleware for static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

let userInfo = {};

// Database setup
const db = new sqlite3.Database("./election.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name VARCHAR(100),
      middle_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(100),
      dob DATE,
      password VARCHAR(100),
      role_id VARCHAR(100),
      photo BLOB,
      party_id INT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INT PRIMARY KEY,
      role VARCHAR(100)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS auth (
      id INT PRIMARY KEY,
      user_name VARCHAR(100),
      password VARCHAR(100),
      user_id INT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS parties (
      id INT PRIMARY KEY,
      party VARCHAR(100),
      logo BLOB
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS positions (
      id INT PRIMARY KEY,
      position VARCHAR(100)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT PRIMARY KEY,
      first_name VARCHAR(100),
      middle_name VARCHAR(100),
      last_name VARCHAR(100),
      position_id INT,
      photo BLOB,
      party_id INT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INT PRIMARY KEY,
      candidate_id INT,
      vote INT
    )
  `);
});

// Routes
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post("/login", (req, res) => {
  const loginInfo = {
    loginEmail: req.body.email,
    loginPassword: req.body.password,
  };

  console.log("Login Info:", loginInfo);

  db.get(
    `SELECT * FROM user WHERE email = ? AND password = ?`,
    [loginInfo.loginEmail, loginInfo.loginPassword],
    (err, row) => {
      if (err) {
        console.log(err.message);
        return res.redirect("/login");
      }

      if (row) {
        userInfo = row;
        console.log("User Info:", userInfo);
        console.log("Login Successful!!");
        res.redirect("/dashboard");
      } else {
        console.log("Wrong credential");
        res.redirect("/login");
      }
    }
  );
});

app.get("/dashboard", (req, res) => {
  if (userInfo) {
    res.render("dashboard.ejs", { user: userInfo });
  } else {
    res.redirect("/login");
  }
});

app.get("/voterregistration", (req, res) => {
  res.render("voter_registration.ejs");
});

app.get("/", (req, res) => {
  res.redirect("/voterregistration");
});

app.post("/voterregistration", upload.single("photo"), (req, res) => {
  // // Log the entire request body to debug
  // console.log("Request Body: ", req.body);
  // console.log("Uploaded File: ", req.file);

  const voterData = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    email: req.body.email,
    userName: req.body.userName,
    DateOfBirth: req.body.dob,
    role: req.body.role,
    password: req.body.password,
    photo: req.file ? req.file.path : null, // Save the file path
  };

  db.run(
    `INSERT INTO user (first_name, middle_name, last_name, email, dob, password, role_id, photo, party_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      voterData.firstName,
      voterData.middleName,
      voterData.lastName,
      voterData.email,
      voterData.DateOfBirth,
      voterData.password,
      voterData.role,
      voterData.photo, // Save the file path or blob
      null,
    ],
    function (err) {
      if (err) {
        return console.log(err.message);
      }
      userInfo = voterData;
      console.log("Voter Data: ", userInfo);
      res.redirect("/login");
    }
  );
});

app.get("/partyregistration", (req, res) => {
  res.render("party_registration.ejs");
});

app.post("/partyregistration", upload.single("single"), (req, res) => {
  const partyregistration = {
    name: req.body.name,
    logo: req.file ? req.file.path : null,
  };
  db.run(
    `INSERT INTO parties (party, logo) VALUES (?, ?)`,
    [partyregistration.name, partyregistration.logo],
    function (err) {
      if (err) {
        res.redirect("/dashboard");
        return console.log(err.message);
      }
      console.log("Party Data: ", partyregistration);
      res.redirect("/dashboard");
    }
  );
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
