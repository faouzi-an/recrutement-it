import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Recru<span>IT</span></h1>
          <p>Plateforme de gestion du recrutement IT</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com" required autoFocus />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <div className="login-demo">
          <p>Comptes de démonstration :</p>
          <div className="demo-accounts">
            <button type="button" className="demo-btn" onClick={() => { setEmail('rh@recruit.com'); setPassword('password'); }}>
              <strong>RH</strong> rh@recruit.com
            </button>
            <button type="button" className="demo-btn" onClick={() => { setEmail('manager@recruit.com'); setPassword('password'); }}>
              <strong>Manager</strong> manager@recruit.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
