import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatNaira } from '../utils/formatters';

// A self-contained, offline "AI" assistant for SaveCircle.
// It understands natural-language questions about the app and the signed-in
// user's own data, and responds instantly without any external API.

const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'how far', 'yo', 'salam', 'hola'];

const getIntent = (text) => {
  const t = text.toLowerCase();
  if (greetings.some(g => t.includes(g))) return 'greeting';
  if (t.includes('help') || t.includes('how do i') || t.includes('how can i') || t.includes('what can you')) return 'help';
  if (t.includes('who are you') || t.includes('what are you') || t.includes('your name')) return 'identity';
  if (t.includes('logout') || t.includes('log out') || t.includes('sign out')) return 'logout';
  if (t.includes('theme') || t.includes('dark') || t.includes('light mode') || t.includes('dark mode')) return 'theme';
  if (t.includes('password') && (t.includes('change') || t.includes('forgot'))) return 'password';
  if (t.includes('create') && (t.includes('group') || t.includes('pool'))) return 'createGroup';
  if (t.includes('contribution') || t.includes('paid') || t.includes('payment') || t.includes('contributed')) return 'contributions';
  if (t.includes('payout') || t.includes('disburs') || t.includes('collect') || t.includes('hand') || t.includes('pot')) return 'payouts';
  if (t.includes('member') || t.includes('who') || t.includes('people')) return 'members';
  if (t.includes('group') || t.includes('pool') || t.includes('savecircle')) return 'groups';
  if (t.includes('admin') || t.includes('role') || t.includes('super')) return 'roles';
  return 'fallback';
};

export default function AiChat({ groups = [] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: `Hi${user ? ' ' + user.name.split(' ')[0] : ''}! 👋 I'm the SaveCircle Assistant. Ask me about your groups, contributions, payouts, or how to use the app.` }
  ]);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, open]);

  const groupCount = Array.isArray(groups) ? groups.length : 0;
  const myGroup = Array.isArray(groups) && groups[0];
  const roleLabel = user?.role === 'superadmin' ? 'Super Admin' : user?.role === 'admin' ? 'Group Admin' : 'Member';

  const totalCollected = () => {
    let total = 0;
    (Array.isArray(groups) ? groups : []).forEach(g => {
      Object.values(g.contributions || {}).forEach(cycle => {
        (cycle || []).forEach(c => { if (c.status === 'Verified') total += g.contributionAmount; });
      });
    });
    return total;
  };

  const myMember = myGroup?.members?.[0];

  const answer = (intent) => {
    switch (intent) {
      case 'greeting':
        return `Hello${user ? ' ' + user.name.split(' ')[0] : ''}! 👋 How can I help you today? You can ask about your groups, contributions, payouts, members, or how to use the app.`;
      case 'identity':
        return "I'm the SaveCircle Assistant 🤖 — a built-in helper for SaveCircle. I can tell you about your groups, contributions, payouts, members, and guide you through the app. I work fully offline!";
      case 'help':
        if (!user) return "I can help you with:\n• Logging in (use the demo accounts shown below)\n• Understanding the dark/light mode toggle\n• What each module in the sidebar does\n\nOnce you log in, ask me about your groups, contributions, and payouts.";
        return `Here's how to use the app, ${user.name.split(' ')[0]}:\n• **Dashboard** — your overview and key stats.\n• **SaveCircle Groups / My Group** — view groups (yours if you're a member).\n• **Contributions** — see the payment matrix.\n• **Members** — manage users (admin+).\n• **Audit History** — activity trail.\n\nAsk me about any of these!`;
      case 'logout':
        return "To log out, click the **Logout** button at the bottom of the sidebar. It has a red icon. 🔴";
      case 'theme':
        return "There's a **Dark/Light mode** toggle! On the login page it's the pill button at the top-right. Inside the app, it's the button at the bottom of the sidebar (just above Logout). Your choice is saved automatically. 🌙☀️";
      case 'password':
        return user
          ? "Your account is managed by your group admin or the super admin. Ask them to reset your password. For the demo, the current password is shown on the login page."
          : "Passwords are set by the super admin / group admin when accounts are created. Use the demo credentials shown on this page to log in.";
      case 'createGroup':
        return user && (user.role === 'admin' || user.role === 'superadmin')
          ? "To create a new SaveCircle pool, click the **Create SaveCircle Pool** button in the sidebar (or 'Start New SaveCircle Pool' on the dashboard). Fill in the name, location, contribution amount, frequency, and members."
          : "Only admins and the super admin can create groups. Ask your group admin if you need a new pool created.";
      case 'contributions':
        if (!user) return "Log in first, then I can tell you about contributions. Each member contributes a fixed amount per cycle; statuses are Verified, Pending Verification, or Overdue.";
        if (user.role === 'member') {
          const paid = Object.values(myGroup?.contributions || {}).reduce((n, c) => n + (c || []).filter(x => x.status === 'Verified').length, 0);
          const cycles = Object.keys(myGroup?.contributions || {}).length;
          return `You have contributed **${formatNaira(totalCollected())}** in total. You've completed **${paid} of ${cycles || 0}** cycles so far, all via verified payments. Great job! ✅`;
        }
        const pending = (Array.isArray(groups) ? groups : []).reduce((n, g) => n + Object.values(g.contributions || {}).reduce((m, c) => m + (c || []).filter(x => x.status === 'Pending Verification').length, 0), 0);
        return `Across ${groupCount} group${groupCount === 1 ? '' : 's'}, there are currently **${pending}** payment${pending === 1 ? '' : 's'} pending verification. You can verify them from the Contributions matrix.`;
      case 'payouts':
        if (!user) return "Log in to see payout information. Each cycle, one member receives the full pot ('takes the hand').";
        if (user.role === 'member') {
          const upcoming = (myGroup?.payoutSchedule || []).find(s => s.status === 'Upcoming' || s.status === 'Current Target');
          const past = (myGroup?.payoutSchedule || []).filter(s => s.status === 'Disbursed').length;
          return upcoming
            ? `Your next payout is **${formatNaira(upcoming.amount)}** (Turn #${upcoming.cycle}). You've already received **${past}** payout${past === 1 ? '' : 's'}. 🎉`
            : `You've received **${past}** payout${past === 1 ? '' : 's'} so far. Check the Contributions module for your schedule.`;
        }
        return `Each group runs a rotation — one member collects the full pot per cycle. Check the **Payout Queue** tab in any group to see the rotation and disburse the next payout.`;
      case 'members':
        if (!user) return "Log in to see member information.";
        if (user.role === 'member') {
          return myMember ? `You are member **#${myMember.position}** in **${myGroup?.name}**. Your bank: ${myMember.bank}.` : 'You are not assigned a member record yet.';
        }
        return user.role === 'superadmin'
          ? "As Super Admin you can see every user across all groups. Open the **Members** module to manage them, or **Admins** to assign group admins."
          : "Open the **Members** module to see everyone in your group. You can add new users with the **Add User** button.";
      case 'groups':
        if (!user) return `The app currently has ${groupCount} SaveCircle group${groupCount === 1 ? '' : 's'}. Log in to see details.`;
        return user.role === 'superadmin'
          ? `There are **${groupCount}** SaveCircle groups in the app. You have full visibility over all of them.`
          : `You have access to **${groupCount}** group${groupCount === 1 ? '' : 's'} (${myGroup ? myGroup.name : 'none'}).`;
      case 'roles':
        return "This app has 3 roles:\n• **Super Admin** — sees all groups & users, manages admins.\n• **Group Admin** — manages one group's members & contributions.\n• **Member** — sees only their own page, contributions, and payouts.";
      default:
        return "I can help with questions about your **groups**, **contributions**, **payouts**, **members**, **roles**, and how to use the app. Try asking something like 'how much have I contributed?' or 'when is my next payout?'";
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const intent = getIntent(text);
    const botReply = answer(intent);
    setMessages(prev => [...prev, { from: 'user', text }, { from: 'bot', text: botReply }]);
    setInput('');
  };

  return (
    <>
      {/* Floating chat panel */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1.25rem',
          width: '360px',
          maxWidth: 'calc(100vw - 2.5rem)',
          height: '480px',
          maxHeight: 'calc(100vh - 7rem)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          zIndex: 200,
          animation: 'scaleUp 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.9rem 1rem',
            background: 'linear-gradient(135deg, var(--primary) 0%, #00a865 100%)',
            color: '#fff'
          }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot className="w-5 h-5" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>SaveCircle Assistant</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Online • works offline</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                background: m.from === 'user' ? 'var(--primary)' : 'var(--bg-card)',
                color: m.from === 'user' ? '#fff' : 'var(--text-main)',
                border: m.from === 'user' ? 'none' : '1px solid var(--border-card)',
                fontSize: '0.85rem',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap'
              }}>
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', borderTop: '1px solid var(--border-card)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your SaveCircle..."
              className="form-input"
              style={{ fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.5rem 0.75rem' }} title="Send">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        title="SaveCircle Assistant"
        style={{
          position: 'fixed',
          bottom: '1.25rem',
          right: '1.25rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary) 0%, #00a865 100%)',
          color: '#fff',
          border: 'none',
          boxShadow: 'var(--shadow-glow)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </>
  );
}
