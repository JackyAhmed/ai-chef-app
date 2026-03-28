import React, { useState } from 'react';
import { shellStyles, getStoredUsers, saveUsers } from './shared';

export default function SignupPage({ onSignup, onGoLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', level: 'Beginner', bio: '' });
  const [error, setError] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = getStoredUsers();
    const email = form.email.trim().toLowerCase();
    if (users.some((user) => user.email.toLowerCase() === email)) {
      setError('That email is already in use.');
      return;
    }

    const newUser = {
      id: Date.now(),
      name: form.name.trim() || 'Home Cook',
      email,
      password: form.password,
      level: form.level,
      bio: form.bio.trim(),
      joinedAt: new Date().toISOString(),
    };

    saveUsers([...users, newUser]);
    setError('');
    onSignup(newUser);
  };

  return (
    <div style={{ ...shellStyles.page, display: 'grid', placeItems: 'center' }}>
      <div style={{ ...shellStyles.card, width: '100%', maxWidth: 560, padding: 28 }}>
        <h1 style={{ fontSize: 34, marginTop: 0 }}>Create account</h1>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input style={shellStyles.input} placeholder="Full name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          <input style={shellStyles.input} type="email" placeholder="Email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          <input style={shellStyles.input} type="password" placeholder="Password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
          <select style={shellStyles.input} value={form.level} onChange={(e) => update('level', e.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <textarea style={{ ...shellStyles.input, minHeight: 110, resize: 'vertical' }} placeholder="Bio or cooking goals" value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          {error ? <div style={{ color: '#fca5a5', fontSize: 14 }}>{error}</div> : null}
          <button type="submit" style={shellStyles.button}>Create account</button>
        </form>
        <button type="button" onClick={onGoLogin} style={{ ...shellStyles.secondaryButton, width: '100%', marginTop: 14 }}>Back to sign in</button>
      </div>
    </div>
  );
}
