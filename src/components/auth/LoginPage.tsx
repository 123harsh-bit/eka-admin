import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/errorMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(getAuthErrorMessage(error));
    } else {
      // Role-based redirect handled by App routing
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error } = await resetPassword(email);
    if (error) {
      setError(getAuthErrorMessage(error));
    } else {
      setResetSent(true);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center animated-gradient">
      <div className="w-full max-w-md mx-4 fade-in">
        <div className="glass-card p-8 space-y-6">
          {/* Eka Logo */}
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-display font-extrabold gradient-text tracking-tight">
              Eka
            </h1>
            <p className="text-sm text-muted-foreground">Creative Agency Management</p>
          </div>

          {isForgotPassword ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <div className="text-4xl">📧</div>
                <h2 className="text-lg font-display font-semibold text-foreground">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a password reset link to <strong className="text-foreground">{email}</strong>
                </p>
                <Button
                  variant="ghost"
                  onClick={() => { setIsForgotPassword(false); setResetSent(false); }}
                  className="text-primary"
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h2 className="text-lg font-display font-semibold text-foreground text-center">
                  Reset your password
                </h2>
                <p className="text-sm text-muted-foreground text-center">
                  Enter your email and we&apos;ll send you a reset link.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="bg-input/50 border-glass-border"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { setIsForgotPassword(false); setError(''); }}
                  className="w-full text-muted-foreground"
                >
                  Back to login
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-input/50 border-glass-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-input/50 border-glass-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>

              <button
                type="button"
                onClick={() => { setIsForgotPassword(true); setError(''); }}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
