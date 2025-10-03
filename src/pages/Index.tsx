// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Activity, Shield, Users, FileText, Calendar } from 'lucide-react';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-hero)' }}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">MentalSpace EHR</span>
          </div>
          <Button onClick={() => navigate('/auth')}>
            Get Started
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Complete EHR Solution for
            <span className="text-primary"> Mental Health Professionals</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your practice with HIPAA-compliant electronic health records, 
            AI-powered documentation, and comprehensive supervision tools.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">HIPAA Compliant</h3>
            <p className="text-muted-foreground">
              End-to-end encryption and secure data storage for complete patient privacy
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">AI Documentation</h3>
            <p className="text-muted-foreground">
              Generate comprehensive clinical notes automatically with AI assistance
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Supervision Tools</h3>
            <p className="text-muted-foreground">
              Built-in supervision workflows with co-signing and hour tracking
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold">Smart Scheduling</h3>
            <p className="text-muted-foreground">
              Integrated scheduling with automated reminders and telehealth
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6 p-12 rounded-lg bg-card border">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join mental health professionals who trust MentalSpace EHR
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>&copy; 2025 MentalSpace EHR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
