import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { api } from '../api';
import { AppContext } from '../App';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AppContext);
  return (
    <div className="stack narrow">
      <AuthForm
        title="Login"
        buttonText="Sign In"
        fields={[{ name: 'email', label: 'Email', type: 'email', required: true }, { name: 'password', label: 'Password', type: 'password', required: true }]}
        onSubmit={async (form) => {
          const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) });
          localStorage.setItem('token', data.token);
          setUser(data.user);
          navigate('/dashboard');
        }}
      />
      <p>Need an account? <Link to="/register">Create one</Link></p>
    </div>
  );
}
