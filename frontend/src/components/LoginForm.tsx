import React, { useEffect, useState } from 'react';
import { api, RegisterData, LoginData, AppStats } from '../api';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState<AppStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setStatsLoading(true);
        setStatsError('');
        const s = await api.getStats();
        if (isMounted) setStats(s);
      } catch (e) {
        if (isMounted) setStatsError('Unable to load stats');
      } finally {
        if (isMounted) setStatsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data: RegisterData = { email, password };
      await api.register(data);
      setSuccess('Registration successful! You can now login.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const data: LoginData = { email, password };
      const response = await api.login(data);
      
      // Store token in localStorage and memory
      localStorage.setItem('token', response.access);
      onLogin(response.access);
      setSuccess('Login successful!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Login / Register</h2>

      <div className="about-notes" style={{ marginBottom: '1rem' }}>
        <p>
          Login to unlock extra features: manage your <strong>Pantry</strong> (quantities & expiry dates),
          save recipes, and sync data across sessions.
        </p>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your password"
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={handleRegister}
            disabled={isLoading || !email || !password}
            className="register-btn"
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
          
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="login-btn"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>

      <div className="login-stats">
        {statsLoading && (
          <div className="stats-loading">
            <div className="loading-spinner"></div>
            <span>Loading app stats…</span>
          </div>
        )}
        {!statsLoading && statsError && (
          <div className="stats-error">
            <span>Unable to load stats</span>
          </div>
        )}
        {!statsLoading && !statsError && stats && (
          <div className="stats-container">
            <div className="stats-header">
              <h3>Community Stats</h3>
              <p>Join thousands of home cooks</p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.users.toLocaleString()}</div>
                  <div className="stat-label">Active Users</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🍽️</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.saved_recipes.toLocaleString()}</div>
                  <div className="stat-label">Saved Recipes</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.pantry_items.toLocaleString()}</div>
                  <div className="stat-label">Pantry Items</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
