CREATE DATABASE college_recommendation;

USE college_recommendation;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  courses TEXT NOT NULL,
  fees INT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE search_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  college_id INT NOT NULL,
  search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (college_id) REFERENCES colleges(id)
);

CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  course VARCHAR(255) NOT NULL,
  budget INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
 
CREATE TABLE favorite_college (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    college_id INT NOT NULL
);

CREATE TABLE callback_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255),
    collegeId VARCHAR(255),
    collegeName VARCHAR(255),
    mobileNumber VARCHAR(10),
    callbackDate DATE,
    callbackTime TIME,
    requestTime DATETIME
);
