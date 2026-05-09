import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Mail, Lock, User, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const RING_COLORS = ['#0085C7', '#F4C300', '#1a1a2e', '#009F3D', '#DF0024'];

export default function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', bio: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">


      <div className="w-full max-w-md animate-fade-in relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32">
            <img src="Logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            ShowUp<span style={{ color: '#0085C7' }}>2</span>Move
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#64748b' }}>
            Join the community of active athletes
          </p>


        </div>

        <Card className="glass border-0 shadow-2xl" style={{ borderRadius: '0rem 0rem 1.25rem 1.25rem' }}>
          <div className="olympic-border" />
          <CardHeader className="pb-2 pt-6 px-8">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif', color: '#1e293b' }}>
              Create Account
            </h2>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Fill in the details to get started
            </p>
          </CardHeader>

          <CardContent className="px-8 pb-8 pt-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-5 text-sm"
                style={{ background: 'rgba(223,0,36,0.1)', border: '1px solid rgba(223,0,36,0.3)', color: '#DF0024' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Full Name
                </Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-9 h-11"
                    style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    value={formData.name}
                    onChange={set('name')}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Email Address
                </Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 h-11"
                    style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    value={formData.email}
                    onChange={set('email')}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Password
                </Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 6 characters"
                    className="pl-9 h-11"
                    style={{ background: 'var(--input)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    value={formData.password}
                    onChange={set('password')}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                  Short Bio <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
                </Label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3" style={{ color: 'var(--muted-foreground)' }} />
                  <Textarea
                    id="bio"
                    placeholder="Tell others what sports you love..."
                    className="pl-9 pt-2.5 resize-none"
                    rows={3}
                    style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', color: '#1e293b', borderRadius: '0.5rem' }}
                    value={formData.bio}
                    onChange={set('bio')}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-semibold text-white mt-2 transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                style={{ background: 'black', border: 'none', borderRadius: '0.625rem', fontFamily: 'Outfit, sans-serif' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight size={16} />
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: '#0085C7' }}>
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
