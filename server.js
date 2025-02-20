require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require('sqlite3').verbose();
const {open} = require('sqlite')

const fs = require("fs");
const path = require("path");


const app = express(); 
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(bodyParser.json());


let db
const initializeDBandServer = async() => {
  try {
    db = await open({
      filename: path.join(__dirname, "colleges.db"),
      driver: sqlite3.Database,
    });
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
    
  } catch (error) {
    console.log(`Db error is ${error.message}`);
    process.exit(1);
  }
};

initializeDBandServer();
// const database = async () => {
//     try {
//       await db.exec(`
//         CREATE TABLE IF NOT EXISTS users (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           username TEXT NOT NULL,
//           email TEXT NOT NULL UNIQUE,
//           password TEXT NOT NULL
//         );
  
//         CREATE TABLE IF NOT EXISTS colleges (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           name TEXT NOT NULL,
//           location TEXT NOT NULL,
//           courses TEXT NOT NULL,
//           fees INTEGER NOT NULL,
//           description TEXT NOT NULL
//         );
  
//         CREATE TABLE IF NOT EXISTS search_history (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           user_id INTEGER NOT NULL,
//           college_id INTEGER NOT NULL,
//           search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//           FOREIGN KEY (user_id) REFERENCES users(id),
//           FOREIGN KEY (college_id) REFERENCES colleges(id)
//         );
  
//         CREATE TABLE IF NOT EXISTS user_preferences (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           user_id INTEGER NOT NULL,
//           location TEXT NOT NULL,
//           course TEXT NOT NULL,
//           budget INTEGER NOT NULL,
//           FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//         );
  
//         CREATE TABLE IF NOT EXISTS favorite_college (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           user_id INTEGER NOT NULL,
//           college_id INTEGER NOT NULL
//         );
  
//         CREATE TABLE IF NOT EXISTS callback_requests (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           userId TEXT,
//           collegeId TEXT,
//           collegeName TEXT,
//           mobileNumber TEXT CHECK(LENGTH(mobileNumber) = 10),
//           callbackDate DATE,
//           callbackTime TIME,
//           requestTime DATETIME DEFAULT CURRENT_TIMESTAMP
//         );
//       `);
      
//       console.log("Database initialized successfully");
//     } catch (error) {
//       console.error("Database initialization failed:", error);
//     }
//   };
// db.close();

// Serve course and location suggestions
app.get("/suggestions", async (req, res) => {
    const filePath = path.join(__dirname, "suggestions.json");
    try {
        const data = await fs.promises.readFile(filePath, "utf8");
        res.json(JSON.parse(data));
    } catch (err) {
        return res.status(500).json({ message: "Error loading suggestions" });
    }
});

// Import colleges from JSON file into database
// app.post("/importColleges", async (req, res) => {
//     try {
//         const filePath = path.join(__dirname, "colleges.json");
//         const data = await fs.promises.readFile(filePath, "utf8");
//         const colleges = JSON.parse(data);

//         for (const college of colleges) {
//             const { id, name, location, courses, fees, description } = college;

//             const collegeQuery = `
//                 INSERT INTO colleges (id, name, location, courses, fees, description) 
//                 VALUES (?, ?, ?, ?, ?, ?) 
//                 ON DUPLICATE KEY UPDATE name=?, location=?, courses=?, fees=?, description=?
//             `;

//             await db.query(collegeQuery, [id, name, location, courses.join(","), fees, description, name, location, courses.join(","), fees, description]);
//         }

//         res.json({ message: "Colleges data imported successfully!" });
//     } catch (error) {
//         console.error("Error importing colleges:", error);
//         res.status(500).json({ message: "Error importing colleges" });
//     }
// });

// User Signup
app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;

        const result = await db.run(query, [username, email, hashedPassword]);
        const userId = result.insertId;
        const token = jwt.sign({ userId }, "your_secret_key", { expiresIn: "1h" });

        res.status(201).json({ message: "User created successfully", token, userId });
    } catch (error) {
        res.status(500).json({ message: "Signup failed", error });
    }
});

// User Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const query = `select id, password from users WHERE email = '${email}';`;

        const results = await db.get(query);
        if (results !== undefined) {
            const userId = results.id;
            const hashedPassword = results.password;

            const isMatch = await bcrypt.compare(password, hashedPassword);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Generate JWT token
            const token = jwt.sign({ userId }, "your_secret_key", { expiresIn: "1h" });

            res.json({ message: "Login successful!", token, userId });
        } else {
            res.status(401).json({ error: "User not available! Please signup." });
        }
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// College Recommendations
app.post("/recommend", async (req, res) => {
    try {
        const { preferences, userId } = req.body;
        if (!userId) return res.status(400).json({ message: "User not authenticated" });

        let query = "SELECT * FROM colleges WHERE 1=1";
        const queryParams = [];

        if (preferences.location) {
            query += " AND location LIKE ?";
            queryParams.push(`%${preferences.location}%`);
        }
        if (preferences.course) {
            query += " AND courses LIKE ?";
            queryParams.push(`%${preferences.course}%`);
        }
        if (preferences.budget) {
            query += " AND fees <= ?";
            queryParams.push(preferences.budget);
        }

        const result = await db.all(query, queryParams);

        if (result.length > 0) {
            for (const college of result) {
                await db.run("INSERT INTO search_history (user_id, college_id) VALUES (?, ?)", [userId, college.id]);
            }
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error fetching recommendations", error });
    }
});

// Get all colleges
app.get("/colleges", async (req, res) => {
    try {
        const colleges = await db.all("SELECT * FROM colleges");
        // res.json(colleges);
    } catch (error) {
        res.status(500).json({ message: "Error fetching colleges", error });
    }
});

// Save user preferences
app.post("/savePreferences", async (req, res) => {
    const { userId, location, course, budget } = req.body;

    if (!userId || !location || !course || !budget) {
        return res.status(400).json({ error: "All fields are required" });
    }

    const query = "INSERT INTO user_preferences (user_id, location, course, budget) VALUES (?, ?, ?, ?)";
    try {
        await db.run(query, [userId, location, course, budget]);
        res.json({ message: "Preferences saved successfully!" });
        
    } catch (err) {
        console.error("Error inserting user preferences:", err);
        return res.status(500).json({ error: "Database error" });
    }
});
 
// Get user preferences
app.get('/api/user-preferences/:userId', async (req, res) => {
    const userId = req.params.userId;
    // console.log("📌 Received userId:", userId);

    try {
        const rows = await db.all('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);

        // console.log("📌 Database Query Result:", rows);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'No preferences found for this user.' });
        }

        res.json(rows);
    } catch (err) {
        console.error("🔥 Database error:", err.message || err);
        res.status(500).json({ error: 'Database error', details: err.message || err });
    }
});

// delete a preference
app.delete("/api/deletePreference", async (req, res) => {
    const { userId, preferenceId } = req.body;
    // console.log(req.body)
    if (!userId || !preferenceId) {
        return res.status(400).json({ error: "User ID and Preference ID are required" });
    }

    try {
        console.log("Trying to delete user preference:", { userId, preferenceId });

        const result = await db.run(
            "DELETE FROM user_preferences WHERE user_id = ? AND id = ?",
            [userId, preferenceId]
        ); 

        // console.log("Delete query result:", result);
        // console.log(result.length)
        res.json({ message: "Preference deleted successfully" });
        // if (result.length > 0) {
        //     res.json({ message: "Preference deleted successfully" });
        // } else {
        //     res.status(400).json({ error: "Preference not found" });
        // }
    } catch (error) {
        console.error("Error while deleting preference:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/favorites/toggle", async (req, res) => {
    try {
        const { userId, collegeId } = req.body;

        if (!userId || !collegeId) {
            return res.status(400).json({ message: "User ID and College ID are required" });
        }

        // Check if the college is already in favorites
        const rows = await db.all(
            "SELECT * FROM favorite_college WHERE user_id = ? AND college_id = ?",
            [userId, collegeId]
        );

        if (rows.length > 0) {
            // College already in favorites, so remove it
            await db.all("DELETE FROM favorite_college WHERE user_id = ? AND college_id = ?", [userId, collegeId]);
            return res.json({ message: "College removed from favorites", favorite: false });
        } else {
            // College not in favorites, so add it
            await db.run("INSERT INTO favorite_college (user_id, college_id) VALUES (?, ?)", [userId, collegeId]);
            return res.json({ message: "College added to favorites", favorite: true });
        }
    } catch (error) {
        res.status(500).json({ message: "Error toggling favorite", error });
    }
});

app.get("/api/favorites", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const rows = await db.all("SELECT college_id FROM favorite_college WHERE user_id = ?", [userId]);

        const favoriteCollegeIds = rows.map(row => row.college_id);

        res.json(favoriteCollegeIds);
    } catch (error) {
        res.status(500).json({ message: "Error fetching favorites", error });
    }
});

app.post("/api/callback-requests", async (req, res) => {
    const { userId, collegeId, collegeName, mobileNumber, callbackDate, callbackTime, requestTime } = req.body;
  
    if (!userId || !collegeId || !mobileNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      // Format requestTime properly for MySQL
      const requestTimeFormatted = new Date(requestTime).toISOString().slice(0, 19).replace("T", " ");
  
      await db.execute(
        `INSERT INTO callback_requests (userId, collegeId, collegeName, mobileNumber, callbackDate, callbackTime, requestTime) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, collegeId, collegeName, mobileNumber, callbackDate, callbackTime, requestTimeFormatted]
      );
  
      res.status(201).json({ message: "Callback request submitted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Database error" });
    }
  });

// app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
