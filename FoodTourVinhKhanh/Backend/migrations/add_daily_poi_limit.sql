-- Migration: Add daily_poi_limit to subscription_packages
-- This field stores the maximum number of POIs a vendor can create per day
ALTER TABLE subscription_packages
ADD COLUMN daily_poi_limit INT DEFAULT 1;
-- Update existing packages with defaults (assuming FREE=1, PAID=5)
-- Adjust based on your specific tier definitions
UPDATE subscription_packages
SET daily_poi_limit = 1
WHERE name LIKE '%Miễn phí%'
    OR name LIKE '%Free%'
    OR price = 0;
UPDATE subscription_packages
SET daily_poi_limit = 5
WHERE name NOT LIKE '%Miễn phí%'
    AND name NOT LIKE '%Free%'
    AND price > 0;