-- Migration: Add is_default and is_protected flags to subscription_packages
-- Purpose: FEATURE 3 - Support DEFAULT and PROTECTED free plans
ALTER TABLE subscription_packages
ADD COLUMN is_default BOOLEAN DEFAULT FALSE
AFTER is_Active;
ALTER TABLE subscription_packages
ADD COLUMN is_protected BOOLEAN DEFAULT FALSE
AFTER is_default;
-- Add status field to pois for FEATURE 1 - Map API with approval status
-- status: 'approved' for active POIs, 'pending' for new POIs, 'rejected' for denied POIs
ALTER TABLE pois
ADD COLUMN status ENUM('approved', 'pending', 'rejected') DEFAULT 'pending'
AFTER is_Active;
-- Update existing POIs to be approved if they are active (migration from is_Active flag)
UPDATE pois
SET status = 'approved'
WHERE is_Active = TRUE
    AND is_Deleted = FALSE;
UPDATE pois
SET status = 'pending'
WHERE is_Active = FALSE
    AND is_Deleted = FALSE;