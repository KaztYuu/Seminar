CREATE DATABASE FoodTourVinhKhanh;
USE FoodTourVinhKhanh;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('tourist','vendor','admin'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	is_Blocked BOOLEAN DEFAULT FALSE,
	is_Deleted BOOLEAN DEFAULT FALSE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE shops (
	id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT,
    name VARCHAR(255),
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	is_Active BOOLEAN DEFAULT TRUE,
	is_Deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (owner_id) REFERENCES users(id)
		ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE shop_position (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT,
    latitude DOUBLE,
    longitude DOUBLE,
    range_meter INT,
    FOREIGN KEY (shop_id) REFERENCES shops(id)
		ON DELETE CASCADE
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE shop_localized_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT,
    lang_code VARCHAR(10),
    name VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),
    FOREIGN KEY (shop_id) REFERENCES shops(id)
		ON DELETE CASCADE
        ON UPDATE CASCADE,
	UNIQUE(shop_id, lang_code)
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10,2),
    payment_type ENUM('tourist','vendor'),
    payment_method VARCHAR(50),
	status ENUM('pending','success','failed'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
		ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE tourist_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_time DATETIME,
    end_time DATETIME,
    payment_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id)
		ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
		ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE vendor_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT,
    start_time DATETIME,
    expire_time DATETIME,
    payment_id INT,
    FOREIGN KEY (shop_id) REFERENCES shops(id)
		ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id)
		ON DELETE SET NULL
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;