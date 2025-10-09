import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AlertRule {
  id: string;
  rule_name: string;
  action_type: string;
  resource_type: string;
  severity: string;
  threshold: number;
  time_window_minutes: number;
  alert_recipients: string[];
  is_active: boolean;
  created_at: string;
}

export const AuditAlertRulesManager = () => {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    action_type: 'phi_access',
    resource_type: 'client_chart',
    severity: 'warning',
    threshold: 50,
    time_window_minutes: 60,
    alert_recipients: [] as string[],
    is_active: true
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Failed to load alert rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load alert rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('audit_alert_rules')
          .update(formData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Alert rule updated' });
      } else {
        // Create new rule
        const { error } = await supabase
          .from('audit_alert_rules')
          .insert([formData]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Alert rule created' });
      }

      setDialogOpen(false);
      setEditingRule(null);
      resetForm();
      loadRules();
    } catch (error) {
      console.error('Failed to save alert rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save alert rule',
        variant: 'destructive'
      });
    }
  };

  const toggleRuleStatus = async (rule: AlertRule) => {
    try {
      const { error } = await supabase
        .from('audit_alert_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: `Alert rule ${!rule.is_active ? 'activated' : 'deactivated'}`
      });
      
      loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert rule',
        variant: 'destructive'
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      const { error } = await supabase
        .from('audit_alert_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Alert rule deleted' });
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete alert rule',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      action_type: 'phi_access',
      resource_type: 'client_chart',
      severity: 'warning',
      threshold: 50,
      time_window_minutes: 60,
      alert_recipients: [],
      is_active: true
    });
  };

  const openEditDialog = (rule: AlertRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      action_type: rule.action_type,
      resource_type: rule.resource_type,
      severity: rule.severity,
      threshold: rule.threshold,
      time_window_minutes: rule.time_window_minutes,
      alert_recipients: rule.alert_recipients,
      is_active: rule.is_active
    });
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Audit Alert Rules
            </CardTitle>
            <CardDescription>
              Configure automatic alerts for suspicious activity and compliance violations
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Alert Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
                </DialogTitle>
                <DialogDescription>
                  Define conditions that trigger automatic security alerts
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="rule_name">Rule Name</Label>
                  <Input
                    id="rule_name"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    placeholder="e.g., Excessive PHI Access"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="action_type">Action Type</Label>
                    <Select 
                      value={formData.action_type}
                      onValueChange={(value) => setFormData({ ...formData, action_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phi_access">PHI Access</SelectItem>
                        <SelectItem value="admin_action">Admin Action</SelectItem>
                        <SelectItem value="data_modification">Data Modification</SelectItem>
                        <SelectItem value="authentication_attempt">Authentication Attempt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="resource_type">Resource Type</Label>
                    <Select
                      value={formData.resource_type}
                      onValueChange={(value) => setFormData({ ...formData, resource_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client_chart">Client Chart</SelectItem>
                        <SelectItem value="clinical_note">Clinical Note</SelectItem>
                        <SelectItem value="user_management">User Management</SelectItem>
                        <SelectItem value="role_assignment">Role Assignment</SelectItem>
                        <SelectItem value="settings">Settings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value) => setFormData({ ...formData, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="threshold">Threshold (Count)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="1"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="time_window">Time Window (Minutes)</Label>
                    <Input
                      id="time_window"
                      type="number"
                      min="1"
                      value={formData.time_window_minutes}
                      onChange={(e) => setFormData({ ...formData, time_window_minutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRule ? 'Update Rule' : 'Create Rule'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Rule Name</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Time Window</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading rules...
                </TableCell>
              </TableRow>
            ) : rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No alert rules configured
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleStatus(rule)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {rule.action_type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {rule.threshold} events
                  </TableCell>
                  <TableCell>
                    {rule.time_window_minutes} min
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      rule.severity === 'critical' ? 'destructive' :
                      rule.severity === 'warning' ? 'default' : 'secondary'
                    }>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
