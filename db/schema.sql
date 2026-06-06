-- ============================================================
-- E-Billing Dashboard — Database Schema v3 (SQLite, 3NF)
-- Custom bill templates, revenue-only, per-user company profile
-- ============================================================

-- Users table (authentication, authorization & company profile)
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    display_name    TEXT    NOT NULL,
    email           TEXT,
    password_hash   TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'user'
                        CHECK(role IN ('admin', 'user')),
    -- Company profile (printed on bills)
    bill_title      TEXT,              -- e.g. "TAX INVOICE", "BILL", or NULL to hide
    company_name    TEXT,
    company_subtitle TEXT,
    company_address TEXT,
    company_phones  TEXT,          -- comma-separated phone numbers
    company_gstin   TEXT,
    company_pan     TEXT,
    company_wef     TEXT,          -- W.E.F. date string
    bank_details    TEXT,          -- JSON: [{bank, branch, account, ifsc}]
    -- Tax defaults
    default_cgst    REAL    NOT NULL DEFAULT 0,
    default_sgst    REAL    NOT NULL DEFAULT 0,
    created_by      INTEGER,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Bill template columns — defines custom line-item columns per user
CREATE TABLE IF NOT EXISTS bill_columns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    col_name    TEXT    NOT NULL,             -- e.g. "Particulars", "Bags", "Kgs."
    col_type    TEXT    NOT NULL DEFAULT 'text'
                    CHECK(col_type IN ('text', 'number')),
    col_order   INTEGER NOT NULL,            -- display order (1,2,3...)
    is_rate     INTEGER NOT NULL DEFAULT 0,  -- 1 = this is the rate column
    is_qty      INTEGER NOT NULL DEFAULT 0,  -- 1 = this is the quantity column
    is_amount   INTEGER NOT NULL DEFAULT 0,  -- 1 = this is the computed amount column
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recipient fields — defines what recipient details each user collects
CREATE TABLE IF NOT EXISTS recipient_fields (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    field_name  TEXT    NOT NULL,             -- e.g. "Name", "Address", "GSTIN/UIN"
    field_order INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Footer fields — defines custom footer fields per user (e.g. E-Way Bill, Transporter)
CREATE TABLE IF NOT EXISTS footer_fields (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    field_name  TEXT    NOT NULL,             -- e.g. "E-Way Bill No.", "Transporter"
    field_order INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Clients table (scoped per user, dynamic recipient data)
CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    recipient_data  TEXT    NOT NULL DEFAULT '{}',   -- JSON: {"Name":"...","Address":"..."}
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Bills table (no status — just generated bills for revenue tracking)
CREATE TABLE IF NOT EXISTS bills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number   TEXT    NOT NULL,
    client_id       INTEGER NOT NULL,
    user_id         INTEGER NOT NULL,
    bill_date       TEXT    NOT NULL,
    subtotal        INTEGER NOT NULL DEFAULT 0,   -- in paise
    cgst_rate       REAL    NOT NULL DEFAULT 0,
    sgst_rate       REAL    NOT NULL DEFAULT 0,
    cgst_amount     INTEGER NOT NULL DEFAULT 0,   -- in paise
    sgst_amount     INTEGER NOT NULL DEFAULT 0,   -- in paise
    other_charges   INTEGER NOT NULL DEFAULT 0,   -- in paise
    round_off       INTEGER NOT NULL DEFAULT 0,   -- in paise (can be negative)
    grand_total     INTEGER NOT NULL DEFAULT 0,   -- in paise
    amount_in_words TEXT,
    footer_data     TEXT    DEFAULT '{}',          -- JSON: {"E-Way Bill No.":"..."}
    notes           TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Line items table (dynamic column values stored as JSON)
CREATE TABLE IF NOT EXISTS line_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id     INTEGER NOT NULL,
    sl_no       INTEGER NOT NULL,
    col_values  TEXT    NOT NULL DEFAULT '{}',   -- JSON: {"Particulars":"...","Bags":5}
    rate        INTEGER NOT NULL DEFAULT 0,      -- in paise
    amount      INTEGER NOT NULL DEFAULT 0,      -- in paise
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);
