import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CreateTestPortalUser() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
    userId: string;
    clientId: string;
  } | null>(null);

  const createTestUser = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-test-portal-user', {
        body: {}
      });

      if (error) throw error;

      setCredentials(data.credentials);
      toast.success('Test portal user created successfully!');
    } catch (error: any) {
      console.error('Error creating test user:', error);
      toast.error(error.message || 'Failed to create test user');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Test Portal User</h1>
          <p className="text-muted-foreground mt-2">
            Generate a test client portal user for development and testing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test User Generator</CardTitle>
            <CardDescription>
              This will create a new client record with portal access enabled and a test user account with the client_user role.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!credentials ? (
              <Button 
                onClick={createTestUser} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Test User...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Test Portal User
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Test user created successfully! Use these credentials to log in to the portal.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground font-mono">{credentials.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(credentials.email, 'Email')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Password</p>
                      <p className="text-sm text-muted-foreground font-mono">{credentials.password}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(credentials.password, 'Password')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-muted-foreground">
                      User ID: {credentials.userId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Client ID: {credentials.clientId}
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={() => setCredentials(null)}
                  variant="outline"
                  className="w-full"
                >
                  Create Another Test User
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
