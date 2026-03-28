import React, { useState } from 'react';
import { shellStyles, getStoredUsers } from './shared';

export default function LoginPage({ onLogin, onGoSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = getStoredUsers();
    const found = users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase());

    if (!found) {
      setError('No account found for that email. Create one first.');
      return;
    }

    if (found.password !== password) {
      setError('Wrong password.');
      return;
    }

    setError('');
    onLogin(found);
  };

  return (
    <div style={{ ...shellStyles.page, display: 'grid', placeItems: 'center' }}>
      <div style={{ ...shellStyles.card, width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cooking Assistant</div>
          <h1 style={{ fontSize: 34, margin: '8px 0 10px' }}>Sign in</h1>
          <p style={{ color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>This build now has a working login shell around the cooking app, saved locally in your browser.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          <input style={shellStyles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input style={shellStyles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error ? <div style={{ color: '#fca5a5', fontSize: 14 }}>{error}</div> : null}
          <button type="submit" style={shellStyles.button}>Sign in</button>
        </form>
        <button type="button" onClick={onGoSignup} style={{ ...shellStyles.secondaryButton, width: '100%', marginTop: 14 }}>Create account</button>
      </div>
    </div>
  );
}
