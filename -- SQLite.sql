-- SQLite
        CREATE TABLE IF NOT EXISTS callback_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          collegeId TEXT,
          collegeName TEXT,
          mobileNumber TEXT CHECK(LENGTH(mobileNumber) = 10),
          callbackDate DATE,
          callbackTime TIME,
          requestTime DATETIME DEFAULT CURRENT_TIMESTAMP
        );