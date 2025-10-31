/*
  # Campaign Website Database Schema

  1. New Tables
    - `suggestions`
      - `id` (uuid, primary key) - Unique identifier for each suggestion
      - `name` (text) - Name of the person submitting (optional)
      - `email` (text) - Email of the person submitting (optional)
      - `message` (text, required) - The suggestion content
      - `created_at` (timestamptz) - Timestamp of submission
    
    - `polls`
      - `id` (uuid, primary key) - Unique identifier for each poll
      - `question` (text, required) - The poll question
      - `options` (jsonb, required) - Array of poll options
      - `is_active` (boolean) - Whether the poll is currently active
      - `created_at` (timestamptz) - Timestamp of creation
    
    - `poll_votes`
      - `id` (uuid, primary key) - Unique identifier for each vote
      - `poll_id` (uuid, foreign key) - Reference to the poll
      - `option_index` (integer, required) - Index of the selected option
      - `voter_ip` (text) - IP address for basic duplicate prevention
      - `created_at` (timestamptz) - Timestamp of vote

  2. Security
    - Enable RLS on all tables
    - Allow anonymous users to insert suggestions (public suggestion box)
    - Allow anonymous users to view active polls
    - Allow anonymous users to submit votes
    - Restrict poll management to authenticated users only
*/

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text DEFAULT '',
  email text DEFAULT '',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  options jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  voter_ip text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Suggestions policies (anyone can submit)
CREATE POLICY "Anyone can insert suggestions"
  ON suggestions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view suggestions"
  ON suggestions FOR SELECT
  TO authenticated
  USING (true);

-- Polls policies (anyone can view active polls)
CREATE POLICY "Anyone can view active polls"
  ON polls FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage polls"
  ON polls FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Poll votes policies (anyone can vote and view results)
CREATE POLICY "Anyone can insert votes"
  ON poll_votes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can view votes"
  ON poll_votes FOR SELECT
  TO anon
  USING (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_polls_active ON polls(is_active);
