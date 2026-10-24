import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, LayoutDashboard, Users, ArrowLeftRight, Search, Plus, LibraryBig, Bell, ChevronDown, Menu, X, Pencil, Trash2, RotateCcw, Check, AlertCircle, CalendarDays, BookMarked, TrendingUp, Clock3 } from 'lucide-react';
import { api } from './api.js';

const nav = [
  { id:'dashboard', label:'Overview', icon:LayoutDashboard },
  { id:'books', label:'Book collection', icon:BookOpen },
  { id:'members', label:'Members', icon:Users },
  { id:'transactions', label:'Issue & return', icon:ArrowLeftRight },
];
const emptyBook = { title:'', author:'', isbn:'', category:'Fiction', totalCopies:1, shelf:'' };
const emptyMember = { name:'', email:'', phone:'', memberCode:'' };
const today = new Date();
const defaultDue = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0,10);
const prettyDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : '—';

function App() {
  const [section, setSection] = useState('dashboard');
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [issueForm, setIssueForm] = useState({ bookId:'', memberId:'', dueDate:defaultDue });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const [b,m,t] = await Promise.all([api.books(), api.members(), api.transactions()]);
      setBooks(b); setMembers(m); setTransactions(t);
    } catch (e) { if (!silent) setError(`${e.message}. Check that the backend is running and MongoDB is configured.`); }
    finally { if (!silent) setLoading(false); }
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh so changes made outside the UI (e.g. by Claude via MCP) show up without a manual reload
  useEffect(() => {
    const tick = () => { if (!document.hidden && !modal) loadData(true); };
    const id = window.setInterval(tick, 10000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [loadData, modal]);

  const active = transactions.filter(t => t.status === 'issued');
  const overdue = active.filter(t => new Date(t.dueDate) < new Date());
  const totalCopies = books.reduce((sum,b) => sum + Number(b.totalCopies || 0), 0);
  const availableCopies = books.reduce((sum,b) => sum + Number(b.availableCopies || 0), 0);
  const filteredBooks = useMemo(() => {
    const q = search.toLowerCase();
    return books.filter(b => [b.title,b.author,b.isbn,b.category].some(v => (v || '').toLowerCase().includes(q)));
  }, [books, search]);
  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter(m => [m.name,m.email,m.memberCode].some(v => (v || '').toLowerCase().includes(q)));
  }, [members, search]);

  function flash(message) { setNotice(message); window.setTimeout(() => setNotice(''), 3200); }
  function openBook(book = null) { setEditing(book); setBookForm(book ? { title:book.title, author:book.author, isbn:book.isbn, category:book.category, totalCopies:book.totalCopies, shelf:book.shelf || '' } : emptyBook); setModal('book'); }
  function openMember(member = null) { setEditing(member); setMemberForm(member ? { name:member.name, email:member.email, phone:member.phone || '', memberCode:member.memberCode } : emptyMember); setModal('member'); }
  async function saveBook(e) {
    e.preventDefault();
    try {
      const body = { ...bookForm, totalCopies:Number(bookForm.totalCopies) };
      if (editing) await api.updateBook(editing._id, body); else await api.addBook(body);
      setModal(''); await loadData(); flash(editing ? 'Book details updated' : 'Book added to collection');
    } catch(e) { setError(e.message); }
  }
  async function saveMember(e) {
    e.preventDefault();
    try {
      if (editing) await api.updateMember(editing._id, memberForm); else await api.addMember(memberForm);
      setModal(''); await loadData(); flash(editing ? 'Member details updated' : 'Member registered');
    } catch(e) { setError(e.message); }
  }
  async function removeItem(kind, item) {
    if (!window.confirm(`Delete ${kind === 'book' ? `"${item.title}"` : item.name}?`)) return;
    try {
      if (kind === 'book') await api.deleteBook(item._id); else await api.deleteMember(item._id);
      await loadData(); flash(`${kind === 'book' ? 'Book' : 'Member'} deleted`);
    } catch(e) { setError(e.message); }
  }
  async function issueBook(e) {
    e.preventDefault();
    try {
      await api.issue(issueForm); setModal(''); setIssueForm({ bookId:'', memberId:'', dueDate:defaultDue });
      await loadData(); flash('Book issued successfully');
    } catch(e) { setError(e.message); }
  }
  async function returnBook(id) {
    try { await api.returnBook(id); await loadData(); flash('Book marked as returned'); }
    catch(e) { setError(e.message); }
  }
  const closeModal = () => { setModal(''); setEditing(null); };
  const title = nav.find(n => n.id === section)?.label || 'Overview';

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><LibraryBig size={23}/></div><div><strong>PageTurn</strong><span>LIBRARY SPACE</span></div><button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)}><X size={18}/></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => { setSection(item.id); setSearch(''); setSidebarOpen(false); }}><item.icon size={19}/><span>{item.label}</span>{item.id === 'transactions' && active.length > 0 && <b className="nav-count">{active.length}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><BookMarked size={19}/></div><strong>Every book has a story.</strong><p>Keep your library organized, one page at a time.</p></div><div className="profile"><div className="avatar">LA</div><div className="profile-copy"><strong>Library Admin</strong><span>Administrator</span></div><ChevronDown size={16} className="muted"/></div></div>
    </aside>
    {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button><div><div className="breadcrumb">Library / <span>{title}</span></div><h1>{section === 'dashboard' ? 'Good morning, Librarian' : title}</h1></div></div><div className="topbar-actions"><div className="today-pill"><CalendarDays size={16}/>{today.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</div><button className="icon-button notification" title="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">LA</div></div></header>
      <div className="content">
        {error && <div className="alert error-alert"><AlertCircle size={18}/><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
        {notice && <div className="alert success-alert"><Check size={18}/>{notice}</div>}
        {section === 'dashboard' && <Dashboard books={books} members={members} active={active} overdue={overdue} totalCopies={totalCopies} availableCopies={availableCopies} onBooks={() => setSection('books')} onTransactions={() => setSection('transactions')} onIssue={() => { setIssueForm({ bookId:'', memberId:'', dueDate:defaultDue }); setModal('issue'); }} loading={loading}/>}
        {section === 'books' && <section className="panel"><div className="section-head"><div><div className="eyebrow">YOUR CATALOGUE</div><h2>Book collection <span className="count-chip">{books.length}</span></h2><p>Manage titles, authors and available copies.</p></div><button className="primary-btn" onClick={() => openBook()}><Plus size={17}/> Add a book</button></div><div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, author, ISBN…"/></div><span className="toolbar-note">{filteredBooks.length} books shown</span></div>{loading ? <Loading/> : <div className="table-wrap"><table><thead><tr><th>BOOK DETAILS</th><th>ISBN</th><th>CATEGORY</th><th>AVAILABILITY</th><th>SHELF</th><th/></tr></thead><tbody>{filteredBooks.map(b => <tr key={b._id}><td><div className="book-cell"><div className={`book-cover cover-${Math.abs((b.title||'A').charCodeAt(0))%5}`}><BookOpen size={18}/></div><div><strong>{b.title}</strong><span>by {b.author}</span></div></div></td><td className="mono">{b.isbn}</td><td><span className="category-chip">{b.category}</span></td><td><span className={`availability ${b.availableCopies ? 'available' : 'unavailable'}`}><i/>{b.availableCopies} / {b.totalCopies} copies</span></td><td>{b.shelf || '—'}</td><td><div className="row-actions"><button title="Edit" onClick={() => openBook(b)}><Pencil size={16}/></button><button title="Delete" onClick={() => removeItem('book',b)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{filteredBooks.length === 0 && <Empty icon={BookOpen} title="No books found" detail="Add your first title or try another search." action={() => openBook()} actionText="Add a book"/>}</div>}</section>}
        {section === 'members' && <section className="panel"><div className="section-head"><div><div className="eyebrow">COMMUNITY</div><h2>Library members <span className="count-chip">{members.length}</span></h2><p>Keep your reader directory up to date.</p></div><button className="primary-btn" onClick={() => openMember()}><Plus size={17}/> Add member</button></div><div className="toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, member ID…"/></div><span className="toolbar-note">{filteredMembers.length} members shown</span></div>{loading ? <Loading/> : <div className="table-wrap"><table><thead><tr><th>MEMBER</th><th>MEMBER ID</th><th>EMAIL</th><th>PHONE</th><th>JOINED</th><th/></tr></thead><tbody>{filteredMembers.map((m,i) => <tr key={m._id}><td><div className="member-cell"><div className={`member-avatar avatar-${i%5}`}>{m.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div><strong>{m.name}</strong></div></td><td><span className="id-chip">{m.memberCode}</span></td><td>{m.email}</td><td>{m.phone || '—'}</td><td>{prettyDate(m.joinedAt)}</td><td><div className="row-actions"><button title="Edit" onClick={() => openMember(m)}><Pencil size={16}/></button><button title="Delete" onClick={() => removeItem('member',m)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{filteredMembers.length === 0 && <Empty icon={Users} title="No members yet" detail="Register a member to get started." action={() => openMember()} actionText="Add member"/>}</div>}</section>}
        {section === 'transactions' && <section className="panel"><div className="section-head"><div><div className="eyebrow">CIRCULATION DESK</div><h2>Issue & return</h2><p>Track borrowed books and manage due dates.</p></div><button className="primary-btn" onClick={() => { setIssueForm({ bookId:'', memberId:'', dueDate:defaultDue }); setModal('issue'); }}><Plus size={17}/> Issue a book</button></div><div className="mini-stats"><div><span>Currently issued</span><strong>{active.length}</strong></div><div><span>Overdue</span><strong className={overdue.length ? 'text-danger' : ''}>{overdue.length}</strong></div><div><span>Returned</span><strong>{transactions.filter(t=>t.status==='returned').length}</strong></div></div><div className="table-wrap"><table><thead><tr><th>BOOK / MEMBER</th><th>ISSUED ON</th><th>DUE DATE</th><th>STATUS</th><th/></tr></thead><tbody>{transactions.map(t => {const late=t.status==='issued' && new Date(t.dueDate)<new Date();return <tr key={t._id}><td><div className="transaction-book"><strong>{t.book?.title || 'Book record unavailable'}</strong><span>{t.member?.name || 'Member unavailable'} · {t.member?.memberCode || ''}</span></div></td><td>{prettyDate(t.issuedAt)}</td><td className={late?'text-danger':''}>{prettyDate(t.dueDate)}</td><td><span className={`status-chip ${t.status==='returned'?'status-returned':late?'status-overdue':'status-issued'}`}><i/>{t.status==='returned'?'Returned':late?'Overdue':'Issued'}</span></td><td>{t.status==='issued' && <button className="soft-btn" onClick={() => returnBook(t._id)}><RotateCcw size={15}/> Return</button>}</td></tr>})}</tbody></table>{!transactions.length && <Empty icon={ArrowLeftRight} title="No transactions yet" detail="Issue a book to a registered member to see it here." action={() => setModal('issue')} actionText="Issue a book"/>}</div></section>}
      </div>
      <footer className="footer"><span>© {today.getFullYear()} PageTurn Library</span><span><span className="online-dot"/> Library workspace <span className="footer-sep">·</span> Built for curious minds</span></footer>
    </main>
    {modal && <div className="modal-backdrop" onMouseDown={e => e.target===e.currentTarget && closeModal()}><div className="modal"><div className="modal-head"><div><div className="eyebrow">{modal==='issue'?'CIRCULATION':editing?'UPDATE RECORD':'NEW RECORD'}</div><h2>{modal==='book'?(editing?'Edit book':'Add a book'):modal==='member'?(editing?'Edit member':'Register a member'):'Issue a book'}</h2></div><button className="icon-button" onClick={closeModal}><X size={19}/></button></div>
      {modal==='book' && <form onSubmit={saveBook} className="form-grid"><Field label="Book title" required><input value={bookForm.title} onChange={e=>setBookForm({...bookForm,title:e.target.value})} required maxLength="160" placeholder="e.g. The Alchemist"/></Field><Field label="Author" required><input value={bookForm.author} onChange={e=>setBookForm({...bookForm,author:e.target.value})} required placeholder="Author name"/></Field><Field label="ISBN" required><input value={bookForm.isbn} onChange={e=>setBookForm({...bookForm,isbn:e.target.value})} required placeholder="ISBN number"/></Field><Field label="Category" required><select value={bookForm.category} onChange={e=>setBookForm({...bookForm,category:e.target.value})}>{['Fiction','Non-fiction','Technology','Science','History','Biography','Academic','Mystery','Fantasy','Other'].map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Total copies" required><input type="number" min="1" value={bookForm.totalCopies} onChange={e=>setBookForm({...bookForm,totalCopies:e.target.value})} required/></Field><Field label="Shelf / location"><input value={bookForm.shelf} onChange={e=>setBookForm({...bookForm,shelf:e.target.value})} placeholder="e.g. A-04"/></Field><div className="form-actions"><button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button><button className="primary-btn" type="submit">{editing?'Save changes':'Add book'}</button></div></form>}
      {modal==='member' && <form onSubmit={saveMember} className="form-grid"><Field label="Full name" required><input value={memberForm.name} onChange={e=>setMemberForm({...memberForm,name:e.target.value})} required placeholder="Member name"/></Field><Field label="Member ID" required><input value={memberForm.memberCode} onChange={e=>setMemberForm({...memberForm,memberCode:e.target.value})} required placeholder="e.g. MEM-001"/></Field><Field label="Email address" required><input type="email" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})} required placeholder="name@example.com"/></Field><Field label="Phone number"><input value={memberForm.phone} onChange={e=>setMemberForm({...memberForm,phone:e.target.value})} placeholder="Optional"/></Field><div className="form-actions"><button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button><button className="primary-btn" type="submit">{editing?'Save changes':'Register member'}</button></div></form>}
      {modal==='issue' && <form onSubmit={issueBook} className="form-grid single-grid"><Field label="Choose a book" required><select value={issueForm.bookId} onChange={e=>setIssueForm({...issueForm,bookId:e.target.value})} required><option value="">Select an available book</option>{books.filter(b=>b.availableCopies>0).map(b=><option key={b._id} value={b._id}>{b.title} — {b.availableCopies} available</option>)}</select></Field><Field label="Choose a member" required><select value={issueForm.memberId} onChange={e=>setIssueForm({...issueForm,memberId:e.target.value})} required><option value="">Select a member</option>{members.map(m=><option key={m._id} value={m._id}>{m.name} ({m.memberCode})</option>)}</select></Field><Field label="Due date" required><input type="date" min={new Date(Date.now()+86400000).toISOString().slice(0,10)} value={issueForm.dueDate} onChange={e=>setIssueForm({...issueForm,dueDate:e.target.value})} required/></Field>{(!books.some(b=>b.availableCopies>0)||!members.length)&&<p className="form-hint">You need at least one available book and one registered member before issuing.</p>}<div className="form-actions"><button type="button" className="secondary-btn" onClick={closeModal}>Cancel</button><button className="primary-btn" type="submit" disabled={!books.some(b=>b.availableCopies>0)||!members.length}>Confirm issue</button></div></form>}
    </div></div>}
  </div>;
}

function Dashboard({books,members,active,overdue,totalCopies,availableCopies,onBooks,onTransactions,onIssue,loading}) {
  const recent = [...active].sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate)).slice(0,5);
  return <div className="dashboard"><div className="welcome-banner"><div className="welcome-copy"><span className="welcome-tag"><span/> YOUR LIBRARY AT A GLANCE</span><h2>A little more knowledge,<br/><em>every single day.</em></h2><p>Here's what's happening in your library today.</p><button className="welcome-btn" onClick={onBooks}>Explore collection <span>↗</span></button></div><div className="welcome-art"><div className="art-sun"/><div className="art-book book-one"/><div className="art-book book-two"/><div className="art-book book-three"/><div className="art-plant"><span/><span/><span/><i/></div><div className="art-spark spark-one">✳</div><div className="art-spark spark-two">✦</div></div></div>
  <div className="stats-grid"><Stat icon={BookOpen} label="Total book copies" value={totalCopies} note={`${books.length} unique titles`} tone="blue"/><Stat icon={Check} label="Available copies" value={availableCopies} note={totalCopies?`${Math.round(availableCopies/totalCopies*100)}% of collection`:'Add your first book'} tone="green"/><Stat icon={ArrowLeftRight} label="Books on loan" value={active.length} note="Currently with readers" tone="purple"/><Stat icon={Users} label="Registered members" value={members.length} note="Your reading community" tone="orange"/></div>
  <div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-title"><div><h3>Due dates to watch</h3><p>Keep an eye on books currently on loan.</p></div><button className="text-link" onClick={onTransactions}>View all <span>→</span></button></div>{loading?<Loading/>:recent.length?<div className="due-list">{recent.map(t=>{const late=new Date(t.dueDate)<new Date();return <div className="due-item" key={t._id}><div className="due-book-icon"><BookOpen size={18}/></div><div className="due-info"><strong>{t.book?.title||'Book'}</strong><span>{t.member?.name||'Member'} · {t.member?.memberCode||''}</span></div><div className="due-date"><span className={late?'text-danger':''}>{prettyDate(t.dueDate)}</span><small className={late?'text-danger':''}>{late?'Overdue':'Due date'}</small></div></div>})}</div>:<div className="empty-inline"><div className="empty-icon"><Check size={20}/></div><strong>All caught up</strong><span>No books are currently on loan.</span></div>}</section>
  <section className="panel quick-panel"><div className="panel-title"><div><h3>Quick actions</h3><p>Common tasks, one click away.</p></div><TrendingUp size={19} className="muted"/></div><button className="quick-action" onClick={onIssue}><div className="quick-icon qi-purple"><ArrowLeftRight size={19}/></div><div><strong>Issue a book</strong><span>Check out a title to a member</span></div><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={onBooks}><div className="quick-icon qi-blue"><Plus size={19}/></div><div><strong>Manage collection</strong><span>Add or update book records</span></div><span className="quick-arrow">↗</span></button><button className="quick-action" onClick={onTransactions}><div className="quick-icon qi-orange"><Clock3 size={19}/></div><div><strong>Returns & history</strong><span>Review library transactions</span></div><span className="quick-arrow">↗</span></button></section></div>
  {overdue.length>0&&<div className="overdue-banner"><AlertCircle size={18}/><div><strong>{overdue.length} {overdue.length===1?'book is':'books are'} overdue</strong><span>Review the issue & return page to follow up on late returns.</span></div><button onClick={onTransactions}>Review <span>→</span></button></div>}
  </div>;
}
function Stat({icon:Icon,label,value,note,tone}) { return <div className="stat-card"><div className={`stat-icon tone-${tone}`}><Icon size={19}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div><div className={`stat-accent accent-${tone}`}/></div>; }
function Field({label,required,children}) { return <label className="field"><span>{label}{required&&<b> *</b>}</span>{children}</label>; }
function Loading() { return <div className="loading-state"><span className="spinner"/> Loading library data…</div>; }
function Empty({icon:Icon,title,detail,action,actionText}) { return <div className="empty-state"><div className="empty-icon"><Icon size={23}/></div><strong>{title}</strong><p>{detail}</p>{action&&<button className="secondary-btn" onClick={action}><Plus size={15}/>{actionText}</button>}</div>; }
export default App;
