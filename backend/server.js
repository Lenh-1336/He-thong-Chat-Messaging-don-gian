import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createAccount, deleteAccount, getAccountByEmail, getAccountById, getAccountByPublicId, initializeDatabase, listAccounts, updateAccount } from './database.js';
import { db as pool } from './db.js';
import { sendPasswordResetOtp } from './email.js';

const here = dirname(fileURLToPath(import.meta.url));
const storePath = join(here, 'data', 'store.json');
const port = Number(process.env.PORT || 4000);
const passwordResetOtps = new Map();
const passwordResetLastSent = new Map();
const passwordResetPepper = randomBytes(32);

const seed = {
  chats: [
    { id: 1, name: 'Yến Phạm', avatar: 'YP', color: 'pink', preview: 'Dạ vâng, em gửi thông tin cho anh nhé.', time: '2 phút', channel: 'Messenger', unread: 2, tag: 'Chờ xử lý', online: true },
    { id: 2, name: 'Tuấn Anh', avatar: 'TA', color: 'green', preview: 'Cho mình hỏi về gói dịch vụ doanh nghiệp…', time: '8 phút', channel: 'Website', unread: 0, tag: 'Tư vấn', online: true },
    { id: 3, name: 'Minh Phú Hoàng', avatar: 'MH', color: 'orange', preview: 'Bên mình có hỗ trợ tích hợp API không ạ?', time: '12 phút', channel: 'Zalo', unread: 1, tag: 'Tiềm năng', online: false },
    { id: 4, name: 'Oanh Khcooi', avatar: 'OK', color: 'purple', preview: 'Cảm ơn bạn đã tư vấn rất chi tiết.', time: '23 phút', channel: 'Messenger', unread: 0, tag: 'Đã xử lý', online: false },
    { id: 5, name: 'Nguyễn Lan', avatar: 'NL', color: 'blue', preview: 'Mình muốn đặt lịch demo sản phẩm.', time: '31 phút', channel: 'Website', unread: 0, tag: 'Chờ xử lý', online: true },
    { id: 6, name: 'Khánh Phương', avatar: 'KP', color: 'yellow', preview: 'Cho mình xin bảng giá mới nhất nhé.', time: '45 phút', channel: 'Zalo', unread: 0, tag: 'Tư vấn', online: false },
    { id: 7, name: 'Bùi Văn Chiến', avatar: 'BC', color: 'teal', preview: 'Tôi đã nhận được tài liệu, cảm ơn!', time: '1 giờ', channel: 'Messenger', unread: 0, tag: 'Đã xử lý', online: false },
  ],
  messages: {
    1: [
      { id: 'm1', sender: 'customer', text: 'Xin chào, bên mình muốn tìm hiểu giải pháp chatbot AI để hỗ trợ chăm sóc khách hàng. Bạn có thể tư vấn thêm về các gói dịch vụ được không ạ?', time: '09:42' },
      { id: 'm2', sender: 'agent', text: 'Chào Yến Phạm! Cảm ơn bạn đã quan tâm đến giải pháp. Mình rất sẵn lòng tư vấn. Bạn đang vận hành kênh chăm sóc khách hàng nào vậy ạ?', time: '09:44' },
      { id: 'm3', sender: 'customer', text: 'Hiện tại bên mình có website và fanpage Facebook. Mỗi ngày khoảng 200–300 tin nhắn khách hàng ạ.', time: '09:46' },
    ],
  },
  users: [],
  accounts: [],
  leads: [],
  scenarios: [
    { id: 'welcome', name: 'Welcome', description: 'Chào mừng khách mới', message: 'Xin chào bạn! Mình có thể hỗ trợ gì cho bạn hôm nay?', published: true },
    { id: 'product', name: 'Tư vấn sản phẩm', description: 'Giới thiệu giải pháp', message: 'Bạn đang quan tâm đến giải pháp nào của A Lênh?', published: true },
    { id: 'care', name: 'Chăm sóc khách hàng', description: 'Sau mua hàng', message: 'A Lênh có thể hỗ trợ bạn như thế nào?', published: true },
    { id: 'support', name: 'Hỗ trợ kỹ thuật', description: 'Giải đáp thường gặp', message: 'Bạn vui lòng mô tả vấn đề kỹ thuật đang gặp phải nhé.', published: true },
  ],
};

async function readStore() {
  try {
    const data = JSON.parse(await readFile(storePath, 'utf8'));
    data.users ??= [];
    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(seed, null, 2));
    return structuredClone(seed);
  }
}

let store = await readStore();
const legacyAccounts = [...(store.accounts || []), ...(store.users || [])];
delete store.accounts;
delete store.users;
let writeQueue = Promise.resolve();
const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || '';
const initialAdminSalt = randomBytes(16).toString('hex');
await initializeDatabase({
  legacyAccounts,
  seedAdmin: {
    id: randomUUID(),
    name: process.env.INITIAL_ADMIN_NAME || 'Quản trị viên',
    email: process.env.INITIAL_ADMIN_EMAIL || '',
    password: initialAdminPassword,
    salt: initialAdminSalt,
    passwordHash: initialAdminPassword ? scryptSync(initialAdminPassword, initialAdminSalt, 64).toString('hex') : '',
  },
});
store.accounts = await listAccounts();
const sessions = new Map();
const eventClients = new Map();
function isOnline(accountId) { return (eventClients.get(accountId)?.size || 0) > 0; }
function publishEvent(accountId, event) {
  for (const client of eventClients.get(accountId) || []) client.write(`data: ${JSON.stringify(event)}\n\n`);
}
function publishPresence(accountId, online) {
  for (const [recipientId, clients] of eventClients) {
    if (recipientId !== accountId && clients.size) publishEvent(recipientId, { type: 'presence', accountId, online });
  }
}
function persist() {
  const { accounts, users, ...persistentStore } = store;
  const snapshot = JSON.stringify(persistentStore, null, 2);
  writeQueue = writeQueue.catch(() => {}).then(() => writeFile(storePath, snapshot));
  return writeQueue;
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw Object.assign(new Error('Nội dung gửi lên quá lớn.'), { status: 413 });
  }
  try { return body ? JSON.parse(body) : {}; }
  catch { throw Object.assign(new Error('Dữ liệu JSON không hợp lệ.'), { status: 400 }); }
}

function validText(value, field, max = 1000) {
  if (typeof value !== 'string' || !value.trim()) throw Object.assign(new Error(`${field} là bắt buộc.`), { status: 400 });
  if (value.trim().length > max) throw Object.assign(new Error(`${field} tối đa ${max} ký tự.`), { status: 400 });
  return value.trim();
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin && /^https?:\/\/localhost(?::\d+)?$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }

    try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/\/$/, '') || '/';
    if (request.method === 'POST' && path === '/api/auth/register') {
      const body = await readBody(request);
      const name = validText(body.fullName ?? body.name, 'Họ và tên', 120);
      const email = validText(body.email, 'Email', 180).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Email không hợp lệ.' });
      if (password.length < 8 || password.length > 128) return json(response, 400, { error: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
      if (await getAccountByEmail(email)) {
        return json(response, 409, { error: 'Email này đã được đăng ký.' });
      }
      const id = randomUUID();
      const salt = randomBytes(16).toString('hex');
      const user = {
        id, name, email, role: 'user', roleLabel: 'Người dùng', salt,
        passwordHash: scryptSync(password, salt, 64).toString('hex'), active: true, isDemo: false, createdAt: new Date().toISOString(),
      };
      const savedUser = await createAccount(user);
      store.accounts = await listAccounts();
      return json(response, 201, { agent: { id, name, email, publicId: savedUser.publicId, role: user.role, roleLabel: user.roleLabel } });
    }
    if (request.method === 'POST' && path === '/api/auth/password-reset/request') {
      const body = await readBody(request);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) return json(response, 400, { error: 'Vui lòng nhập email hợp lệ.' });
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || Number(process.env.SMTP_PORT || 465) !== 465) {
        return json(response, 503, { error: 'Chức năng gửi email chưa được cấu hình. Hãy liên hệ quản trị viên.' });
      }
      const now = Date.now();
      for (const [key, record] of passwordResetOtps) if (record.expiresAt <= now) passwordResetOtps.delete(key);
      const generic = { message: 'Nếu email có tài khoản hợp lệ, mã OTP sẽ được gửi trong giây lát.' };
      if (now - (passwordResetLastSent.get(email) || 0) < 60_000) {
        if (passwordResetOtps.get(email)?.expiresAt > now) return json(response, 200, generic);
        return json(response, 429, { error: 'Vui lòng chờ 60 giây trước khi yêu cầu mã mới.' });
      }
      passwordResetLastSent.set(email, now);
      const account = await getAccountByEmail(email);
      if (!account?.active) return json(response, 200, generic);
      const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
      const otpHash = createHash('sha256').update(passwordResetPepper).update(`${email}:${otp}`).digest();
      passwordResetOtps.set(email, { otpHash, expiresAt: now + 10 * 60_000, attempts: 0 });
      try {
        await sendPasswordResetOtp(email, otp);
      } catch (mailError) {
        passwordResetOtps.delete(email);
        passwordResetLastSent.delete(email);
        console.error('Không gửi được email đặt lại mật khẩu:', mailError.message);
      }
      return json(response, 200, generic);
    }
    if (request.method === 'POST' && path === '/api/auth/password-reset/confirm') {
      const body = await readBody(request);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const otp = typeof body.otp === 'string' ? body.otp.trim() : '';
      const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) return json(response, 400, { error: 'Email hoặc mã OTP chưa hợp lệ.' });
      if (newPassword.length < 8 || newPassword.length > 128) return json(response, 400, { error: 'Mật khẩu mới cần từ 8 đến 128 ký tự.' });
      const record = passwordResetOtps.get(email);
      if (!record || record.expiresAt <= Date.now()) {
        passwordResetOtps.delete(email);
        return json(response, 400, { error: 'Mã OTP đã hết hạn hoặc không tồn tại. Hãy yêu cầu mã mới.' });
      }
      record.attempts += 1;
      const suppliedHash = createHash('sha256').update(passwordResetPepper).update(`${email}:${otp}`).digest();
      if (record.attempts > 5 || !timingSafeEqual(record.otpHash, suppliedHash)) {
        if (record.attempts >= 5) passwordResetOtps.delete(email);
        return json(response, 400, { error: record.attempts >= 5 ? 'Bạn đã nhập sai quá số lần cho phép. Hãy yêu cầu mã OTP mới.' : 'Mã OTP không chính xác.' });
      }
      const account = await getAccountByEmail(email);
      if (!account?.active) {
        passwordResetOtps.delete(email);
        return json(response, 400, { error: 'Không thể đặt lại mật khẩu cho tài khoản này.' });
      }
      const salt = randomBytes(16).toString('hex');
      await updateAccount(account.id, { salt, passwordHash: scryptSync(newPassword, salt, 64).toString('hex') });
      passwordResetOtps.delete(email);
      for (const [sessionToken, sessionAgent] of sessions) if (sessionAgent.id === account.id) sessions.delete(sessionToken);
      return json(response, 200, { message: 'Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.' });
    }
    if (request.method === 'POST' && path === '/api/auth/login') {
      const body = await readBody(request);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const account = await getAccountByEmail(email);
      const suppliedHash = scryptSync(password, account?.salt || 'invalid-agent', 64);
      const expectedHash = Buffer.from(account?.passwordHash || scryptSync('invalid-password', 'invalid-agent', 64).toString('hex'), 'hex');
      if (!account || !account.active || !timingSafeEqual(suppliedHash, expectedHash)) {
        return json(response, 401, { error: 'Email hoặc mật khẩu chưa chính xác.' });
      }
      const token = randomBytes(32).toString('hex');
      const agent = { id: account.id, name: account.name, email: account.email, publicId: account.publicId, role: account.role, roleLabel: account.roleLabel };
      sessions.set(token, agent);
      return json(response, 200, { token, agent });
    }
    const token = request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || url.searchParams.get('token');
    let authenticatedAgent = token ? sessions.get(token) : null;
    if (authenticatedAgent) {
      const currentAccount = await getAccountById(authenticatedAgent.id);
      if (!currentAccount?.active) {
        sessions.delete(token);
        authenticatedAgent = null;
      } else {
        authenticatedAgent.name = currentAccount.name;
        authenticatedAgent.email = currentAccount.email;
        authenticatedAgent.role = currentAccount.role;
        authenticatedAgent.roleLabel = currentAccount.roleLabel;
        authenticatedAgent.publicId = currentAccount.publicId;
      }
    }
    if (request.method === 'GET' && path === '/api/auth/me') {
      if (!authenticatedAgent) return json(response, 401, { error: 'Phiên đăng nhập đã hết hạn.' });
      return json(response, 200, { agent: authenticatedAgent });
    }
    if (request.method === 'PATCH' && path === '/api/auth/profile') {
      if (!authenticatedAgent) return json(response, 401, { error: 'Vui lòng đăng nhập để tiếp tục.' });
      const account = await getAccountById(authenticatedAgent.id);
      if (!account) return json(response, 404, { error: 'Không tìm thấy tài khoản.' });
      const body = await readBody(request);
      const email = validText(body.email, 'Email', 180).toLowerCase();
      const name = validText(body.name, 'Họ và tên', 120);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Email không hợp lệ.' });
      const existingEmail = await getAccountByEmail(email);
      if (existingEmail && existingEmail.id !== account.id) return json(response, 409, { error: 'Email này đã được sử dụng.' });
      if (body.newPassword) {
        if (typeof body.oldPassword !== 'string') return json(response, 400, { error: 'Vui lòng nhập mật khẩu hiện tại.' });
        const oldHash = scryptSync(body.oldPassword, account.salt, 64);
        if (!timingSafeEqual(oldHash, Buffer.from(account.passwordHash, 'hex'))) return json(response, 400, { error: 'Mật khẩu hiện tại không chính xác.' });
        if (body.newPassword.length < 8 || body.newPassword.length > 128) return json(response, 400, { error: 'Mật khẩu mới cần từ 8 đến 128 ký tự.' });
        account.salt = randomBytes(16).toString('hex');
        account.passwordHash = scryptSync(body.newPassword, account.salt, 64).toString('hex');
      }
      await updateAccount(account.id, { ...account, name, email });
      store.accounts = await listAccounts();
      authenticatedAgent.name = name;
      authenticatedAgent.email = email;
      return json(response, 200, { agent: authenticatedAgent });
    }
    if (request.method === 'POST' && path === '/api/auth/logout') {
      if (token) sessions.delete(token);
      return json(response, 200, { ok: true });
    }
    if (path.startsWith('/api/') && path !== '/api/health' && !authenticatedAgent) {
      return json(response, 401, { error: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    if (/^\/api\/scenarios(?:\/[\w-]+)?$/.test(path) && authenticatedAgent?.role !== 'admin') {
      return json(response, 403, { error: 'Chỉ quản trị viên mới được truy cập kịch bản chatbot.' });
    }
    if (path.startsWith('/api/admin/') && authenticatedAgent?.role !== 'admin') {
      return json(response, 403, { error: 'Chỉ quản trị viên mới được truy cập khu vực quản trị.' });
    }
    if (request.method === 'GET' && path === '/api/events') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      response.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      const accountId = authenticatedAgent.id;
      const clients = eventClients.get(accountId) || new Set();
      const wasOnline = clients.size > 0;
      clients.add(response);
      eventClients.set(accountId, clients);
      if (!wasOnline) publishPresence(accountId, true);
      const heartbeat = setInterval(() => response.write(': keep-alive\n\n'), 25_000);
      response.on('close', () => {
        clearInterval(heartbeat);
        clients.delete(response);
        if (clients.size === 0) {
          eventClients.delete(accountId);
          publishPresence(accountId, false);
        }
      });
      return;
    }
    if (request.method === 'GET' && path === '/api/users') {
      const search = (url.searchParams.get('q') || '').trim();
      const idSearch = search.replace(/^AL-/i, '').replaceAll('-', '');
      const { rows } = await pool.query(
        `SELECT id, public_id, name, email, role FROM accounts
         WHERE active=TRUE AND id<>$1 AND ($2='' OR name ILIKE $3 OR email ILIKE $3 OR public_id ILIKE $3 OR id ILIKE $3 OR ($4<>'' AND REPLACE(LOWER(id),'-','') ILIKE LOWER($5)))
         ORDER BY name LIMIT 50`,
        [authenticatedAgent.id, search, `%${search}%`, idSearch, `%${idSearch}%`],
      );
      return json(response, 200, rows.map(user => ({ ...user, friendCode: user.public_id, roleLabel: user.role === 'admin' ? 'Quản trị viên' : 'Người dùng', online: isOnline(user.id) })));
    }
    if (request.method === 'GET' && path === '/api/friends') {
      const { rows } = await pool.query(
        `SELECT a.id, a.public_id, a.name, a.email, a.role FROM friends f
         JOIN accounts a ON a.id = CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
         WHERE (f.user_a=$1 OR f.user_b=$1) AND a.active=TRUE ORDER BY a.name`,
        [authenticatedAgent.id],
      );
      return json(response, 200, rows.map(friend => ({ ...friend, friendCode: friend.public_id, online: isOnline(friend.id) })));
    }
    if (request.method === 'GET' && path === '/api/friend-requests') {
      const { rows } = await pool.query(
        `SELECT r.id, r.requester_id, r.recipient_id, r.created_at,
           a.id AS other_id, a.public_id AS other_public_id, a.name AS other_name, a.email AS other_email
         FROM friend_requests r
         JOIN accounts a ON a.id = CASE WHEN r.requester_id=$1 THEN r.recipient_id ELSE r.requester_id END
         WHERE r.status='pending' AND (r.requester_id=$1 OR r.recipient_id=$1) AND a.active=TRUE
         ORDER BY r.created_at DESC`,
        [authenticatedAgent.id],
      );
      const mapRequest = item => ({ id: item.id, requesterId: item.requester_id, recipientId: item.recipient_id, userId: item.other_id, name: item.other_name, email: item.other_email, friendCode: item.other_public_id, createdAt: item.created_at });
      return json(response, 200, { incoming: rows.filter(item => item.recipient_id === authenticatedAgent.id).map(mapRequest), outgoing: rows.filter(item => item.requester_id === authenticatedAgent.id).map(mapRequest) });
    }
    if (request.method === 'POST' && path === '/api/friend-requests') {
      const body = await readBody(request);
      const suppliedId = (typeof body.userId === 'string' ? body.userId : typeof body.friendCode === 'string' ? body.friendCode : '').trim();
      const normalizedId = suppliedId.replace(/^AL-/i, '');
      const friend = /^\d{6}$/.test(normalizedId) ? await getAccountByPublicId(normalizedId) : await getAccountById(normalizedId.toLowerCase());
      if (!friend?.active || friend.role !== 'user') return json(response, 404, { error: 'Không tìm thấy người dùng bằng ID này.' });
      if (friend.id === authenticatedAgent.id) return json(response, 400, { error: 'Bạn không thể tự thêm chính mình.' });
      const [userA, userB] = [authenticatedAgent.id, friend.id].sort();
      const { rowCount: alreadyFriends } = await pool.query('SELECT 1 FROM friends WHERE user_a=$1 AND user_b=$2', [userA, userB]);
      if (alreadyFriends) return json(response, 409, { error: 'Hai bạn đã là bạn bè.' });
      const { rows: reverseRequests } = await pool.query("SELECT id FROM friend_requests WHERE requester_id=$1 AND recipient_id=$2 AND status='pending'", [friend.id, authenticatedAgent.id]);
      if (reverseRequests[0]) return json(response, 409, { error: 'Người này đã gửi lời mời cho bạn. Hãy chấp nhận lời mời trong mục Bạn bè.' });
      const { rows: existing } = await pool.query('SELECT id, status FROM friend_requests WHERE requester_id=$1 AND recipient_id=$2', [authenticatedAgent.id, friend.id]);
      let friendRequest;
      if (existing[0]) {
        if (existing[0].status === 'pending') return json(response, 409, { error: 'Bạn đã gửi lời mời cho người này rồi.' });
        const result = await pool.query("UPDATE friend_requests SET id=$3,status='pending',created_at=NOW() WHERE requester_id=$1 AND recipient_id=$2 RETURNING id", [authenticatedAgent.id, friend.id, randomUUID()]);
        friendRequest = result.rows[0];
      } else {
        const result = await pool.query('INSERT INTO friend_requests (id,requester_id,recipient_id) VALUES ($1,$2,$3) RETURNING id', [randomUUID(), authenticatedAgent.id, friend.id]);
        friendRequest = result.rows[0];
      }
      publishEvent(friend.id, { type: 'friend_request', requestId: friendRequest.id });
      return json(response, 201, { id: friendRequest.id, status: 'pending', userId: friend.id, name: friend.name, email: friend.email, friendCode: friend.publicId });
    }
    const friendRequestMatch = path.match(/^\/api\/friend-requests\/([\w-]+)$/);
    if (friendRequestMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      if (!['accept', 'reject'].includes(body.action)) return json(response, 400, { error: 'Chọn chấp nhận hoặc từ chối lời mời.' });
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query("SELECT * FROM friend_requests WHERE id=$1 AND recipient_id=$2 AND status='pending' FOR UPDATE", [friendRequestMatch[1], authenticatedAgent.id]);
        const friendRequest = rows[0];
        if (!friendRequest) {
          await client.query('ROLLBACK');
          return json(response, 404, { error: 'Lời mời không tồn tại hoặc đã được xử lý.' });
        }
        if (body.action === 'accept') {
          const [userA, userB] = [friendRequest.requester_id, friendRequest.recipient_id].sort();
          await client.query('INSERT INTO friends (user_a,user_b) VALUES ($1,$2) ON CONFLICT (user_a,user_b) DO NOTHING', [userA, userB]);
        }
        await client.query('UPDATE friend_requests SET status=$2 WHERE id=$1', [friendRequest.id, body.action === 'accept' ? 'accepted' : 'rejected']);
        await client.query('COMMIT');
        publishEvent(friendRequest.requester_id, { type: 'friend_request_updated', requestId: friendRequest.id });
        return json(response, 200, { ok: true, status: body.action === 'accept' ? 'accepted' : 'rejected' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }
    const friendMatch = path.match(/^\/api\/friends\/([\w-]+)$/);
    if (friendMatch && request.method === 'DELETE') {
      const [userA, userB] = [authenticatedAgent.id, friendMatch[1]].sort();
      const { rowCount } = await pool.query('DELETE FROM friends WHERE user_a=$1 AND user_b=$2', [userA, userB]);
      if (!rowCount) return json(response, 404, { error: 'Không tìm thấy bạn bè trong danh sách.' });
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && path === '/api/conversations') {
      const { rows } = await pool.query(
        `SELECT c.id, other.id AS user_id, other.name AS user_name, other.email AS user_email, other.role AS user_role,
           latest.body AS preview, latest.created_at AS last_message_at,
           COALESCE(unread.count, 0)::int AS unread
         FROM conversations c
         JOIN accounts other ON other.id = CASE WHEN c.member_a=$1 THEN c.member_b ELSE c.member_a END
         LEFT JOIN LATERAL (SELECT body, created_at FROM direct_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) latest ON TRUE
         LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM direct_messages WHERE conversation_id=c.id AND sender_id<>$1 AND read_at IS NULL) unread ON TRUE
         WHERE (c.member_a=$1 OR c.member_b=$1) AND NOT ($1 = ANY(c.hidden_by)) AND other.active=TRUE
         ORDER BY COALESCE(latest.created_at,c.updated_at) DESC`,
        [authenticatedAgent.id],
      );
      return json(response, 200, rows.map(conversation => ({ ...conversation, online: isOnline(conversation.user_id), time: conversation.last_message_at ? new Date(conversation.last_message_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '', preview: conversation.preview || 'Bắt đầu cuộc trò chuyện' })));
    }
    if (request.method === 'POST' && path === '/api/support/conversation') {
      if (authenticatedAgent.role !== 'user') return json(response, 403, { error: 'Chỉ tài khoản người dùng mới có thể mở hội thoại hỗ trợ.' });
      const { rows: admins } = await pool.query(
        "SELECT id, name, email, role FROM accounts WHERE role='admin' AND active=TRUE ORDER BY created_at ASC LIMIT 1",
      );
      const admin = admins[0];
      if (!admin) return json(response, 503, { error: 'Hiện chưa có quản trị viên hoạt động để hỗ trợ.' });
      const [memberA, memberB] = [authenticatedAgent.id, admin.id].sort();
      const { rows } = await pool.query(
        `INSERT INTO conversations (id, member_a, member_b) VALUES ($1,$2,$3)
         ON CONFLICT (member_a, member_b) DO UPDATE SET hidden_by=array_remove(conversations.hidden_by,$4)
         RETURNING id`,
        [randomUUID(), memberA, memberB, authenticatedAgent.id],
      );
      return json(response, 200, { id: rows[0].id, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, online: isOnline(admin.id) } });
    }
    if (request.method === 'POST' && path === '/api/conversations') {
      const body = await readBody(request);
      const target = await getAccountById(validText(body.userId, 'Người dùng', 120));
      if (!target?.active) return json(response, 404, { error: 'Không tìm thấy người dùng.' });
      if (target.id === authenticatedAgent.id) return json(response, 400, { error: 'Không thể tạo cuộc trò chuyện với chính mình.' });
      const [memberA, memberB] = [authenticatedAgent.id, target.id].sort();
      const id = randomUUID();
      const { rows } = await pool.query(
        `INSERT INTO conversations (id, member_a, member_b) VALUES ($1,$2,$3)
         ON CONFLICT (member_a, member_b) DO UPDATE SET hidden_by=array_remove(conversations.hidden_by,$4)
         RETURNING id`,
        [id, memberA, memberB, authenticatedAgent.id],
      );
      return json(response, 201, { id: rows[0].id, user: { id: target.id, name: target.name, email: target.email, role: target.role, online: isOnline(target.id) } });
    }
    let conversationMatch = path.match(/^\/api\/conversations\/([\w-]+)$/);
    if (conversationMatch && request.method === 'DELETE') {
      const { rowCount } = await pool.query(
        `UPDATE conversations SET hidden_by=CASE WHEN $2=ANY(hidden_by) THEN hidden_by ELSE array_append(hidden_by,$2) END
         WHERE id=$1 AND (member_a=$2 OR member_b=$2)`,
        [conversationMatch[1], authenticatedAgent.id],
      );
      if (!rowCount) return json(response, 404, { error: 'Không tìm thấy cuộc trò chuyện.' });
      return json(response, 200, { ok: true });
    }
    conversationMatch = path.match(/^\/api\/conversations\/([\w-]+)\/messages$/);
    if (conversationMatch && request.method === 'GET') {
      const conversationId = conversationMatch[1];
      const { rows: membership } = await pool.query('SELECT member_a, member_b FROM conversations WHERE id=$1 AND (member_a=$2 OR member_b=$2)', [conversationId, authenticatedAgent.id]);
      if (!membership[0]) return json(response, 404, { error: 'Không tìm thấy cuộc trò chuyện.' });
      const { rows: newlyRead } = await pool.query(
        `UPDATE direct_messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_id<>$2 AND read_at IS NULL RETURNING sender_id,id`,
        [conversationId, authenticatedAgent.id],
      );
      const readBySender = new Map();
      for (const message of newlyRead) readBySender.set(message.sender_id, [...(readBySender.get(message.sender_id) || []), message.id]);
      for (const [senderId, messageIds] of readBySender) publishEvent(senderId, { type: 'read', conversationId, messageIds, readerId: authenticatedAgent.id });
      const { rows: messages } = await pool.query(
        `SELECT m.id,m.conversation_id,m.sender_id,a.name AS sender_name,m.body,m.created_at,m.read_at
         FROM direct_messages m JOIN accounts a ON a.id=m.sender_id
         WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
        [conversationId],
      );
      return json(response, 200, messages.map(message => ({ id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, senderName: message.sender_name, text: message.body, time: new Date(message.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), createdAt: message.created_at, readAt: message.read_at })));
    }
    if (conversationMatch && request.method === 'POST') {
      const conversationId = conversationMatch[1];
      const body = await readBody(request);
      const text = validText(body.text, 'Tin nhắn', 4000);
      const { rows: members } = await pool.query('SELECT member_a, member_b FROM conversations WHERE id=$1 AND (member_a=$2 OR member_b=$2)', [conversationId, authenticatedAgent.id]);
      if (!members[0]) return json(response, 404, { error: 'Không tìm thấy cuộc trò chuyện.' });
      const id = randomUUID();
      const { rows } = await pool.query(
        `INSERT INTO direct_messages (id,conversation_id,sender_id,body) VALUES ($1,$2,$3,$4)
         RETURNING id,conversation_id,sender_id,body,created_at,read_at`,
        [id, conversationId, authenticatedAgent.id, text],
      );
      await pool.query('UPDATE conversations SET updated_at=NOW(),hidden_by=ARRAY[]::TEXT[] WHERE id=$1', [conversationId]);
      const message = { id, conversationId, senderId: authenticatedAgent.id, senderName: authenticatedAgent.name, text, time: new Date(rows[0].created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), createdAt: rows[0].created_at, readAt: null };
      const recipientId = members[0].member_a === authenticatedAgent.id ? members[0].member_b : members[0].member_a;
      publishEvent(recipientId, { type: 'message', message });
      publishEvent(authenticatedAgent.id, { type: 'message', message });
      return json(response, 201, message);
    }
    conversationMatch = path.match(/^\/api\/conversations\/([\w-]+)\/messages\/([\w-]+)$/);
    if (conversationMatch && request.method === 'DELETE') {
      const { rows } = await pool.query(
        `DELETE FROM direct_messages m USING conversations c
         WHERE m.id=$2 AND m.conversation_id=$1 AND m.sender_id=$3 AND c.id=m.conversation_id
           AND (c.member_a=$3 OR c.member_b=$3) RETURNING c.member_a,c.member_b`,
        [conversationMatch[1], conversationMatch[2], authenticatedAgent.id],
      );
      if (!rows[0]) return json(response, 404, { error: 'Không tìm thấy tin nhắn hoặc bạn không có quyền xóa tin này.' });
      const event = { type: 'message_deleted', conversationId: conversationMatch[1], messageId: conversationMatch[2] };
      publishEvent(rows[0].member_a, event); publishEvent(rows[0].member_b, event);
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && path === '/api/admin/users') {
      const accounts = await listAccounts();
      store.accounts = accounts;
      return json(response, 200, accounts.map(({ id, name, email, role, roleLabel, active, isDemo, createdAt }) => ({ id, name, email, role, roleLabel, active, isDemo, createdAt })));
    }
    if (request.method === 'POST' && path === '/api/admin/users') {
      const body = await readBody(request);
      const name = validText(body.name, 'Họ và tên', 120);
      const email = validText(body.email, 'Email', 180).toLowerCase();
      const password = typeof body.password === 'string' ? body.password : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Email không hợp lệ.' });
      if (password.length < 8 || password.length > 128) return json(response, 400, { error: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
      if (await getAccountByEmail(email)) return json(response, 409, { error: 'Email này đã được sử dụng.' });
      const salt = randomBytes(16).toString('hex');
      const user = { id: randomUUID(), name, email, role: body.role === 'admin' ? 'admin' : 'user', roleLabel: body.role === 'admin' ? 'Quản trị viên' : 'Người dùng', salt, passwordHash: scryptSync(password, salt, 64).toString('hex'), active: true, isDemo: false, createdAt: new Date().toISOString() };
      const savedUser = await createAccount(user);
      store.accounts = await listAccounts();
      const { passwordHash, salt: ignoredSalt, ...safeUser } = savedUser;
      return json(response, 201, safeUser);
    }
    let adminMatch = path.match(/^\/api\/admin\/users\/([\w-]+)$/);
    if (adminMatch && request.method === 'PATCH') {
      const user = await getAccountById(adminMatch[1]);
      if (!user) return json(response, 404, { error: 'Không tìm thấy tài khoản.' });
      const body = await readBody(request);
      if (body.name !== undefined) user.name = validText(body.name, 'Họ và tên', 120);
      if (body.email !== undefined) {
        const email = validText(body.email, 'Email', 180).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, 400, { error: 'Email không hợp lệ.' });
        const existingEmail = await getAccountByEmail(email);
        if (existingEmail && existingEmail.id !== user.id) return json(response, 409, { error: 'Email này đã được sử dụng.' });
        user.email = email;
      }
      if (body.role !== undefined) {
        if (!['admin', 'user'].includes(body.role)) return json(response, 400, { error: 'Vai trò không hợp lệ.' });
        if (user.id === authenticatedAgent.id && body.role !== 'admin') return json(response, 400, { error: 'Không thể hạ quyền tài khoản admin đang đăng nhập.' });
        const activeAdmins = (await listAccounts()).filter(item => item.role === 'admin' && item.active).length;
        if (user.role === 'admin' && user.active && body.role !== 'admin' && activeAdmins < 2) return json(response, 400, { error: 'Hệ thống cần ít nhất một admin đang hoạt động.' });
        user.role = body.role;
        user.roleLabel = body.role === 'admin' ? 'Quản trị viên' : 'Người dùng';
      }
      if (body.active !== undefined) {
        if (user.id === authenticatedAgent.id && body.active === false) return json(response, 400, { error: 'Không thể khóa tài khoản admin đang đăng nhập.' });
        const activeAdmins = (await listAccounts()).filter(item => item.role === 'admin' && item.active).length;
        if (user.role === 'admin' && body.active === false && activeAdmins < 2) return json(response, 400, { error: 'Hệ thống cần ít nhất một admin đang hoạt động.' });
        user.active = Boolean(body.active);
      }
      if (body.password) {
        if (body.password.length < 8 || body.password.length > 128) return json(response, 400, { error: 'Mật khẩu cần từ 8 đến 128 ký tự.' });
        user.salt = randomBytes(16).toString('hex');
        user.passwordHash = scryptSync(body.password, user.salt, 64).toString('hex');
      }
      const savedUser = await updateAccount(user.id, user);
      store.accounts = await listAccounts();
      const { passwordHash, salt: ignoredSalt, ...safeUser } = savedUser;
      return json(response, 200, safeUser);
    }
    if (adminMatch && request.method === 'DELETE') {
      const user = await getAccountById(adminMatch[1]);
      if (!user) return json(response, 404, { error: 'Không tìm thấy tài khoản.' });
      if (user.id === authenticatedAgent.id) return json(response, 400, { error: 'Không thể xóa tài khoản admin đang đăng nhập.' });
      if (user.role === 'admin' && (await listAccounts()).filter(item => item.role === 'admin' && item.active).length < 2) return json(response, 400, { error: 'Không thể xóa admin cuối cùng.' });
      await deleteAccount(user.id);
      store.accounts = await listAccounts();
      for (const [sessionToken, agent] of sessions) if (agent.id === user.id) sessions.delete(sessionToken);
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && path === '/api/admin/chats') {
      const { rows } = await pool.query(
        `SELECT c.id, other.id AS user_id, other.name AS user_name, other.email AS user_email,
           latest.body AS preview, latest.created_at AS last_message_at,
           COALESCE(unread.count, 0)::int AS unread
         FROM conversations c
         JOIN accounts other ON other.id = CASE WHEN c.member_a=$1 THEN c.member_b ELSE c.member_a END
         LEFT JOIN LATERAL (SELECT body, created_at FROM direct_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) latest ON TRUE
         LEFT JOIN LATERAL (SELECT COUNT(*) AS count FROM direct_messages WHERE conversation_id=c.id AND sender_id<>$1 AND read_at IS NULL) unread ON TRUE
         WHERE (c.member_a=$1 OR c.member_b=$1) AND NOT ($1 = ANY(c.hidden_by)) AND other.active=TRUE
         ORDER BY COALESCE(latest.created_at,c.updated_at) DESC`,
        [authenticatedAgent.id],
      );
      return json(response, 200, rows.map(chat => ({
        ...chat,
        online: isOnline(chat.user_id),
        time: chat.last_message_at ? new Date(chat.last_message_at).toLocaleString('vi-VN') : '',
        preview: chat.preview || 'Chưa có tin nhắn',
      })));
    }
    adminMatch = path.match(/^\/api\/admin\/chats\/(\d+)\/messages$/);
    if (adminMatch && request.method === 'GET') return json(response, 200, { chat: store.chats.find(chat => chat.id === Number(adminMatch[1])) || null, messages: store.messages[adminMatch[1]] || [] });
    adminMatch = path.match(/^\/api\/admin\/chats\/(\d+)\/messages\/([\w-]+)$/);
    if (adminMatch && request.method === 'DELETE') {
      const messages = store.messages[adminMatch[1]] || [];
      const index = messages.findIndex(message => message.id === adminMatch[2]);
      if (index < 0) return json(response, 404, { error: 'Không tìm thấy tin nhắn.' });
      messages.splice(index, 1);
      await persist();
      return json(response, 200, { ok: true });
    }
    if (request.method === 'GET' && path === '/api/admin/stats') {
      const { rows } = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM accounts WHERE is_demo=FALSE) AS users,
           (SELECT COUNT(*)::int FROM accounts WHERE is_demo=FALSE AND active=TRUE) AS active_users,
           (SELECT COUNT(*)::int FROM conversations c
             WHERE (c.member_a=$1 OR c.member_b=$1) AND NOT ($1 = ANY(c.hidden_by))) AS chats,
           (SELECT COUNT(*)::int FROM direct_messages m JOIN conversations c ON c.id=m.conversation_id
             WHERE (c.member_a=$1 OR c.member_b=$1) AND NOT ($1 = ANY(c.hidden_by))) AS messages`,
        [authenticatedAgent.id],
      );
      const stats = rows[0];
      return json(response, 200, { users: stats.users, activeUsers: stats.active_users, chats: stats.chats, messages: stats.messages });
    }
    if (request.method === 'GET' && path === '/api/health') {
      await pool.query('SELECT 1');
      return json(response, 200, { ok: true, service: 'alenh-messaging-api', database: 'connected' });
    }
    if (request.method === 'GET' && path === '/api/chats') return json(response, 200, store.chats);
    let match = path.match(/^\/api\/chats\/(\d+)$/);
    if (match && request.method === 'PATCH') {
      const chat = store.chats.find(item => item.id === Number(match[1]));
      if (!chat) return json(response, 404, { error: 'Không tìm thấy hội thoại.' });
      const body = await readBody(request);
      if (body.unread !== undefined) chat.unread = Math.max(0, Number(body.unread) || 0);
      await persist();
      return json(response, 200, chat);
    }
    match = path.match(/^\/api\/chats\/(\d+)\/messages$/);
    if (match && request.method === 'GET') return json(response, 200, store.messages[match[1]] || []);
    if (match && request.method === 'POST') {
      const body = await readBody(request);
      const chat = store.chats.find(item => item.id === Number(match[1]));
      if (!chat) return json(response, 404, { error: 'Không tìm thấy hội thoại.' });
      const message = { id: randomUUID(), sender: 'agent', text: validText(body.text, 'Tin nhắn', 4000), time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) };
      store.messages[match[1]] ??= [];
      store.messages[match[1]].push(message);
      chat.preview = message.text;
      chat.time = 'Vừa xong';
      await persist();
      return json(response, 201, message);
    }
    if (request.method === 'GET' && path === '/api/leads') return json(response, 200, store.leads);
    if (request.method === 'POST' && path === '/api/leads') {
      const body = await readBody(request);
      const lead = {
        id: randomUUID(), name: validText(body.name, 'Họ và tên', 120), company: validText(body.company, 'Doanh nghiệp', 180),
        phone: validText(body.phone, 'Số điện thoại', 40), email: validText(body.email, 'Email', 180),
        product: validText(body.product, 'Sản phẩm', 120), note: typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '',
        createdAt: new Date().toISOString(),
      };
      store.leads.unshift(lead);
      await persist();
      return json(response, 201, lead);
    }
    if (request.method === 'GET' && path === '/api/scenarios') return json(response, 200, store.scenarios);
    match = path.match(/^\/api\/scenarios\/([\w-]+)$/);
    if (match && request.method === 'PUT') {
      const scenario = store.scenarios.find(item => item.id === match[1]);
      if (!scenario) return json(response, 404, { error: 'Không tìm thấy kịch bản.' });
      const body = await readBody(request);
      scenario.message = validText(body.message, 'Nội dung tin nhắn', 500);
      scenario.updatedAt = new Date().toISOString();
      await persist();
      return json(response, 200, scenario);
    }
    return json(response, 404, { error: 'Không tìm thấy API.' });
  } catch (error) {
    console.error(error);
    const status = error.status || (error.code === '23505' ? 409 : 500);
    return json(response, status, { error: error.status ? error.message : status === 409 ? 'Email này đã được sử dụng.' : 'Máy chủ gặp lỗi khi xử lý yêu cầu.' });
  }
});

server.listen(port, () => console.log(`A Lênh API đang chạy tại http://localhost:${port}`));
