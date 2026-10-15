import tls from 'node:tls';
import { createInterface } from 'node:readline';

export async function sendPasswordResetOtp(to, otp) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) throw new Error('SMTP chưa được cấu hình.');
  if (port !== 465) throw new Error('SMTP_PORT hiện cần dùng cổng TLS 465.');

  const socket = tls.connect({ host, port, servername: host });
  socket.setTimeout(20_000, () => socket.destroy(new Error('Kết nối SMTP quá thời gian chờ.')));
  const reader = createInterface({ input: socket, crlfDelay: Infinity });
  let activeReplyReject = null;
  reader.on('error', error => activeReplyReject?.(error));
  const readReply = () => new Promise((resolve, reject) => {
    const lines = [];
    let settled = false;
    const cleanup = () => {
      reader.off('line', onLine);
      reader.off('error', onError);
      socket.off('error', onError);
      if (activeReplyReject === onError) activeReplyReject = null;
    };
    const onLine = line => {
      lines.push(line);
      if (/^\d{3} /.test(line)) {
        settled = true;
        cleanup();
        resolve({ code: Number(line.slice(0, 3)), text: lines.join('\n') });
      }
    };
    const onError = error => { if (settled) return; settled = true; cleanup(); reject(error); };
    activeReplyReject = onError;
    reader.on('line', onLine);
    reader.once('error', onError);
    socket.once('error', onError);
  });
  let stage = 'SMTP greeting';
  const expect = async (accepted, command) => {
    stage = command?.split(' ')[0] || `SMTP reply ${accepted.join('/')}`;
    if (command) socket.write(`${command}\r\n`);
    const reply = await readReply();
    if (!accepted.includes(reply.code)) throw new Error(`SMTP trả về ${reply.code}: ${reply.text}`);
    return reply;
  };
  try {
    const greeting = readReply();
    await new Promise((resolve, reject) => {
      socket.once('secureConnect', resolve);
      socket.once('error', reject);
    });
    const hello = await greeting;
    if (hello.code !== 220) throw new Error(`SMTP trả về ${hello.code}: ${hello.text}`);
    await expect([250], `EHLO ${host}`);
    await expect([334], 'AUTH LOGIN');
    await expect([334], Buffer.from(user).toString('base64'));
    await expect([235], Buffer.from(pass).toString('base64'));
    await expect([250], `MAIL FROM:<${from}>`);
    await expect([250, 251], `RCPT TO:<${to}>`);
    await expect([354], 'DATA');
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      'Subject: Ma xac nhan dat lai mat khau',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      `Ma OTP cua ban la: ${otp}`,
      'Ma co hieu luc trong 10 phut. Neu ban khong yeu cau dat lai mat khau, hay bo qua email nay.',
    ].join('\r\n').split('\r\n').map(line => line.startsWith('.') ? `.${line}` : line).join('\r\n');
    stage = 'DATA';
    socket.write(`${message}\r\n.\r\n`);
    await expect([250]);
    try { await expect([221], 'QUIT'); } catch { /* Email accepted; quit response is best effort. */ }
  } catch (error) {
    throw new Error(`${stage}: ${error.message}`);
  } finally {
    reader.close();
    socket.end();
  }
}
