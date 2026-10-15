import { db as pool } from './db.js';

function toAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    publicId: row.public_id,
    role: row.role,
    roleLabel: row.role === 'admin' ? 'Quản trị viên' : 'Người dùng',
    salt: row.password_salt,
    passwordHash: row.password_hash,
    active: row.active,
    isDemo: row.is_demo,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

export async function initializeDatabase({ legacyAccounts = [], seedAdmin }) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) NOT NULL,
      role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      is_demo BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE SEQUENCE IF NOT EXISTS account_public_id_seq AS INTEGER START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE');
  await pool.query('ALTER TABLE accounts ADD COLUMN IF NOT EXISTS public_id VARCHAR(6)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS accounts_public_id_unique ON accounts (public_id)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_unique ON accounts (LOWER(email))');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_a TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      user_b TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (user_a < user_b),
      UNIQUE (user_a, user_b)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (requester_id, recipient_id),
      CHECK (requester_id <> recipient_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      member_a TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      member_b TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      hidden_by TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (member_a <> member_b),
      UNIQUE (member_a, member_b)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS direct_messages_conversation_created_idx ON direct_messages (conversation_id, created_at)');

  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM accounts');
  if (countRows[0].count === 0 && legacyAccounts.length) {
    for (const account of legacyAccounts) {
      await pool.query(
        `INSERT INTO accounts (id, name, email, role, password_salt, password_hash, active, is_demo, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [account.id, account.name, account.email, account.role === 'admin' ? 'admin' : 'user', account.salt, account.passwordHash, account.active !== false, Boolean(account.isDemo), account.createdAt || new Date()],
      );
    }
  }

  const { rows: afterImport } = await pool.query('SELECT COUNT(*)::int AS count FROM accounts');
  const { rows: adminRows } = await pool.query("SELECT COUNT(*)::int AS count FROM accounts WHERE role='admin' AND active=TRUE");
  if (afterImport[0].count === 0 || adminRows[0].count === 0) {
    const passwordIsPlaceholder = !seedAdmin?.password || /CHANGE_ME|replace_with|your_password/i.test(seedAdmin.password);
    if (!seedAdmin?.email || passwordIsPlaceholder || seedAdmin.password.length < 8) {
      throw new Error('PostgreSQL chưa có tài khoản. Hãy đặt INITIAL_ADMIN_EMAIL và INITIAL_ADMIN_PASSWORD trong backend/.env để tạo admin đầu tiên.');
    }
    await pool.query(
      `INSERT INTO accounts (id, name, email, role, password_salt, password_hash, active, is_demo, public_id)
       VALUES ($1,$2,$3,'admin',$4,$5,TRUE,FALSE,LPAD(NEXTVAL('account_public_id_seq')::text,6,'0'))`,
      [seedAdmin.id, seedAdmin.name, seedAdmin.email.toLowerCase(), seedAdmin.salt, seedAdmin.passwordHash],
    );
    console.log(`Đã tạo tài khoản admin ban đầu: ${seedAdmin.email}`);
  }
  await pool.query("UPDATE accounts SET public_id=LPAD(NEXTVAL('account_public_id_seq')::text,6,'0') WHERE public_id IS NULL");
}

export async function listAccounts() {
  const { rows } = await pool.query('SELECT * FROM accounts ORDER BY created_at ASC');
  return rows.map(toAccount);
}

export async function getAccountById(id) {
  const { rows } = await pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
  return toAccount(rows[0]);
}

export async function getAccountByPublicId(publicId) {
  const { rows } = await pool.query('SELECT * FROM accounts WHERE public_id = $1', [publicId]);
  return toAccount(rows[0]);
}

export async function getAccountByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM accounts WHERE LOWER(email) = LOWER($1)', [email]);
  return toAccount(rows[0]);
}

export async function createAccount(account) {
  const { rows } = await pool.query(
    `INSERT INTO accounts (id, name, email, role, password_salt, password_hash, active, is_demo, public_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,LPAD(NEXTVAL('account_public_id_seq')::text,6,'0')) RETURNING *`,
    [account.id, account.name, account.email, account.role, account.salt, account.passwordHash, account.active !== false, Boolean(account.isDemo)],
  );
  return toAccount(rows[0]);
}

export async function updateAccount(id, changes) {
  const account = await getAccountById(id);
  if (!account) return null;
  const next = { ...account, ...changes };
  const { rows } = await pool.query(
    `UPDATE accounts SET name=$2, email=$3, role=$4, password_salt=$5, password_hash=$6, active=$7
     WHERE id=$1 RETURNING *`,
    [id, next.name, next.email, next.role, next.salt, next.passwordHash, next.active],
  );
  return toAccount(rows[0]);
}

export async function deleteAccount(id) {
  const { rowCount } = await pool.query('DELETE FROM accounts WHERE id=$1', [id]);
  return rowCount > 0;
}

export async function accountCounts() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active)::int AS active FROM accounts');
  return rows[0];
}
