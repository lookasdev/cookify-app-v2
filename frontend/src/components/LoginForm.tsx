import React, { useState } from 'react';
import { api, RegisterData, LoginData } from '../api';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
            minLength={6}
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
    </div>
  );
};
