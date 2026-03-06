import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { api } from '../api';
import { AppContext } from '../App';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useContext(AppContext);
  return (
    <div className="stack narrow">
      <AuthForm
        title="Create account"
        buttonText="Register"
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'password', label: 'Password', type: 'password', required: true },
          { name: 'city', label: 'City' },
          { name: 'state', label: 'State' }
        ]}
        onSubmit={async (form) => {
          const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) });
          localStorage.setItem('token', data.token);
          setUser(data.user);
          navigate('/dashboard');
        }}
      />
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
