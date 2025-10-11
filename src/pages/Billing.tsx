import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  FileText, 
  Receipt, 
  CreditCard, 
  CheckSquare,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Billing() {
  const navigate = useNavigate();

  const billingCategories = [
    {
      title: 'Eligibility & Benefits',
      description: 'Verify insurance coverage and benefits',
      icon: CheckSquare,
      color: 'from-blue-400 to-cyan-400',
      path: '/billing/eligibility-verification',
      features: ['Check eligibility', 'View benefits', 'Upload insurance cards', 'Sync patients']
    },
    {
      title: 'Claims Management',
      description: 'Create, submit, and track insurance claims',
      icon: FileText,
      color: 'from-green-400 to-emerald-400',
      path: '/billing/claims',
      features: ['Create claims', 'Submit to payers', 'Track status', 'Manage denials']
    },
    {
      title: 'Payment Processing',
      description: 'Process ERA files and post payments',
      icon: CreditCard,
      color: 'from-purple-400 to-pink-400',
      path: '/billing/payment-processing',
      features: ['ERA upload', 'Payment posting', 'Reconciliation', 'EOB generation']
    },
    {
      title: 'Client Statements',
      description: 'Generate and manage patient statements',
      icon: Receipt,
      color: 'from-orange-400 to-red-400',
      path: '/billing/client-statements',
      features: ['Generate statements', 'Track balances', 'Aging reports', 'Collections']
    },
    {
      title: 'Fee Schedules',
      description: 'Manage contracted rates and pricing',
      icon: DollarSign,
      color: 'from-indigo-400 to-violet-400',
      path: '/billing/fee-schedules',
      features: ['Contract rates', 'Standard fees', 'Modifier pricing', 'Payer contracts']
    },
    {
      title: 'Charge Management',
      description: 'Review charges and billing status',
      icon: Calendar,
      color: 'from-teal-400 to-cyan-400',
      path: '/billing/management',
      features: ['Charge entries', 'Billing queue', 'Payment history', 'Adjustments']
    },
    {
      title: 'Analytics & Reports',
      description: 'Revenue and billing performance metrics',
      icon: TrendingUp,
      color: 'from-amber-400 to-yellow-400',
      path: '/billing/reports',
      features: ['Revenue reports', 'Collection rates', 'Payer analysis', 'Aging summaries']
    },
    {
      title: 'Payroll',
      description: 'Manage clinician compensation and payroll',
      icon: Users,
      color: 'from-rose-400 to-pink-400',
      path: '/billing/payroll',
      features: ['Payroll tracking', 'Commission rates', 'Payment schedules', 'Reports']
    }
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Billing & Revenue Cycle
          </h1>
          <p className="text-muted-foreground text-lg">
            Complete revenue cycle management from eligibility to payment posting
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {billingCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.title}
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(category.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-br ${category.color}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Revenue cycle performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold">—</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Outstanding A/R</p>
                <p className="text-2xl font-bold">—</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold">—</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Days in A/R</p>
                <p className="text-2xl font-bold">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
