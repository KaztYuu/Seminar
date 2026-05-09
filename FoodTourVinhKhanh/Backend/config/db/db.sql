CREATE DATABASE FoodTourVinhKhanh;
USE FoodTourVinhKhanh;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    phoneNumber VARCHAR(15),
    role ENUM('tourist', 'vendor', 'admin'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_Blocked BOOLEAN DEFAULT FALSE,
    is_Deleted BOOLEAN DEFAULT FALSE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE pois (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT,
    name VARCHAR(255),
    thumbnail VARCHAR(255),
    banner VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_Active BOOLEAN DEFAULT FALSE,
    -- FEATURE 1
    status ENUM('approved', 'pending', 'rejected') NOT NULL DEFAULT 'pending',
    is_Deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_position (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    latitude DOUBLE,
    longitude DOUBLE,
    range_meter INT,
    -- Phạm vi chung (legacy, không dùng nữa)
    audio_range INT DEFAULT 30,
    -- Bán kính (mét) kích hoạt phát thuyết minh
    access_range INT DEFAULT 10,
    -- Bán kính (mét) coi là đã đến POI
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_localized_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    lang_code VARCHAR(10),
    name VARCHAR(255),
    description TEXT,
    audio_url VARCHAR(255),
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE(poi_id, lang_code)
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE subscription_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    price DECIMAL(10, 2),
    duration_hours INT,
    is_Active BOOLEAN DEFAULT TRUE,
    -- Số POI tối đa Vendor được tạo trong 1 ngày
    poi_create_limit INT DEFAULT 1,
    is_default BOOLEAN DEFAULT FALSE,
    is_protected BOOLEAN DEFAULT FALSE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    amount DECIMAL(10, 2),
    package_id INT,
    transaction_ref VARCHAR(100) UNIQUE,
    payment_method VARCHAR(50),
    status ENUM('pending', 'success', 'failed'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE vendor_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_time DATETIME,
    end_time DATETIME,
    payment_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE
    SET NULL ON UPDATE CASCADE
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE poi_knowledge_base (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poi_id INT,
    category ENUM('menu', 'history', 'promotion', 'other'),
    content TEXT,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE tours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_Active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
CREATE TABLE tour_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tour_id INT NOT NULL,
    poi_id INT NOT NULL,
    point_order INT NOT NULL,                 -- Thứ tự điểm dừng trong Tour
    FOREIGN KEY (tour_id) REFERENCES tours(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (poi_id) REFERENCES pois(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
