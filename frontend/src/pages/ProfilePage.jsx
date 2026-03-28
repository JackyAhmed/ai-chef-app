import React, { useState } from 'react';
import { shellStyles, getStoredUsers, saveUsers } from './shared';

export default function ProfilePage({ user, onUpdateUser, onLogout, onGoRecipes, onGoGenerate }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    level: user?.level || 'Beginner',
    bio: user?.bio || '',
  });
  const [message, setMessage] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = (e) => {
    e.preventDefault();
    const users = getStoredUsers().map((item) => item.id === user.id ? { ...item, ...form } : item);
    saveUsers(users);
    const updated = { ...user, ...form };
    onUpdateUser(updated);
    setMessage('Profile saved.');
  };

  return (
    <div style={shellStyles.page}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <button onClick={onGoRecipes} style={shellStyles.navButton}>Dashboard</button>
        <button onClick={onGoGenerate} style={shellStyles.navButton}>Recipe Planner</button>
        <button onClick={onLogout} style={shellStyles.secondaryButton}>Logout</button>
      </div>
      <div style={{ ...shellStyles.card, maxWidth: 700, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Profile</h1>
        <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
          <input style={shellStyles.input} value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Name" />
          <input style={shellStyles.input} value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Email" />
          <select style={shellStyles.input} value={form.level} onChange={(e) => update('level', e.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
          <textarea style={{ ...shellStyles.input, minHeight: 120, resize: 'vertical' }} value={form.bio} onChange={(e) => update('bio', e.target.value)} placeholder="Bio" />
          {message ? <div style={{ color: '#86efac' }}>{message}</div> : null}
          <button type="submit" style={shellStyles.button}>Save changes</button>
        </form>
      </div>
    </div>
  );
}
