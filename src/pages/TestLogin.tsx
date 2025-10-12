import { useState } from 'react';
import { cognitoAuth } from '@/lib/aws-cognito';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TestLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult('Attempting login...');

    try {
      const { session, error } = await cognitoAuth.signIn(email, password);

      if (error) {
        if (error.message === 'NEW_PASSWORD_REQUIRED') {
          setResult('Password change required. Please enter a new password below.');
          setNeedsPasswordChange(true);
        } else {
          setResult(`Error: ${error.message}`);
        }
      } else if (session) {
        setResult(`SUCCESS! Logged in as: ${session.user.email}\nRole: ${session.user['custom:role']}`);
      }
    } catch (err: any) {
      setResult(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setResult('Error: Passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setResult('Error: Password must be at least 12 characters');
      return;
    }

    if (!name.trim()) {
      setResult('Error: Name is required');
      return;
    }

    setLoading(true);
    setResult('Changing password...');

    try {
      const { session, error } = await cognitoAuth.setNewPassword(newPassword, { name });

      if (error) {
        console.error('Password change error:', error);

        if (error.message === 'MFA_SETUP_REQUIRED') {
          setResult(`Password changed successfully!\n\nHowever, MFA (Multi-Factor Authentication) setup is required.\n\nFor now, this is a known limitation. You may need to disable MFA requirement in Cognito, or we need to implement MFA setup flow.`);
        } else {
          setResult(`Error: ${error.message}\n\nPlease go back and login again to get a fresh session.`);
        }
      } else if (session) {
        setResult(`SUCCESS! Password changed and logged in as: ${session.user.email}\nRole: ${session.user['custom:role']}`);
        setNeedsPasswordChange(false);
      }
    } catch (err: any) {
      console.error('Password change exception:', err);
      setResult(`Exception: ${err.message}\n\nPlease go back and login again to get a fresh session.`);
    } finally {
      setLoading(false);
    }
  };

  if (needsPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Change Password Required</CardTitle>
            <CardDescription>
              You must set a new password before continuing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 12 chars)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNeedsPasswordChange(false);
                  setResult('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setName('');
                }}
                className="w-full"
              >
                Back to Login
              </Button>
              {result && (
                <div className="p-4 border rounded bg-gray-50">
                  <pre className="text-sm whitespace-pre-wrap">{result}</pre>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Cognito Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email:</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mentalspaceehr.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password:</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in...' : 'Test Login'}
            </Button>
            {result && (
              <div className="p-4 border rounded bg-gray-50">
                <pre className="text-sm whitespace-pre-wrap">{result}</pre>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
