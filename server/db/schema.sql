-- AutoServe AI Platform - PostgreSQL Schema

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'agent')),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_profiles (
    id            SERIAL PRIMARY KEY,
    user_id       INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    is_available  BOOLEAN DEFAULT TRUE,
    specialty     VARCHAR(50) CHECK (specialty IN ('critical', 'mechanical', 'electrical_diagnostic', 'general')),
    max_cases     INT DEFAULT 5,
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id            SERIAL PRIMARY KEY,
    customer_id   INT REFERENCES users(id) ON DELETE CASCADE,
    make          VARCHAR(100),
    model         VARCHAR(100),
    year          INT,
    vin           VARCHAR(50),
    mileage       INT,
    warranty_end  DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL PRIMARY KEY,
    customer_id     INT REFERENCES users(id) ON DELETE SET NULL,
    assigned_agent  INT REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(30) NOT NULL CHECK (category IN ('critical', 'mechanical', 'electrical_diagnostic')),
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'assigned', 'in_progress', 'scheduled', 'resolved', 'closed')),
    priority        INT DEFAULT 2,
    image_url       VARCHAR(500),
    vehicle_info    JSONB DEFAULT '{}',
    ai_diagnosis    TEXT,
    warranty_status VARCHAR(50) DEFAULT 'unknown',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    case_id     INT REFERENCES cases(id) ON DELETE CASCADE,
    sender_id   INT REFERENCES users(id) ON DELETE SET NULL,
    sender_role VARCHAR(20) CHECK (sender_role IN ('customer', 'agent', 'ai')),
    ai_bot      VARCHAR(30),
    content     TEXT NOT NULL,
    is_copilot  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id              SERIAL PRIMARY KEY,
    case_id         INT REFERENCES cases(id) ON DELETE CASCADE,
    customer_id     INT REFERENCES users(id) ON DELETE SET NULL,
    agent_id        INT REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    service_type    VARCHAR(100),
    location        VARCHAR(255) DEFAULT 'Service Center - Bay 1',
    status          VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_sessions (
    id          SERIAL PRIMARY KEY,
    case_id     INT REFERENCES cases(id) ON DELETE CASCADE,
    portal      VARCHAR(20) DEFAULT 'customer',
    bot_type    VARCHAR(30) NOT NULL,
    context     JSONB DEFAULT '[]',
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_customer   ON cases(customer_id);
CREATE INDEX IF NOT EXISTS idx_cases_agent      ON cases(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_cases_status     ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_category   ON cases(category);
CREATE INDEX IF NOT EXISTS idx_messages_case    ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_case ON appointments(case_id);

-- Seed 4 agent accounts (password: Agent@123)
-- bcrypt hash of 'Agent@123' with 10 rounds
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('agent1@autoserve.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Mike Johnson', 'agent'),
  ('agent2@autoserve.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sarah Williams', 'agent'),
  ('agent3@autoserve.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'David Chen', 'agent'),
  ('agent4@autoserve.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Lisa Rodriguez', 'agent')
ON CONFLICT (email) DO NOTHING;

INSERT INTO agent_profiles (user_id, is_available, specialty, max_cases)
SELECT id, TRUE,
  CASE
    WHEN email = 'agent1@autoserve.com' THEN 'critical'
    WHEN email = 'agent2@autoserve.com' THEN 'mechanical'
    WHEN email = 'agent3@autoserve.com' THEN 'electrical_diagnostic'
    WHEN email = 'agent4@autoserve.com' THEN 'general'
  END,
  5
FROM users WHERE role = 'agent'
ON CONFLICT (user_id) DO NOTHING;
