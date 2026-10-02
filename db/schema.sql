-- HBVS Database Schema v7.8.65
-- Run this to create a fresh database

CREATE TABLE IF NOT EXISTS Wrappers (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL
);

-- Add your other tables below as we build them
-- Example:
-- CREATE TABLE IF NOT EXISTS Verses (
--   id INTEGER PRIMARY KEY,
--   book TEXT,
--   chapter INTEGER,
--   verse INTEGER,
--   text TEXT
-- );