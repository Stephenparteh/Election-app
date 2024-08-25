const express = require("express");
const path = require("path");
const app = express();
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const session = require("express-session");
const { write } = require("fs");

// Set EJS as the templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for parsing form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware for static files
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  session({
    secret: "my-secret-key", // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

function isAuthenticated(req, res, next) {
  if (req.session.userInfo) {
    return next(); // User is authenticated, proceed to the next middleware/route
  } else {
    res.redirect("/login"); // User is not authenticated, redirect to login page
  }
}

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

let userInfo = {};
let current_user = {};
let contestant_idd = {};
let current_user_id = this.lastID;
console.log("User ID:" + current_user.id);
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
      email VARCHAR(100),
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
    `SELECT * FROM auth WHERE email = ? AND password = ?`,
    [loginInfo.loginEmail, loginInfo.loginPassword],
    (err, row) => {
      if (err) {
        console.log(err.message);
        return res.redirect("/login");
      }
      if (row) {
        req.session.userInfo = row;
        userInfo = req.session.userInfo; // Assign userInfo to the session's user info
        console.log("User Info Login Route:", userInfo);
        console.log("Login Successful!!");
        // current_user = row;
        res.redirect("/dashboard");
        // res.render("dashboard.ejs", { user: user });
      } else {
        console.log("Wrong credential");
        res.redirect("/login");
      }
    }
  );
});

app.get("/dashboard", isAuthenticated, (req, res) => {
  // if (!req.session.userInfo) {
  //   return res.redirect("/login"); // Redirect if not logged in
  // }
  const current_user = req.session.userInfo; // Retrieve the current logged-in user info
  console.log(`Dashboard user: ${current_user}`);
  db.all(`SELECT * FROM user WHERE role_id="voter"`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching users");
    }
    db.all(`SELECT * FROM candidates`, (err, candid) => {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Error fetching candidates");
      }

      const candidateName = candid;
      const totalCandidates = candid.length;
      const totalVoters = rows.length;

      res.render("dashboard", {
        totalVoters: totalVoters,
        totalCandidates: totalCandidates,
        current_user: current_user,
        candidateName: candidateName,
        // user: req.session.userInfo,
      });
    });

    // const user = req.session.user;
  });
});

app.get("/voterregistration", (req, res) => {
  db.all(`SELECT * FROM roles`, [], (err, roles) => {
    if (err) {
      console.error(err.message);
      return res.redirect("/voterregistration");
    }

    db.all(`SELECT * FROM parties`, [], (err, parties) => {
      if (err) {
        console.error(err.message);
        return res.redirect("/voterregistration");
      }

      db.all(`SELECT * FROM positions`, [], (err, positions) => {
        if (err) {
          console.error(err.message);
          return res.redirect("/voterregistration");
        }

        // Render the view after all queries are complete
        res.render("voter_registration.ejs", {
          roles: roles,
          parties: parties,
          positions: positions,
        });
      });
    });
  });
});

app.post("/voterregistration", upload.single("photo"), (req, res) => {
  const voterData = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    email: req.body.email,
    userName: req.body.userName,
    DateOfBirth: req.body.dob,
    role: req.body.role,
    party: req.body.party,
    position: req.body.position,
    password: req.body.password,
    photo: req.file ? req.file.path : null, // Save the file path
  };

  console.log(voterData);

  const insertAuth = (userId) => {
    db.run(
      `INSERT INTO auth (user_name, email, password, user_id) VALUES (?, ?, ?, ?)`,
      [voterData.userName, voterData.email, voterData.password, userId],
      function (err) {
        if (err) {
          return console.log("Auth Table Insert Error: ", err.message);
        }
        console.log("Auth Data:", voterData);
        res.redirect("/login");
      }
    );
  };

  if (voterData.role === "candidate") {
    db.serialize(() => {
      db.run(
        `INSERT INTO candidates (first_name, middle_name, last_name, position_id, photo, party_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          voterData.firstName,
          voterData.middleName,
          voterData.lastName,
          voterData.position,
          voterData.photo,
          voterData.party,
        ],
        function (err) {
          if (err) {
            return console.log("Candidates Table Insert Error: ", err.message);
          }
          
          const candidateId = this.lastID;
          db.run(
            `INSERT INTO auth (user_name, email, password, user_id) VALUES (?, ?, ?, ?)`,
            [
              voterData.userName,
              voterData.email,
              voterData.password,
              candidateId,
            ],
            function (err) {
              if (err) {
                return console.log("Auth Table Insert Error: ", err.message);
              }
              console.log("Candidate Data:", voterData);
              res.redirect("/login");
            }
          );
        }
      );
    });
  } else {
    db.serialize(() => {
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
          voterData.photo,
          null,
        ],
        function (err) {
          if (err) {
            return console.log("User Table Insert Error: ", err.message);
          }
          const userId = this.lastID;
          insertAuth(userId);
        }
      );
    });
  }
});

app.get("/voter", (req, res) => {
  db.all(`SELECT * FROM user WHERE role_id="voter"`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching users");
    }
    // db.run(`SELECT `)

    let idd = 1;
    const totalVoters = rows;
    res.render("voter", {
      totalVoters: totalVoters,
      idd: idd,
    });
    // const user = req.session.user;
  });

  // res.render("voter.ejs");
});

app.get("/parties", (req, res) => {
  db.all(`SELECT * FROM parties`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching parties");
    }
    res.render("parties", { parties: rows });
  });
});

app.get("/contestants", (req, res) => {
  db.all(`SELECT * FROM candidates`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching contestants");
    }
    res.render("contestant", { contestants: rows });
  });
});

app.post("/votecontestant", (req, res) => {
  const current_user = req.session.userInfo;

  const contestant_voted = {
    contestant_id: req.body.candidateId,
  };

  contestant_idd = contestant_voted;

  console.log(contestant_voted);
  console.log(contestant_idd);

  db.run(
    `UPDATE user SET vote_id = ? WHERE id = ?`,
    ["TRUE", current_user.user_id],
    function (err) {
      if (err) {
        return console.log(err.message);
      }

      res.redirect("/voter");
    }
  );
});

app.get("/votecontestant", (req, res) => {
  const current_user = req.session.userInfo;
  console.log(contestant_idd);
  db.all(`SELECT * FROM candidates`, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Error fetching contestants");
    }
    db.run(
      `INSERT INTO votes (candidate_id, vote, user_id) VALUES (?, ?, ?)`,
      [contestant_idd.contestant_id, 1, current_user.id],
      function (err) {
        if (err) {
          return console.log("Votes Table Insert Error: ", err.message);
        }
        // console.log("Candidae Data:", rows);
      }
    );
    res.render("vote_contestant", { contestants: rows });
  });
});

app.get("/", (req, res) => {
  res.redirect("/voterregistration");
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
