import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from './api.js';
import './styles.css';
import './api.css';
import './auth.css';

const AgentContext = createContext(null);

function normalizeAgent(payload, fallback = {}) {
  const agent = payload?.agent ?? payload?.user ?? payload?.account ?? payload;
  if (!agent || typeof agent !== 'object') return null;
  const role = agent.role === 'admin' ? 'admin' : 'user';
  return {
    ...agent,
    id: agent.id ?? fallback.id,
    name: agent.name ?? agent.fullName ?? fallback.name ?? 'Người dùng',
    email: agent.email ?? fallback.email ?? '',
    role,
    roleLabel: agent.roleLabel ?? (role === 'admin' ? 'Quản trị viên' : 'Người dùng'),
  };
}

const Icon = ({ name, size = 18, stroke = 1.8, className = '' }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></>,
    bot: <><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6M2 12h2m16 0h2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-6 6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2Z" transform="translate(-1 -1) scale(1.08)"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    down: <path d="m7 10 5 5 5-5"/>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.8 2.1z"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    tag: <><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/></>,
    smile: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>,
    paperclip: <path d="m21.4 11.6-8.5 8.5a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
};

const navItems = [
  { id: 'admin-overview', label: 'Tổng quan', icon: 'grid', group: 'QUẢN TRỊ' },
  { id: 'admin-users', label: 'Người dùng', icon: 'users' },
  { id: 'admin-accounts', label: 'Tài khoản', icon: 'settings' },
  { id: 'admin-chats', label: 'Cuộc trò chuyện', icon: 'chat' },
  { id: 'admin-messages', label: 'Tin nhắn', icon: 'send' },
  { id: 'admin-profile', label: 'Hồ sơ admin', icon: 'shield' },
];

function BrandMark() {
  return <div className="brand"><div className="brand-mark"><i/><i/><i/><i/><b/></div><div className="brand-name">Hệ thống Chat<span>MESSAGING ĐƠN GIẢN</span></div></div>;
}

function Sidebar({ page, setPage, agent, onLogout, unreadCount = 0 }) {
  const initials = agent?.name?.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'AL';
  const visibleNavItems = agent?.role === 'admin' ? navItems : [{ id: 'messages', label: 'Tin nhắn', icon: 'send', group: 'KẾT NỐI' }, { id: 'friends', label: 'Bạn bè', icon: 'users' }, { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'shield' }];
  return <aside className="sidebar"><BrandMark/><div className="workspace-switch"><div className="workspace-icon">{initials}</div><div><b>{agent?.name || 'Người dùng'}</b><small>{agent?.roleLabel || 'Người dùng'}</small></div><Icon name="down" size={15}/></div><div className="side-label">KHÔNG GIAN LÀM VIỆC</div><nav>{visibleNavItems.map(item => <React.Fragment key={item.id}>{item.group && <div className="nav-group">{item.group}</div>}<button onClick={() => setPage(item.id)} className={`nav-item ${page === item.id ? 'active' : ''}`}><Icon name={item.icon}/><span>{item.label}</span>{['inbox','messages','admin-messages'].includes(item.id) && unreadCount > 0 && <em>{unreadCount}</em>}</button></React.Fragment>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><b>Cần trợ giúp?</b><p>Đội ngũ hỗ trợ luôn sẵn sàng.</p><button onClick={() => window.dispatchEvent(new Event('alenh:open-support'))}>Mở hộp hỗ trợ <span>↗</span></button></div><div className="profile"><div className="avatar avatar-blue">{initials}</div><div><b>{agent?.name || 'Tác nhân'}</b><small>{agent?.roleLabel || 'Người dùng'}</small></div><button className="logout-button" onClick={onLogout} title="Đăng xuất">Đăng xuất <span>↗</span></button></div></div></aside>;
}

function Header({ title, subtitle, actions }) {
  const agent = useContext(AgentContext);
  const initials = agent?.name?.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'AL';
  return <header className="topbar"><div><div className="breadcrumb">Không gian làm việc <span>/</span> <b>{title}</b></div><h1>{title}</h1><p>{subtitle}</p></div><div className="header-actions">{actions}<button className="icon-button"><Icon name="search"/></button><button className="icon-button notification"><Icon name="bell"/><i/></button><div className="header-account" title={`${agent?.email || ''} · ${agent?.roleLabel || ''}`}><div className="avatar avatar-blue">{initials}</div><span><b>{agent?.name || 'Tác nhân'}</b><small>{agent?.email || ''} · {agent?.roleLabel || 'Người dùng'}</small></span></div></div></header>;
}

const initialChats = [
  { id: 1, name: 'Yến Phạm', avatar: 'YP', color: 'pink', preview: 'Dạ vâng, em gửi thông tin cho anh nhé.', time: '2 phút', channel: 'Messenger', unread: 2, tag: 'Chờ xử lý', online: true },
  { id: 2, name: 'Tuấn Anh', avatar: 'TA', color: 'green', preview: 'Cho mình hỏi về gói dịch vụ doanh nghiệp…', time: '8 phút', channel: 'Website', unread: 0, tag: 'Tư vấn', online: true },
  { id: 3, name: 'Minh Phú Hoàng', avatar: 'MH', color: 'orange', preview: 'Bên mình có hỗ trợ tích hợp API không ạ?', time: '12 phút', channel: 'Zalo', unread: 1, tag: 'Tiềm năng', online: false },
  { id: 4, name: 'Oanh Khcooi', avatar: 'OK', color: 'purple', preview: 'Cảm ơn bạn đã tư vấn rất chi tiết.', time: '23 phút', channel: 'Messenger', unread: 0, tag: 'Đã xử lý', online: false },
  { id: 5, name: 'Nguyễn Lan', avatar: 'NL', color: 'blue', preview: 'Mình muốn đặt lịch demo sản phẩm.', time: '31 phút', channel: 'Website', unread: 0, tag: 'Chờ xử lý', online: true },
  { id: 6, name: 'Khánh Phương', avatar: 'KP', color: 'yellow', preview: 'Cho mình xin bảng giá mới nhất nhé.', time: '45 phút', channel: 'Zalo', unread: 0, tag: 'Tư vấn', online: false },
  { id: 7, name: 'Bùi Văn Chiến', avatar: 'BC', color: 'teal', preview: 'Tôi đã nhận được tài liệu, cảm ơn!', time: '1 giờ', channel: 'Messenger', unread: 0, tag: 'Đã xử lý', online: false },
];

function Avatar({ chat, small = false }) { return <div className={`avatar avatar-${chat.color} ${small ? 'avatar-small' : ''}`}>{chat.avatar}</div>; }

function InboxPage() {
  const [chats, setChats] = useState(initialChats);
  const [selected, setSelected] = useState(1);
  const [tab, setTab] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [apiError, setApiError] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const current = chats.find(c => c.id === selected) || chats[0];
  const filtered = useMemo(() => chats.filter(c => (tab === 'Chưa đọc' ? c.unread : tab === 'Của tôi' ? [1, 2, 5].includes(c.id) : true) && c.name.toLowerCase().includes(search.toLowerCase())), [chats, tab, search]);
  useEffect(() => { api('/chats').then(setChats).catch(error => setApiError(error.message)); }, []);
  useEffect(() => { api(`/chats/${selected}/messages`).then(setMessages).catch(error => setApiError(error.message)); }, [selected]);
  const openChat = async id => {
    setSelected(id);
    setChats(items => items.map(chat => chat.id === id ? { ...chat, unread: 0 } : chat));
    try { await api(`/chats/${id}`, { method: 'PATCH', body: { unread: 0 } }); } catch (error) { setApiError(error.message); }
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      const saved = await api(`/chats/${selected}/messages`, { method: 'POST', body: { text: message } });
      setMessages(items => [...items, saved]);
      setChats(items => items.map(chat => chat.id === selected ? { ...chat, preview: saved.text, time: 'Vừa xong' } : chat));
      setMessage(''); setApiError('');
    } catch (error) { setApiError(error.message); }
  };
  return <><Header title="Hộp thư hỗ trợ" subtitle="Quản lý hội thoại và chăm sóc khách hàng trên mọi kênh." actions={<button className="button button-outline"><Icon name="phone" size={16}/> Gọi điện</button>}/><div className="inbox-layout"><section className="chat-list-panel"><div className="panel-heading"><div><h2>Hội thoại <span className="count-pill">{chats.length}</span></h2><p>Phản hồi khách hàng của bạn</p></div><button className="mini-icon"><Icon name="more"/></button></div><div className="search-field"><Icon name="search" size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm hội thoại"/><kbd>⌘ K</kbd></div><div className="tabs chat-tabs">{['Tất cả', 'Chưa đọc', 'Của tôi'].map(t => <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>{t}{t === 'Chưa đọc' && <b>{chats.reduce((total, chat) => total + (chat.unread > 0 ? 1 : 0), 0)}</b>}</button>)}</div><div className="chat-list">{filtered.map(c => <button onClick={() => openChat(c.id)} className={`chat-row ${selected === c.id ? 'chosen' : ''}`} key={c.id}><Avatar chat={c}/><div className="chat-row-main"><div className="chat-row-top"><b>{c.name}</b><time>{c.time}</time></div><p>{c.preview}</p><div className="chat-row-tags"><span className={`channel-badge channel-${c.channel.toLowerCase()}`}>{c.channel === 'Messenger' ? '●' : c.channel === 'Zalo' ? 'Z' : '◉'} {c.channel}</span><span className={`tag-status ${c.tag === 'Chờ xử lý' ? 'waiting' : c.tag === 'Tiềm năng' ? 'potential' : c.tag === 'Tư vấn' ? 'consult' : 'done'}`}>{c.tag}</span>{c.unread > 0 && <span className="unread-dot">{c.unread}</span>}</div></div></button>)}</div><button className="load-more">Xem thêm hội thoại <Icon name="down" size={15}/></button></section>
    <section className="conversation-panel"><div className="conversation-top"><div className="contact-head"><Avatar chat={current}/><div><b>{current.name}</b><span><i className={`presence ${current.online ? '' : 'offline'}`}/>{current.online ? 'Đang hoạt động' : 'Hoạt động gần đây'}</span></div></div><div className="conversation-tools"><span className="source-label">◉ {current.channel}</span><button className="mini-icon"><Icon name="search"/></button><button className="mini-icon"><Icon name="more"/></button></div></div><div className="conversation-meta"><span><Icon name="clock" size={14}/> Hội thoại bắt đầu hôm nay, 09:42</span><button onClick={() => setActiveTag(activeTag ? '' : 'Quan tâm')}>＋ Thêm nhãn</button></div><div className="message-stream"><div className="date-divider"><span>Hôm nay, 27 tháng 9</span></div><div className="system-note"><span>✦</span> {current.name} đã bắt đầu cuộc trò chuyện</div>{messages.map(item => <div className={item.sender === 'agent' ? 'message-out' : 'message-in'} key={item.id}>{item.sender === 'customer' && <Avatar chat={current} small/>}<div><div className={`bubble ${item.sender === 'agent' ? 'bubble-out' : 'bubble-in'}`}>{item.text}</div><time>{item.time} {item.sender === 'agent' && <Icon name="check" size={12}/>}</time></div></div>)}</div><div className="composer"><div className="composer-toolbar"><button title="Tệp đính kèm"><Icon name="paperclip"/></button><button title="Emoji"><Icon name="smile"/></button><button title="Mẫu trả lời">▤</button><span className="composer-shortcut">Nhấn Enter để gửi</span><button className="quick-template">✦ Trả lời nhanh</button></div><textarea placeholder="Nhập nội dung tin nhắn..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey){e.preventDefault(); sendMessage();}}}/>{apiError && <div className="api-error">API: {apiError}</div>}<div className="composer-bottom"><span>Tin nhắn được gửi qua <b>{current.channel}</b></span><button className="button button-primary send-button" onClick={sendMessage}>Gửi tin nhắn <Icon name="send" size={15}/></button></div></div></section>
    <aside className="customer-panel"><div className="customer-tabs"><button className="selected">Thông tin</button><button>Lịch sử <span>4</span></button><button><Icon name="more"/></button></div><div className="customer-profile"><Avatar chat={current}/><h3>{current.name}</h3><p>Khách hàng tiềm năng</p><button className="button button-soft">✎ Chỉnh sửa hồ sơ</button></div><div className="info-section"><div className="section-title"><b>Thông tin liên hệ</b><button className="mini-icon"><Icon name="more" size={16}/></button></div><dl><dt>Email</dt><dd>{current.name.toLowerCase().replaceAll(' ', '.')}@gmail.com</dd><dt>Số điện thoại</dt><dd>+84 908 123 456</dd><dt>Kênh lần đầu</dt><dd><span className="channel-badge">◉ {current.channel}</span></dd><dt>Khách hàng từ</dt><dd>12 tháng 9, 2026</dd></dl></div><div className="info-section"><div className="section-title"><b>Nhãn hội thoại</b><button className="mini-icon" onClick={() => setActiveTag(activeTag ? '' : 'Quan tâm')}><Icon name="plus" size={16}/></button></div><div className="tag-list"><span className="chip chip-orange">Quan tâm</span><span className="chip chip-purple">Chatbot AI</span>{activeTag && <span className="chip chip-green">{activeTag}</span>}</div></div><div className="info-section"><div className="section-title"><b>Ghi chú</b><button className="mini-icon"><Icon name="plus" size={16}/></button></div><div className="note-box">Khách hàng quan tâm giải pháp AI và tự động hóa quy trình chăm sóc.</div></div><div className="assign-box"><span className="assign-avatar">AP</span><div><small>Người phụ trách</small><b>Anh Phạm</b></div><Icon name="down" size={15}/></div></aside></div></>;
}

function LeadPage() {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');
  const [form, setForm] = useState({ name: '', company: '', phone: '', email: '', product: '', note: '' });
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => { e.preventDefault(); try { await api('/leads', { method: 'POST', body: form }); setSubmitted(true); setApiError(''); } catch (error) { setApiError(error.message); } };
  return <><Header title="Đăng ký tư vấn" subtitle="Tạo biểu mẫu thu thập thông tin và kết nối khách hàng tiềm năng." actions={<button className="button button-outline">Xem trước</button>}/><div className="lead-layout"><div className="lead-main"><div className="section-heading"><div><h2>Thông tin biểu mẫu</h2><p>Khách hàng sẽ điền thông tin bên dưới để được tư vấn.</p></div><span className="status-pill"><i/> Đang hoạt động</span></div><div className="lead-preview"><div className="preview-topline"><span>TRANG ĐĂNG KÝ TƯ VẤN</span><span>↗ Mở trang</span></div><form className="lead-form" onSubmit={submit}><div className="form-title"><span className="form-spark">✦</span><h2>ĐĂNG KÝ TƯ VẤN VÀ DEMO</h2><p>Để lại thông tin, chuyên viên của chúng tôi sẽ liên hệ trong thời gian sớm nhất.</p></div><div className="form-grid"><label>Họ và tên <b>*</b><input required name="name" value={form.name} onChange={update} placeholder="Nguyễn Văn An"/></label><label>Tên doanh nghiệp / MST <b>*</b><input required name="company" value={form.company} onChange={update} placeholder="Tên doanh nghiệp của bạn"/></label><label>Số điện thoại <b>*</b><input required type="tel" name="phone" value={form.phone} onChange={update} placeholder="090 123 4567"/></label><label>Email <b>*</b><input required type="email" name="email" value={form.email} onChange={update} placeholder="email@congty.vn"/></label><label className="full">Sản phẩm cần tư vấn <b>*</b><select required name="product" value={form.product} onChange={update}><option value="">Chọn giải pháp bạn quan tâm</option><option>LV Chatbot AI Assistant</option><option>LV Contact Center</option><option>LV eOffice</option><option>Khác</option></select></label><label className="full">Ghi chú thêm<textarea name="note" value={form.note} onChange={update} placeholder="Chia sẻ nhu cầu hoặc hệ thống cần tích hợp..." rows="3"/></label></div><button className="button button-primary form-submit" type="submit">Gửi yêu cầu tư vấn <Icon name="send" size={15}/></button><div className="privacy-note">Thông tin của bạn được bảo mật theo <a href="#privacy">chính sách quyền riêng tư</a>.</div>{submitted && <div className="success-message">✓ Cảm ơn {form.name || 'bạn'}! Yêu cầu tư vấn đã được ghi nhận.</div>}{apiError && <div className="api-error">API: {apiError}</div>}</form><div className="form-brand-foot">Powered by <b>A Lênh</b></div></div></div><aside className="lead-settings"><div className="section-title"><h3>Cài đặt biểu mẫu</h3><Icon name="settings" size={17}/></div><div className="setting-row"><div><b>Trạng thái biểu mẫu</b><small>Cho phép khách hàng gửi thông tin</small></div><span className="toggle on"><i/></span></div><div className="setting-row"><div><b>Gửi email xác nhận</b><small>Thông báo khi khách hàng đăng ký</small></div><span className="toggle on"><i/></span></div><div className="setting-row"><div><b>Thông báo cho đội ngũ</b><small>Nhận email khi có khách hàng mới</small></div><span className="toggle"><i/></span></div><div className="setting-divider"/><div className="section-title"><h3>Liên kết biểu mẫu</h3><Icon name="more" size={17}/></div><div className="url-box"><span>https://lacviet.vn/tu-van</span><button onClick={e => {e.currentTarget.innerText = '✓';}}>▢</button></div><button className="button button-outline full-button">↗ Chia sẻ biểu mẫu</button><div className="setting-divider"/><div className="stats-mini-title">HIỆU QUẢ 30 NGÀY</div><div className="lead-stats"><div><b>248</b><span>Lượt xem</span><em>↑ 18%</em></div><div><b>36</b><span>Đăng ký</span><em>↑ 12%</em></div></div><div className="conversion"><span>Tỷ lệ chuyển đổi</span><b>14,5%</b></div><div className="progress"><i style={{width:'62%'}}/></div></aside></div></>;
}

function BotPage() {
  const [activeScenario, setActiveScenario] = useState('Welcome');
  const [flowText, setFlowText] = useState('Xin chào bạn! Mình có thể hỗ trợ gì cho bạn hôm nay?');
  const [published, setPublished] = useState(false);
  const [scenarioItems, setScenarioItems] = useState([]);
  const [apiError, setApiError] = useState('');
  const scenarios = scenarioItems.length ? scenarioItems.map(item => item.name) : ['Welcome', 'Tư vấn sản phẩm', 'Chăm sóc khách hàng', 'Hỗ trợ kỹ thuật'];
  useEffect(() => { api('/scenarios').then(items => { setScenarioItems(items); setActiveScenario(items[0]?.name || 'Welcome'); setFlowText(items[0]?.message || ''); }).catch(error => setApiError(error.message)); }, []);
  const chooseScenario = name => { setActiveScenario(name); const item = scenarioItems.find(scenario => scenario.name === name); if (item) setFlowText(item.message); };
  const saveScenario = async () => {
    const item = scenarioItems.find(scenario => scenario.name === activeScenario);
    if (!item) return;
    try { const saved = await api(`/scenarios/${item.id}`, { method: 'PUT', body: { message: flowText } }); setScenarioItems(items => items.map(scenario => scenario.id === saved.id ? saved : scenario)); setPublished(true); setApiError(''); }
    catch (error) { setApiError(error.message); setPublished(false); }
  };
  return <><Header title="Kịch bản chatbot" subtitle="Thiết kế luồng hội thoại tự động, thân thiện và phù hợp với khách hàng." actions={<><button className="button button-outline">Xem thử</button><button className="button button-primary" onClick={saveScenario}>{published ? '✓ Đã xuất bản' : 'Xuất bản'}</button></>}/><div className="bot-layout"><aside className="scenario-sidebar"><div className="bot-side-heading"><div><h2>Kịch bản</h2><p>{scenarios.length} kịch bản</p></div><button className="mini-icon"><Icon name="plus"/></button></div><div className="bot-search"><Icon name="search" size={15}/><span>Tìm kịch bản</span><kbd>⌘ K</kbd></div><button className="bot-action primary-action">＋ Tạo kịch bản mới</button><div className="scenario-list-title">KỊCH BẢN ĐANG HOẠT ĐỘNG</div>{scenarios.map((s, i) => <button onClick={() => chooseScenario(s)} className={`scenario-item ${activeScenario === s ? 'scenario-active' : ''}`} key={s}><span className={`scenario-icon scenario-${i}`}>{i === 0 ? '✦' : i === 1 ? '◈' : i === 2 ? '♡' : '⌘'}</span><span><b>{s}</b><small>{scenarioItems[i]?.description || (i === 0 ? 'Chào mừng khách mới' : i === 1 ? 'Giới thiệu giải pháp' : i === 2 ? 'Sau mua hàng' : 'Giải đáp thường gặp')}</small></span>{scenarioItems[i]?.published && <i className="active-dot"/>}</button>)}<div className="scenario-divider"/><div className="scenario-card"><span className="sparkle">✦</span><b>Mẹo xây dựng kịch bản</b><p>Bắt đầu với lời chào ngắn gọn, thân thiện để tạo trải nghiệm tự nhiên.</p><a href="#guide">Xem hướng dẫn →</a></div></aside><main className="flow-canvas"><div className="flow-toolbar"><div><div className="flow-title"><span className="flow-title-icon">✦</span><b>{activeScenario}</b><span className="published-tag"><i/> Đang hoạt động</span></div><small>Cập nhật lần cuối: Hôm nay, 10:24</small></div><div className="flow-tools"><button className="mini-icon">↶</button><button className="mini-icon">↷</button><span/><button className="zoom-label">−</button><small>100%</small><button className="zoom-label">＋</button><button className="mini-icon"><Icon name="more"/></button></div></div><div className="canvas-workspace"><div className="canvas-grid"/><div className="flow-node trigger-node"><div className="node-icon trigger-icon">⚡</div><div><small>KHI KHÁCH HÀNG</small><b>Bắt đầu hội thoại</b></div><span className="node-menu">···</span><div className="node-port port-bottom"/></div><div className="connector connector-one"/><div className="flow-node welcome-node"><div className="node-header"><div className="node-icon welcome-icon">✦</div><div><small>TIN NHẮN</small><b>{activeScenario}</b></div><button className="mini-icon"><Icon name="more" size={17}/></button></div><div className="node-content"><label>Nội dung tin nhắn</label><textarea value={flowText} onChange={e => { setFlowText(e.target.value); setPublished(false); }}/><div className="node-foot"><button>＋ Thêm nút phản hồi</button><span>{flowText.length} / 500 ký tự</span></div></div><div className="node-port port-bottom"/></div><div className="connector connector-two"/><div className="flow-node choices-node"><div className="node-header"><div className="node-icon choices-icon">⌘</div><div><small>PHẢN HỒI NHANH</small><b>Khách hàng muốn</b></div><button className="mini-icon"><Icon name="more" size={17}/></button></div><div className="choice-pill">Tìm hiểu sản phẩm <span>⠿</span></div><div className="choice-pill">Gặp nhân viên tư vấn <span>⠿</span></div><button className="add-choice">＋ Thêm lựa chọn</button><div className="node-port port-right"/></div><div className="canvas-zoom"><button>＋</button><button>−</button><span/><button>⊡</button></div><div className="canvas-minimap"><span/><i/><b/><em/></div><div className="canvas-help">?</div></div><div className="canvas-status"><span>{apiError ? `API: ${apiError}` : '✓ Kịch bản được lưu trên máy chủ'}</span><span>3 bước <b>•</b> Tự động lưu</span></div></main><aside className="block-library"><div className="library-header"><div><h3>Khối nội dung</h3><p>Kéo khối vào kịch bản</p></div><button className="mini-icon"><Icon name="more" size={16}/></button></div><div className="library-search"><Icon name="search" size={15}/><span>Tìm khối nội dung</span></div><div className="block-group-title">TIN NHẮN</div><div className="block-card"><span className="block-icon block-text">T</span><span><b>Văn bản</b><small>Gửi tin nhắn văn bản</small></span><span className="drag-handle">⠿</span></div><div className="block-card"><span className="block-icon block-image">▧</span><span><b>Hình ảnh</b><small>Gửi hình ảnh, banner</small></span><span className="drag-handle">⠿</span></div><div className="block-card"><span className="block-icon block-button">▣</span><span><b>Nút bấm</b><small>Tạo lựa chọn tương tác</small></span><span className="drag-handle">⠿</span></div><div className="block-group-title">LUỒNG HỘI THOẠI</div><div className="block-card"><span className="block-icon block-branch">⑂</span><span><b>Điều kiện</b><small>Phân nhánh hội thoại</small></span><span className="drag-handle">⠿</span></div><div className="block-card"><span className="block-icon block-wait">◷</span><span><b>Chờ phản hồi</b><small>Đợi tin nhắn từ khách</small></span><span className="drag-handle">⠿</span></div><div className="block-group-title">TÍCH HỢP</div><div className="block-card"><span className="block-icon block-agent">♙</span><span><b>Chuyển nhân viên</b><small>Kết nối với tư vấn viên</small></span><span className="drag-handle">⠿</span></div></aside></div></>;
}

function LoginPage({ onLogin, onRegister }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const switchMode = () => { setIsRegistering(value => !value); setError(''); setPassword(''); setConfirmation(''); };
  const requestPasswordOtp = async event => {
    event.preventDefault(); setForgotError(''); setForgotNotice(''); setForgotLoading(true);
    try {
      const result = await api('/auth/password-reset/request', { method: 'POST', body: { email: forgotEmail } });
      setForgotStep('otp'); setForgotNotice(result.message || 'Nếu email có tài khoản hợp lệ, mã OTP sẽ được gửi trong giây lát.');
    } catch (requestError) { setForgotError(requestError.message); }
    finally { setForgotLoading(false); }
  };
  const confirmPasswordReset = async event => {
    event.preventDefault(); setForgotError(''); setForgotNotice('');
    if (newPassword !== newPasswordConfirmation) { setForgotError('Mật khẩu xác nhận chưa khớp.'); return; }
    setForgotLoading(true);
    try {
      const result = await api('/auth/password-reset/confirm', { method: 'POST', body: { email: forgotEmail, otp, newPassword } });
      setEmail(forgotEmail); setPassword(''); setForgotOpen(false); setError(''); setSuccess(result.message || 'Đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.');
    } catch (requestError) { setForgotError(requestError.message); }
    finally { setForgotLoading(false); }
  };
  const submit = async event => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      if (isRegistering) {
        if (password !== confirmation) throw new Error('Mật khẩu xác nhận chưa khớp.');
        await onRegister(name, email, password, remember);
      } else await onLogin(email, password, remember);
    } catch (formError) { setError(formError.message); }
    finally { setLoading(false); }
  };
  return <main className="auth-page"><section className="auth-story">
    <div className="login-brand"><BrandMark/></div>
    <div className="auth-story-copy"><span className="auth-eyebrow">NHẮN TIN ĐƠN GIẢN · KẾT NỐI DỄ DÀNG</span><h2>Nhắn tin nhanh chóng,<br/>kết nối dễ dàng.</h2><p>Trao đổi nhanh chóng trong một không gian chung.<br/>Kết nối đội ngũ và theo dõi hội thoại dễ dàng.</p></div>
    <div className="auth-story-footer">© 2026 Hệ thống Chat · Messaging đơn giản</div>
  </section><section className="login-card">
    <div className="login-heading"><h1>{isRegistering ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h1><p>{isRegistering ? 'Đăng ký để bắt đầu quản lý hội thoại.' : 'Đăng nhập vào trang quản trị của bạn'}</p></div>
    {success && <div className="login-success" role="status">{success}</div>}
    <form className="login-form" onSubmit={submit}>
      {isRegistering && <label>Họ và tên<div className="login-input-wrap"><span>♙</span><input name="fullName" autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Nguyễn Văn An" maxLength={120} required/></div></label>}
      <label>Email công việc<div className="login-input-wrap"><span>✉</span><input autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ten@congty.vn" required/></div></label>
      <label>Mật khẩu<div className="login-input-wrap"><span>⌑</span><input autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength={isRegistering ? 8 : undefined} type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder={isRegistering ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'} required/><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div></label>
      {isRegistering ? <label>Nhập lại mật khẩu<div className="login-input-wrap"><span>⌑</span><input autoComplete="new-password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Nhập lại mật khẩu" required/></div></label> : <div className="login-options"><label><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}/> Ghi nhớ đăng nhập</label><button type="button" onClick={() => { setForgotEmail(email); setForgotStep('email'); setForgotError(''); setForgotNotice(''); setForgotOpen(true); }}>Quên mật khẩu?</button></div>}
      {error && <div className="login-error" role="alert">{error}</div>}
      <button className="button button-primary login-submit" disabled={loading}>{loading ? (isRegistering ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…') : (isRegistering ? 'Đăng ký' : 'Đăng nhập')}<span>→</span></button>
    </form>
    {!isRegistering && <div className="demo-credentials"><span className="demo-lock">⌑</span><div><b>Tài khoản hệ thống</b><small>Dùng email và mật khẩu do quản trị viên cung cấp.</small></div></div>}
    <div className="auth-switch">{isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button type="button" onClick={switchMode}>{isRegistering ? 'Đăng nhập' : 'Đăng ký ngay'}</button></div>
    <div className="login-footer">© 2026 A Lênh <span>·</span> Bảo mật và quyền riêng tư</div>
  </section>{forgotOpen && <div className="forgot-modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setForgotOpen(false); }}><section className="forgot-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-title"><button className="forgot-close" type="button" aria-label="Đóng" onClick={() => setForgotOpen(false)}>×</button><span className="forgot-modal-icon">✉</span><h2 id="forgot-title">{forgotStep === 'email' ? 'Khôi phục mật khẩu' : 'Xác nhận mã OTP'}</h2><p>{forgotStep === 'email' ? 'Nhập email tài khoản để nhận mã xác nhận đặt lại mật khẩu.' : `Nhập mã 6 số đã gửi tới ${forgotEmail} và tạo mật khẩu mới.`}</p>{forgotStep === 'email' ? <form onSubmit={requestPasswordOtp}><label>Email tài khoản<input type="email" autoComplete="email" required value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} placeholder="ten@congty.vn"/></label><button className="button button-primary" disabled={forgotLoading}>{forgotLoading ? 'Đang gửi mã…' : 'Gửi mã OTP'}</button></form> : <form onSubmit={confirmPasswordReset}><label>Mã OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"/></label><label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Ít nhất 8 ký tự"/></label><label>Xác nhận mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPasswordConfirmation} onChange={event => setNewPasswordConfirmation(event.target.value)} placeholder="Nhập lại mật khẩu mới"/></label><button className="button button-primary" disabled={forgotLoading}>{forgotLoading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}</button><button className="forgot-resend" type="button" onClick={() => { setForgotStep('email'); setOtp(''); setForgotError(''); setForgotNotice(''); }}>Gửi mã khác</button></form>}{forgotNotice && <div className="forgot-notice" role="status">{forgotNotice}</div>}{forgotError && <div className="login-error" role="alert">{forgotError}</div>}</section></div>}</main>;
}

function UserMessagingPage({ agent, onUnreadChange, initialConversationId = '', onConversationOpened }) {
  const [conversations, setConversations] = useState([]); const [activeId, setActiveId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]); const [userSearch, setUserSearch] = useState('');
  const [conversationSearch, setConversationSearch] = useState(''); const [users, setUsers] = useState([]);
  const [draft, setDraft] = useState(''); const [error, setError] = useState(''); const [toast, setToast] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(globalThis.Notification?.permission || 'unsupported');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('alenh-message-notifications') !== 'off');
  const selectedId = useRef(''); const eventUrl = `${import.meta.env.VITE_API_URL || '/api'}/events`;
  const active = conversations.find(conversation => conversation.id === activeId);
  const totalUnread = conversations.reduce((total, conversation) => total + Number(conversation.unread || 0), 0);
  const visibleConversations = conversations.filter(conversation => `${conversation.user_name} ${conversation.user_email}`.toLowerCase().includes(conversationSearch.toLowerCase()));
  useEffect(() => { selectedId.current = activeId; }, [activeId]);
  useEffect(() => { onUnreadChange(totalUnread); }, [totalUnread]);
  useEffect(() => {
    let cancelled = false;
    const loadConversations = async () => {
      try {
        const items = await api('/conversations');
        if (cancelled) return;
        setConversations(items);
        if (initialConversationId && items.some(item => item.id === initialConversationId)) {
          setActiveId(initialConversationId);
          onConversationOpened?.();
        } else setActiveId(current => current && items.some(item => item.id === current) ? current : items[0]?.id || '');
      } catch (e) { if (!cancelled) setError(e.message); }
    };
    loadConversations();
    return () => { cancelled = true; };
  }, [agent.id, agent.role, initialConversationId]);
  useEffect(() => {
    if (userSearch.trim().length < 2) { setUsers([]); return; }
    const timer = setTimeout(() => api(`/users?q=${encodeURIComponent(userSearch.trim())}`).then(setUsers).catch(e => setError(e.message)), 220);
    return () => clearTimeout(timer);
  }, [userSearch]);
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    api(`/conversations/${activeId}/messages`).then(setMessages).catch(e => setError(e.message));
  }, [activeId]);
  useEffect(() => {
    const token = localStorage.getItem('alenh-agent-token') || sessionStorage.getItem('alenh-agent-token');
    if (!token) return;
    const stream = new EventSource(`${eventUrl}?token=${encodeURIComponent(token)}`);
    stream.onmessage = event => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'presence') {
        setConversations(items => items.map(item => item.user_id === data.accountId ? { ...item, online: data.online } : item));
        setUsers(items => items.map(item => item.id === data.accountId ? { ...item, online: data.online } : item));
      }
      if (data.type === 'message') {
        const message = data.message; const incoming = message.senderId !== agent.id;
        setConversations(items => {
          const found = items.find(item => item.id === message.conversationId);
          if (!found) { api('/conversations').then(setConversations).catch(() => {}); return items; }
          return [{ ...found, preview: message.text, time: message.time, unread: incoming && selectedId.current !== message.conversationId ? Number(found.unread || 0) + 1 : found.unread }, ...items.filter(item => item.id !== message.conversationId)];
        });
        if (selectedId.current === message.conversationId) {
          setMessages(items => items.some(item => item.id === message.id) ? items : [...items, message]);
          if (incoming) api(`/conversations/${message.conversationId}/messages`).then(setMessages).catch(() => {});
        }
        if (incoming) {
          setToast(`Tin nhắn mới từ ${message.senderName}`);
          if (notificationsEnabled && document.hidden && globalThis.Notification?.permission === 'granted') new Notification(message.senderName, { body: message.text });
        }
      }
      if (data.type === 'read') setMessages(items => items.map(item => data.messageIds.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item));
      if (data.type === 'message_deleted') setMessages(items => items.filter(item => item.id !== data.messageId));
    };
    stream.onerror = () => setError('Mất kết nối realtime. Đang thử kết nối lại…');
    stream.onopen = () => setError('');
    return () => stream.close();
  }, [agent.id, eventUrl, notificationsEnabled]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  const openConversation = conversation => { setActiveId(conversation.id); setConversations(items => items.map(item => item.id === conversation.id ? { ...item, unread: 0 } : item)); setUserSearch(''); setUsers([]); setError(''); };
  const startConversation = async user => {
    try { const created = await api('/conversations', { method: 'POST', body: { userId: user.id } }); const items = await api('/conversations'); setConversations(items); setActiveId(created.id); setUserSearch(''); setUsers([]); setError(''); }
    catch (e) { setError(e.message); }
  };
  const sendMessage = async () => {
    if (!activeId || !draft.trim()) return;
    const text = draft; setDraft('');
    try { const saved = await api(`/conversations/${activeId}/messages`, { method: 'POST', body: { text } }); setMessages(items => items.some(item => item.id === saved.id) ? items : [...items, saved]); setConversations(items => items.map(item => item.id === activeId ? { ...item, preview: saved.text, time: saved.time } : item)); setError(''); }
    catch (e) { setDraft(text); setError(e.message); }
  };
  const hideConversation = async conversation => {
    if (!window.confirm(`Ẩn cuộc trò chuyện với ${conversation.user_name} khỏi danh sách của bạn?`)) return;
    try { await api(`/conversations/${conversation.id}`, { method: 'DELETE' }); const next = conversations.filter(item => item.id !== conversation.id); setConversations(next); setActiveId(next[0]?.id || ''); setMessages([]); }
    catch (e) { setError(e.message); }
  };
  const deleteMessage = async message => {
    if (!window.confirm('Xóa tin nhắn này?')) return;
    try { await api(`/conversations/${activeId}/messages/${message.id}`, { method: 'DELETE' }); setMessages(items => items.filter(item => item.id !== message.id)); }
    catch (e) { setError(e.message); }
  };
  const toggleNotifications = async () => {
    if (notificationsEnabled && notificationPermission === 'granted') {
      localStorage.setItem('alenh-message-notifications', 'off');
      setNotificationsEnabled(false);
      setToast('Đã tắt thông báo tin nhắn.');
      return;
    }
    if (!globalThis.Notification) { setToast('Trình duyệt này chưa hỗ trợ thông báo.'); return; }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      localStorage.setItem('alenh-message-notifications', 'on');
      setNotificationsEnabled(true);
      setToast('Đã bật thông báo tin nhắn.');
    } else setToast('Bạn chưa cấp quyền thông báo.');
  };
  return <><Header title="Tin nhắn" subtitle="Tìm người dùng và trò chuyện trực tiếp theo thời gian thực." actions={<button className="button button-outline dm-notification-button" onClick={toggleNotifications} aria-pressed={notificationsEnabled && notificationPermission === 'granted'}><Icon name="bell" size={15}/>{notificationsEnabled && notificationPermission === 'granted' ? 'Tắt thông báo' : 'Bật thông báo'}{totalUnread > 0 && <i>{totalUnread}</i>}</button>}/>
    <div className="dm-layout"><aside className="dm-sidebar"><div className="dm-sidebar-title"><div><h2>Trò chuyện</h2><p>{conversations.length} cuộc trò chuyện</p></div><span className="dm-live-pill"><i/> Realtime</span></div>
      <div className="dm-search-wrap"><Icon name="search" size={16}/><input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Tìm người dùng để nhắn tin"/><span>⌕</span></div>
      {users.length > 0 && <div className="dm-user-results"><small>KẾT QUẢ TÌM NGƯỜI DÙNG</small>{users.map(user => <button key={user.id} onClick={() => startConversation(user)}><span className="dm-avatar">{user.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><span><b>{user.name}</b><small>{user.email}</small></span><i className={user.online ? 'is-online' : ''}/></button>)}</div>}
      <div className="dm-filter-search"><input value={conversationSearch} onChange={e => setConversationSearch(e.target.value)} placeholder="Lọc cuộc trò chuyện"/></div>
      <div className="dm-conversation-list">{visibleConversations.map(conversation => <div key={conversation.id} className={`dm-conversation ${activeId === conversation.id ? 'selected' : ''}`}><button className="dm-conversation-main" onClick={() => openConversation(conversation)}><span className="dm-avatar">{conversation.user_name?.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><span className="dm-conversation-copy"><span className="dm-conversation-top"><b>{conversation.user_name}</b><time>{conversation.time}</time></span><small>{conversation.preview}</small><span className="dm-conversation-bottom"><i className={conversation.online ? 'is-online' : ''}/>{conversation.online ? 'Đang online' : 'Offline'}{conversation.unread > 0 && <em>{conversation.unread}</em>}</span></span></button><button className="dm-hide-chat" title="Ẩn cuộc trò chuyện" onClick={() => hideConversation(conversation)}>×</button></div>)}{visibleConversations.length === 0 && <div className="dm-empty-list">Chưa có cuộc trò chuyện. Hãy tìm người dùng để bắt đầu.</div>}</div>
    </aside><section className="dm-conversation-panel">{active ? <><header className="dm-chat-header"><span className="dm-avatar large">{active.user_name?.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><div><b>{active.user_name}</b><small><i className={active.online ? 'is-online' : ''}/>{active.online ? 'Đang online' : 'Đang offline'}</small></div><span className="dm-secure-label"><Icon name="check" size={14}/> Tin nhắn cá nhân</span></header><div className="dm-message-stream">{messages.map(message => <article key={message.id} className={`dm-message ${message.senderId === agent.id ? 'mine' : 'theirs'}`}><div className="dm-bubble-wrap"><div className="dm-bubble">{message.text}</div><div className="dm-message-meta"><time>{message.time}</time>{message.senderId === agent.id && <span>{message.readAt ? '✓✓ Đã xem' : '✓ Đã gửi'}</span>}</div></div>{message.senderId === agent.id && <button title="Xóa tin nhắn" className="dm-delete-message" onClick={() => deleteMessage(message)}>×</button>}</article>)}{messages.length === 0 && <div className="dm-empty-thread"><span>✦</span><b>Bắt đầu cuộc trò chuyện</b><small>Gửi lời chào đầu tiên tới {active.user_name}.</small></div>}</div><div className="dm-composer"><div className="dm-composer-tools"><span>Đang trò chuyện với <b>{active.user_name}</b></span><span>Realtime · trạng thái đã xem</span></div><div className="dm-compose-row"><textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Viết tin nhắn..." onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}/><button className="button button-primary" onClick={sendMessage} disabled={!draft.trim()}><Icon name="send" size={15}/> Gửi</button></div></div></> : <div className="dm-welcome-empty"><div className="dm-welcome-icon"><Icon name="chat" size={25}/></div><h2>Không gian trò chuyện của bạn</h2><p>Tìm người dùng ở bên trái hoặc chọn cuộc trò chuyện để gửi tin nhắn.</p></div>}</section></div>
    {error && <div className="dm-toast error">{error}</div>}{toast && <div className="dm-toast">{toast}</div>}
  </>;
}

function SupportChatWidget({ agent }) {
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const selected = conversations.find(item => item.id === activeId);
  const unread = conversations.reduce((total, item) => total + Number(item.unread || 0), 0);
  useEffect(() => {
    const openSupport = () => setOpen(true);
    window.addEventListener('alenh:open-support', openSupport);
    return () => window.removeEventListener('alenh:open-support', openSupport);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const support = agent.role === 'user' ? await api('/support/conversation', { method: 'POST' }) : null;
        const items = await api('/conversations');
        if (cancelled) return;
        setConversations(items);
        if (agent.role === 'user') setActiveId(support?.id || items.find(item => item.user_role === 'admin')?.id || '');
        else setActiveId(current => current && items.some(item => item.id === current) ? current : items[0]?.id || '');
      } catch (e) { if (!cancelled) setError(e.message); }
    };
    load();
    return () => { cancelled = true; };
  }, [agent.id, agent.role]);
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    api(`/conversations/${activeId}/messages`).then(setMessages).catch(e => setError(e.message));
  }, [activeId]);
  useEffect(() => {
    const token = localStorage.getItem('alenh-agent-token') || sessionStorage.getItem('alenh-agent-token');
    if (!token) return;
    const stream = new EventSource(`${import.meta.env.VITE_API_URL || '/api'}/events?token=${encodeURIComponent(token)}`);
    stream.onmessage = event => {
      let data; try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === 'message') {
        api('/conversations').then(setConversations).catch(() => {});
        if (data.message.conversationId === activeId) api(`/conversations/${activeId}/messages`).then(setMessages).catch(() => {});
      }
      if ((data.type === 'read' || data.type === 'message_deleted') && data.conversationId === activeId) api(`/conversations/${activeId}/messages`).then(setMessages).catch(() => {});
    };
    return () => stream.close();
  }, [activeId]);
  const send = async () => {
    if (!activeId || !draft.trim()) return;
    const text = draft; setDraft('');
    try {
      const saved = await api(`/conversations/${activeId}/messages`, { method: 'POST', body: { text } });
      setMessages(items => items.some(item => item.id === saved.id) ? items : [...items, saved]);
      setConversations(items => items.map(item => item.id === activeId ? { ...item, preview: saved.text, time: saved.time } : item)); setError('');
    } catch (e) { setDraft(text); setError(e.message); }
  };
  return <div className={`support-widget ${open ? 'support-widget-open' : ''}`}>
    {open && <section className="support-popover" aria-label="Hộp thư hỗ trợ"><header className="support-popover-head"><span className="support-popover-icon"><Icon name="chat" size={18}/></span><div><b>{agent.role === 'admin' ? 'Hộp thư hỗ trợ' : 'Trò chuyện với Admin'}</b><small>{agent.role === 'admin' ? `${conversations.length} cuộc trò chuyện` : 'Chúng tôi sẵn sàng hỗ trợ bạn'}</small></div>{agent.role === 'admin' && conversations.length > 0 && <select aria-label="Chọn cuộc trò chuyện hỗ trợ" value={activeId} onChange={event => setActiveId(event.target.value)}>{conversations.map(item => <option key={item.id} value={item.id}>{item.user_name}{item.unread > 0 ? ` · ${item.unread} mới` : ''}</option>)}</select>}<button className="support-close" aria-label="Đóng hộp thư hỗ trợ" onClick={() => setOpen(false)}>×</button></header>
      {selected ? <><div className="support-message-list">{messages.map(message => <article className={`support-message ${message.senderId === agent.id ? 'mine' : ''}`} key={message.id}><span>{message.senderName}</span><p>{message.text}</p><time>{message.time}</time></article>)}{messages.length === 0 && <div className="support-empty">{agent.role === 'admin' ? 'Gửi tin nhắn đầu tiên để hỗ trợ người dùng.' : 'Hãy gửi lời nhắn, Admin sẽ phản hồi sớm.'}</div>}</div><div className="support-compose"><textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="Nhập tin nhắn..." onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }}/><button className="button button-primary" disabled={!draft.trim()} onClick={send} aria-label="Gửi tin nhắn"><Icon name="send" size={16}/></button></div></> : <div className="support-empty">{error || (agent.role === 'admin' ? 'Chưa có tin nhắn hỗ trợ nào.' : 'Chưa thể kết nối với Admin lúc này.')}</div>}
      {error && selected && <div className="support-error">{error}</div>}
    </section>}
    <button className="support-launcher" aria-label={open ? 'Đóng hộp thư hỗ trợ' : 'Mở hộp thư hỗ trợ'} title="Hộp thư hỗ trợ" onClick={() => setOpen(value => !value)}><Icon name={open ? 'down' : 'chat'} size={23}/>{unread > 0 && !open && <span className="support-unread">{unread > 9 ? '9+' : unread}</span>}</button>
  </div>;
}

function FriendsPage({ agent, onOpenChat }) {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const friendCode = agent.publicId || '------';
  const refreshFriendLists = async () => {
    const [friendList, requests] = await Promise.all([api('/friends'), api('/friend-requests')]);
    setFriends(friendList); setIncoming(requests.incoming); setOutgoing(requests.outgoing);
  };
  useEffect(() => {
    let cancelled = false;
    const refresh = () => Promise.all([api('/friends'), api('/friend-requests')]).then(([friendList, requests]) => {
      if (cancelled) return;
      setFriends(friendList); setIncoming(requests.incoming); setOutgoing(requests.outgoing);
    }).catch(e => { if (!cancelled) setError(e.message); });
    refresh();
    const token = localStorage.getItem('alenh-agent-token') || sessionStorage.getItem('alenh-agent-token');
    const stream = token ? new EventSource(`${import.meta.env.VITE_API_URL || '/api'}/events?token=${encodeURIComponent(token)}`) : null;
    if (stream) stream.onmessage = event => {
      try { const data = JSON.parse(event.data); if (data.type === 'friend_request' || data.type === 'friend_request_updated') refresh(); } catch { /* Ignore malformed events. */ }
    };
    return () => { cancelled = true; stream?.close(); };
  }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(() => api(`/users?q=${encodeURIComponent(query.trim())}`).then(items => setResults(items.filter(item => item.role === 'user'))).catch(e => setError(e.message)), 220);
    return () => clearTimeout(timer);
  }, [query]);
  const addFriend = async user => {
    try {
      await api('/friend-requests', { method: 'POST', body: { friendCode: user.friendCode } });
      await refreshFriendLists();
      setNotice(`Đã gửi lời mời kết bạn tới ${user.name}.`); setError('');
    } catch (e) { setError(e.message); }
  };
  const respondToRequest = async (request, action) => {
    try {
      await api(`/friend-requests/${encodeURIComponent(request.id)}`, { method: 'PATCH', body: { action } });
      await refreshFriendLists();
      setNotice(action === 'accept' ? `Bạn và ${request.name} đã là bạn bè.` : `Đã từ chối lời mời từ ${request.name}.`); setError('');
    } catch (e) { setError(e.message); }
  };
  const removeFriend = async friend => {
    try { await api(`/friends/${encodeURIComponent(friend.id)}`, { method: 'DELETE' }); setFriends(items => items.filter(item => item.id !== friend.id)); setNotice(`Đã xóa ${friend.name} khỏi danh sách bạn bè.`); setError(''); }
    catch (e) { setError(e.message); }
  };
  const startChat = async friend => {
    try { const conversation = await api('/conversations', { method: 'POST', body: { userId: friend.id } }); onOpenChat(conversation.id); }
    catch (e) { setError(e.message); }
  };
  const copyFriendCode = async () => {
    try { await navigator.clipboard.writeText(friendCode); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setNotice('Hãy sao chép ID này để chia sẻ: ' + friendCode); }
  };
  const existingIds = new Set(friends.map(friend => friend.id));
  const outgoingIds = new Set(outgoing.map(request => request.userId));
  const incomingByUser = new Map(incoming.map(request => [request.userId, request]));
  return <><Header title="Bạn bè" subtitle="Tìm và kết nối với người dùng khác bằng ID riêng."/><div className="friends-page">
    <section className="friend-id-card"><div className="friend-id-icon"><Icon name="users" size={22}/></div><div className="friend-id-copy"><span>ID CỦA BẠN</span><b>{friendCode}</b><small>Chia sẻ ID này để người khác tìm và thêm bạn.</small></div><button className="button button-outline" onClick={copyFriendCode}><Icon name="paperclip" size={16}/>{copied ? 'Đã sao chép' : 'Sao chép ID'}</button></section>
    <section className="friends-panel"><div className="friends-panel-head"><div><h2>Thêm bạn bè</h2><p>Tìm theo tên hoặc nhập ID 6 số của người bạn muốn kết nối.</p></div><span className="friends-count">{friends.length} bạn bè</span></div><div className="friends-search"><Icon name="search" size={19}/><input value={query} onChange={event => { setQuery(event.target.value); setError(''); }} placeholder="Nhập tên hoặc ID 6 số"/><span>⌕</span></div>
      {results.length > 0 && <div className="friend-results"><div className="friend-results-label">KẾT QUẢ TÌM KIẾM</div>{results.map(user => <article className="friend-row" key={user.id}><span className="friend-avatar">{user.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><div className="friend-row-copy"><b>{user.name}</b><small>{user.email}</small><code>{user.friendCode}</code></div>{existingIds.has(user.id) ? <span className="friend-added">Đã là bạn bè</span> : incomingByUser.has(user.id) ? <button className="button button-primary friend-add-button" onClick={() => respondToRequest(incomingByUser.get(user.id), 'accept')}>Chấp nhận</button> : outgoingIds.has(user.id) ? <span className="friend-added friend-pending">Đang chờ chấp nhận</span> : <button className="button button-primary friend-add-button" onClick={() => addFriend(user)}><Icon name="plus" size={16}/> Gửi lời mời</button>}</article>)}</div>}
      {query.trim().length >= 2 && results.length === 0 && <div className="friends-empty-search">Không tìm thấy người dùng phù hợp. Hãy kiểm tra tên hoặc ID.</div>}
      {error && <div className="admin-alert error">{error}</div>}{notice && <div className="admin-alert success">{notice}</div>}
      {incoming.length > 0 && <div className="friend-request-section"><div className="friends-list-heading">Lời mời kết bạn <span>{incoming.length}</span></div>{incoming.map(request => <article className="friend-row" key={request.id}><span className="friend-avatar">{request.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><div className="friend-row-copy"><b>{request.name}</b><small>{request.email}</small><code>{request.friendCode}</code></div><button className="button button-primary request-accept" onClick={() => respondToRequest(request, 'accept')}>Chấp nhận</button><button className="request-reject" onClick={() => respondToRequest(request, 'reject')}>Từ chối</button></article>)}</div>}
      {outgoing.length > 0 && <div className="friend-outgoing-section"><div className="friends-list-heading">Lời mời đã gửi <span>{outgoing.length}</span></div>{outgoing.map(request => <article className="friend-row" key={request.id}><span className="friend-avatar">{request.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><div className="friend-row-copy"><b>{request.name}</b><small>{request.email}</small><code>{request.friendCode}</code></div><span className="friend-added friend-pending">Đang chờ chấp nhận</span></article>)}</div>}
      <div className="friends-list-heading">Danh sách bạn bè <span>{friends.length}</span></div>
      <div className="friends-list">{friends.map(friend => <article className="friend-row" key={friend.id}><span className="friend-avatar">{friend.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()}</span><div className="friend-row-copy"><b>{friend.name}</b><small>{friend.email}</small><code>{friend.friendCode}</code></div><span className={`friend-online ${friend.online ? 'online' : ''}`}>{friend.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</span><button className="button button-primary friend-chat-button" onClick={() => startChat(friend)}><Icon name="chat" size={16}/> Nhắn tin</button><button className="friend-remove-button" title={`Xóa ${friend.name} khỏi danh sách bạn bè`} onClick={() => removeFriend(friend)}>Xóa</button></article>)}{friends.length === 0 && <div className="friends-empty"><span><Icon name="users" size={22}/></span><b>Danh sách bạn bè đang trống</b><p>Tìm người dùng bằng tên hoặc ID để bắt đầu kết nối.</p></div>}</div>
    </section>
  </div></>;
}

function UserProfilePage({ agent, onAgentUpdate }) {
  const [form, setForm] = useState({ name: agent.name, email: agent.email, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [saving, setSaving] = useState(false);
  const save = async event => {
    event.preventDefault(); setError(''); setNotice('');
    if (form.newPassword && form.newPassword !== form.confirmPassword) { setError('Mật khẩu mới nhập lại chưa khớp.'); return; }
    setSaving(true);
    try { const result = await api('/auth/profile', { method: 'PATCH', body: form }); onAgentUpdate(result.agent); setForm(current => ({ ...current, oldPassword: '', newPassword: '', confirmPassword: '' })); setNotice('Hồ sơ đã được cập nhật.'); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };
  const initials = agent.name.split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase();
  return <><Header title="Hồ sơ cá nhân" subtitle="Quản lý thông tin và bảo mật tài khoản của bạn."/><div className="profile-page-layout"><section className="user-profile-card"><div className="user-profile-cover"/><div className="user-profile-identity"><div className="user-profile-avatar">{initials}</div><div><h2>{agent.name}</h2><p>{agent.roleLabel} · {agent.email}</p></div><span className="profile-active-tag"><i/> Đang hoạt động</span></div><form className="user-profile-form" onSubmit={save}><div className="profile-form-heading"><b>Thông tin cá nhân</b><small>Thông tin tài khoản được lưu trong PostgreSQL.</small></div><div className="profile-fields"><label>Họ và tên<input required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Email đăng nhập<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label></div><div className="profile-form-heading password-heading"><b>Đổi mật khẩu</b><small>Bỏ trống nếu bạn chưa muốn đổi.</small></div><div className="profile-fields"><label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={form.oldPassword} onChange={e => setForm({ ...form, oldPassword: e.target.value })}/></label><label>Mật khẩu mới<input type="password" minLength={8} autoComplete="new-password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}/></label><label>Nhập lại mật khẩu mới<input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}/></label></div>{error && <div className="admin-alert error">{error}</div>}{notice && <div className="admin-alert success">{notice}</div>}<div className="profile-form-actions"><button className="button button-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div></form></section><aside className="profile-security-card"><span className="security-icon"><Icon name="shield" size={18}/></span><b>Bảo mật tài khoản</b><p>Mật khẩu được mã hóa trước khi lưu vào hệ thống.</p><div><span>Vai trò</span><b>{agent.roleLabel}</b></div><div><span>Trạng thái</span><b className="security-online">Đang hoạt động</b></div></aside></div></>;
}

function AdminPage({ agent, onLogout, onAgentUpdate, page }) {
  const section = page.replace(/^admin-/, '');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [profile, setProfile] = useState({ name: agent.name, email: agent.email, oldPassword: '', newPassword: '' });
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);
  const load = async () => {
    setError(''); setNotice('');
    try {
      if (section === 'overview') setStats(await api('/admin/stats'));
      if (section === 'users' || section === 'accounts') setUsers(await api('/admin/users'));
      if (section === 'chats') setChats(await api('/admin/chats'));
    } catch (loadError) { setError(loadError.message); }
  };
  useEffect(() => { load(); }, [section, reload]);
  const action = async (path, options, success) => {
    try { await api(path, options); setNotice(success); setError(''); setReload(value => value + 1); }
    catch (actionError) { setError(actionError.message); }
  };
  const createAccount = async event => {
    event.preventDefault();
    try {
      await api('/admin/users', { method: 'POST', body: form });
      setForm({ name: '', email: '', password: '', role: 'user' });
      setNotice('Đã tạo tài khoản.'); setError(''); setReload(value => value + 1);
    } catch (actionError) { setError(actionError.message); }
  };
  const saveProfile = async event => {
    event.preventDefault();
    try {
      const result = await api('/auth/profile', { method: 'PATCH', body: profile });
      onAgentUpdate(result.agent); setProfile({ ...profile, oldPassword: '', newPassword: '' });
      setNotice('Đã cập nhật hồ sơ admin.'); setError('');
    } catch (actionError) { setError(actionError.message); }
  };
  const filteredUsers = users.filter(user => `${user.name} ${user.email} ${user.roleLabel}`.toLowerCase().includes(search.toLowerCase()));
  return <><Header title="Quản trị hệ thống" subtitle="Quản lý tài khoản, hội thoại và cấu hình quản trị." actions={<button className="button button-outline" onClick={onLogout}>Đăng xuất</button>}/>
    <div className="admin-shell">
      {error && <div className="admin-alert error">{error}</div>}{notice && <div className="admin-alert success">{notice}</div>}
      {section === 'overview' && <><section className="admin-welcome"><div className="admin-welcome-copy"><span className="admin-eyebrow"><i/> BẢNG ĐIỀU KHIỂN HỆ THỐNG</span><h2>Chào mừng trở lại, {agent.name.split(/\s+/)[0]}</h2><p>Đây là tình hình hoạt động mới nhất của nền tảng A Lênh.</p><button className="admin-welcome-button" onClick={() => setPage('admin-accounts')}><Icon name="users" size={15}/> Quản lý tài khoản <span>→</span></button></div><div className="admin-welcome-art"><div className="admin-art-orbit orbit-one"/><div className="admin-art-orbit orbit-two"/><div className="admin-art-core"><Icon name="shield" size={34}/></div><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">✧</span></div><div className="admin-welcome-foot"><span><i/> Dữ liệu thật</span><span>Theo tài khoản Admin đang đăng nhập</span></div></section><section className="admin-stats">{[['Tài khoản', stats?.users, 'users', 'blue'], ['Đang hoạt động', stats?.activeUsers, 'check', 'green'], ['Cuộc trò chuyện', stats?.chats, 'chat', 'purple'], ['Tin nhắn', stats?.messages, 'send', 'orange']].map(([label, value, icon, color]) => <article className={`admin-stat stat-${color}`} key={label}><div className="admin-stat-top"><span>{label}</span><i><Icon name={icon} size={16}/></i></div><b>{value ?? '—'}</b><small>Dữ liệu thực tế</small><div className="admin-stat-decoration"/></article>)}</section><section className="admin-overview-bottom"><article className="admin-activity-card"><div className="admin-card-heading"><div><h3>Hoạt động hệ thống</h3><p>Tổng quan dữ liệu thật trong tài khoản này</p></div><span className="admin-period">Hiện tại</span></div>{[['Tài khoản', stats?.users, 'blue'], ['Cuộc trò chuyện', stats?.chats, 'purple'], ['Tin nhắn', stats?.messages, 'green']].map(([label, value, color]) => { const max = Math.max(stats?.users || 0, stats?.chats || 0, stats?.messages || 0, 1); return <div className="admin-activity-row" key={label}><div><span>{label}</span><b>{value ?? '—'}</b></div><div className="admin-progress"><i className={`progress-${color}`} style={{ width: `${Math.max(4, ((value || 0) / max) * 100)}%` }}/></div></div>; })}</article><article className="admin-security-card"><span className="security-icon"><Icon name="shield" size={18}/></span><span className="security-status">BẢO MẬT TÀI KHOẢN</span><h3>Quyền truy cập admin</h3><p>Tài khoản của bạn có toàn quyền quản lý người dùng, dữ liệu hội thoại và cấu hình hệ thống.</p><button onClick={() => setPage('admin-profile')}>Xem hồ sơ admin <span>→</span></button></article></section></>}
      {section === 'users' && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Quản lý người dùng</h2><p>Tìm và quản lý quyền truy cập của các tác nhân.</p></div><div className="admin-search"><Icon name="search" size={16}/><input placeholder="Tìm tên, email hoặc vai trò" value={search} onChange={event => setSearch(event.target.value)}/></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>NGƯỜI DÙNG</th><th>VAI TRÒ</th><th>TRẠNG THÁI</th><th>LOẠI</th><th></th></tr></thead><tbody>{filteredUsers.map(user => <tr key={user.id}><td><b>{user.name}</b><small>{user.email}</small></td><td>{user.roleLabel}</td><td><span className={`admin-state ${user.active ? 'on' : 'off'}`}>{user.active ? 'Hoạt động' : 'Đã khóa'}</span></td><td>{user.isDemo ? 'Demo' : 'Tài khoản'}</td><td><button className="admin-action danger" disabled={user.id === agent.id || (user.role === 'admin' && users.filter(item => item.role === 'admin' && item.active).length < 2)} onClick={() => { if (window.confirm(`Xóa tài khoản ${user.email}?`)) action(`/admin/users/${user.id}`, { method: 'DELETE' }, 'Đã xóa người dùng.'); }}>Xóa</button></td></tr>)}</tbody></table></div></section>}
      {section === 'accounts' && <div className="admin-two-col"><section className="admin-panel"><div className="admin-panel-head"><div><h2>Tạo tài khoản</h2><p>Tài khoản mới mặc định có thể hoạt động ngay.</p></div></div><form className="admin-form" onSubmit={createAccount}><label>Họ và tên<input required maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>Email<input required type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })}/></label><label>Mật khẩu tạm thời<input required type="password" minLength={8} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })}/></label><label>Vai trò<select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}><option value="user">Người dùng</option><option value="admin">Quản trị viên</option></select></label><button className="button button-primary">Tạo tài khoản</button></form></section><section className="admin-panel"><div className="admin-panel-head"><div><h2>Phân quyền & trạng thái</h2><p>Thay đổi quyền hoặc khóa/mở từng tài khoản.</p></div></div><div className="admin-account-list">{users.map(user => <div className="admin-account-row" key={user.id}><div><b>{user.name}</b><small>{user.email}</small></div><select aria-label={`Vai trò ${user.name}`} value={user.role} disabled={user.id === agent.id} onChange={event => action(`/admin/users/${user.id}`, { method: 'PATCH', body: { role: event.target.value } }, 'Đã cập nhật vai trò.')}><option value="user">Người dùng</option><option value="admin">Admin</option></select><button className={`admin-action ${user.active ? 'danger' : ''}`} disabled={user.id === agent.id || (user.role === 'admin' && user.active && users.filter(item => item.role === 'admin' && item.active).length < 2)} onClick={() => action(`/admin/users/${user.id}`, { method: 'PATCH', body: { active: !user.active } }, user.active ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.')}>{user.active ? 'Khóa' : 'Mở khóa'}</button></div>)}</div></section></div>}
      {section === 'chats' && <section className="admin-panel"><div className="admin-panel-head"><div><h2>Cuộc trò chuyện của tôi</h2><p>{chats.length} cuộc trò chuyện trong tài khoản Admin này.</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>NGƯỜI DÙNG</th><th>TIN NHẮN GẦN NHẤT</th><th>CẬP NHẬT</th><th>CHƯA ĐỌC</th><th></th></tr></thead><tbody>{chats.map(chat => <tr key={chat.id}><td><b>{chat.user_name}</b><small>{chat.user_email}</small></td><td className="admin-preview">{chat.preview}</td><td>{chat.time || 'Chưa có hoạt động'}</td><td>{chat.unread || 0}</td><td><button className="admin-action" onClick={() => { if (window.confirm(`Ẩn cuộc trò chuyện với ${chat.user_name} khỏi tài khoản Admin này?`)) action(`/conversations/${chat.id}`, { method: 'DELETE' }, 'Đã ẩn cuộc trò chuyện khỏi tài khoản của bạn.'); }}>Ẩn</button></td></tr>)}</tbody></table>{chats.length === 0 && <div className="admin-empty-state">Tài khoản Admin này chưa có cuộc trò chuyện nào.</div>}</div></section>}
      {section === 'profile' && <section className="admin-panel admin-profile-panel"><div className="admin-panel-head"><div><h2>Hồ sơ admin</h2><p>Cập nhật thông tin đăng nhập và mật khẩu quản trị.</p></div><span className="admin-role-badge"><Icon name="shield" size={15}/> Quản trị viên</span></div><form className="admin-form profile-form" onSubmit={saveProfile}><label>Họ và tên<input required maxLength={120} value={profile.name} onChange={event => setProfile({ ...profile, name: event.target.value })}/></label><label>Email<input required type="email" value={profile.email} onChange={event => setProfile({ ...profile, email: event.target.value })}/></label><div className="admin-form-separator"><b>Đổi mật khẩu</b><small>Bỏ trống nếu bạn không muốn thay đổi.</small></div><label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={profile.oldPassword} onChange={event => setProfile({ ...profile, oldPassword: event.target.value })}/></label><label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} value={profile.newPassword} onChange={event => setProfile({ ...profile, newPassword: event.target.value })}/></label><button className="button button-primary">Lưu hồ sơ</button></form></section>}
    </div>
  </>;
}

function App() {
  const [page, setPage] = useState('messages');
  const [agent, setAgent] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    const onUnauthorized = () => setAgent(null);
    window.addEventListener('alenh:unauthorized', onUnauthorized);
    const token = localStorage.getItem('alenh-agent-token') || sessionStorage.getItem('alenh-agent-token');
    if (!token) { setAuthLoading(false); }
    else { api('/auth/me').then(result => { const currentAgent = normalizeAgent(result); if (!currentAgent) throw new Error('Không nhận được thông tin tài khoản.'); setAgent(currentAgent); setPage(currentAgent.role === 'admin' ? 'admin-overview' : 'messages'); }).catch(() => { localStorage.removeItem('alenh-agent-token'); sessionStorage.removeItem('alenh-agent-token'); }).finally(() => setAuthLoading(false)); }
    return () => window.removeEventListener('alenh:unauthorized', onUnauthorized);
  }, []);
  const login = async (email, password, remember) => {
    const result = await api('/auth/login', { method: 'POST', body: { email, password } });
    const currentAgent = normalizeAgent(result, { email });
    const token = result.token ?? result.accessToken;
    if (!currentAgent || typeof token !== 'string' || !token) throw new Error('Máy chủ chưa trả về thông tin phiên đăng nhập hợp lệ.');
    localStorage.removeItem('alenh-agent-token'); sessionStorage.removeItem('alenh-agent-token');
    (remember ? localStorage : sessionStorage).setItem('alenh-agent-token', token);
    setAgent(currentAgent);
    setPage(currentAgent.role === 'admin' ? 'admin-overview' : 'messages');
  };
  const register = async (name, email, password, remember) => {
    await api('/auth/register', { method: 'POST', body: { name, fullName: name, email, password } });
    await login(email, password, remember);
  };
  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* Clear the local session even if the API is unavailable. */ }
    finally { localStorage.removeItem('alenh-agent-token'); sessionStorage.removeItem('alenh-agent-token'); setAgent(null); setPage('messages'); }
  };
  if (authLoading) return <main className="auth-loading"><div className="loading-mark"><BrandMark/></div><span>Đang kiểm tra phiên đăng nhập…</span></main>;
  if (!agent) return <LoginPage onLogin={login} onRegister={register}/>;
  const allowedPage = agent.role !== 'admin' && page.startsWith('admin-') ? 'inbox' : page;
  const pageNode = allowedPage === 'messages' || allowedPage === 'inbox' ? <UserMessagingPage agent={agent} onUnreadChange={setUnreadCount} initialConversationId={pendingConversationId} onConversationOpened={() => setPendingConversationId('')}/> : allowedPage === 'friends' && agent.role === 'user' ? <FriendsPage agent={agent} onOpenChat={conversationId => { setPendingConversationId(conversationId); setPage('messages'); }}/> : allowedPage === 'profile' && agent.role !== 'admin' ? <UserProfilePage agent={agent} onAgentUpdate={setAgent}/> : allowedPage === 'admin-messages' && agent.role === 'admin' ? <UserMessagingPage agent={agent} onUnreadChange={setUnreadCount}/> : allowedPage.startsWith('admin-') && agent.role === 'admin' ? <AdminPage agent={agent} onLogout={logout} onAgentUpdate={setAgent} page={allowedPage}/> : agent.role === 'user' ? <UserMessagingPage agent={agent} onUnreadChange={setUnreadCount}/> : <InboxPage/>;
  return <AgentContext.Provider value={agent}><div className={`app-shell ${agent.role === 'user' ? 'user-shell' : ''}`}><Sidebar page={page} setPage={setPage} agent={agent} onLogout={logout} unreadCount={unreadCount}/><main className="main-area"><div className="main-inner">{pageNode}</div><footer className="app-footer"><span>© 2026 A Lênh · Nền tảng hội thoại</span><span>Trung tâm trợ giúp <b>·</b> Phản hồi</span></footer></main></div><SupportChatWidget agent={agent}/></AgentContext.Provider>;
}

createRoot(document.getElementById('root')).render(<App/>);
