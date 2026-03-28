export const shellStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '24px',
    boxSizing: 'border-box',
  },
  card: {
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    borderRadius: 20,
    boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(10px)',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    padding: '12px 16px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(30, 41, 59, 0.85)',
    color: '#e2e8f0',
    fontWeight: 600,
    cursor: 'pointer',
  },
  navButton: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(30, 41, 59, 0.85)',
    color: '#e2e8f0',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export const getStoredUsers = () => {
  try {
    return JSON.parse(localStorage.getItem('cooking-assistant-users') || '[]');
  } catch {
    return [];
  }
};

export const saveUsers = (users) => {
  localStorage.setItem('cooking-assistant-users', JSON.stringify(users));
};
