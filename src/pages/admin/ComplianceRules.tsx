import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Plus, Trash2, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ComplianceRules() {
  const { toast } = useToast();
  const [rules, setRules] = useState<any[]>([]);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'Documentation Timeliness',
    is_active: true,
    days_allowed_for_documentation: 3,
    lockout_day: 'Sunday',
    lockout_time: '23:59:59',
    grace_period_hours: 0,
    send_warning_notifications: true,
    warning_days_before_due: '2,1,0',
    automatic_locking: true,
    require_approval_to_unlock: true,
    allow_exceptions: false,
    exception_roles: ''
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Error loading rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const ruleData = {
        ...formData,
        rule_id: editingRule?.rule_id || `rule_${Date.now()}`,
        warning_days_before_due: formData.warning_days_before_due
          .split(',')
          .map(d => parseInt(d.trim()))
          .filter(d => !isNaN(d)),
        exception_roles: formData.exception_roles
          ? formData.exception_roles.split(',').map(r => r.trim())
          : []
      };

      if (editingRule) {
        const { error } = await supabase
          .from('compliance_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Compliance rule updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('compliance_rules')
          .insert(ruleData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Compliance rule created successfully'
        });
      }

      setEditingRule(null);
      resetForm();
      loadRules();
    } catch (error: any) {
      console.error('Error saving rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save compliance rule',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      is_active: rule.is_active,
      days_allowed_for_documentation: rule.days_allowed_for_documentation,
      lockout_day: rule.lockout_day,
      lockout_time: rule.lockout_time,
      grace_period_hours: rule.grace_period_hours || 0,
      send_warning_notifications: rule.send_warning_notifications,
      warning_days_before_due: rule.warning_days_before_due?.join(',') || '',
      automatic_locking: rule.automatic_locking,
      require_approval_to_unlock: rule.require_approval_to_unlock,
      allow_exceptions: rule.allow_exceptions || false,
      exception_roles: rule.exception_roles?.join(',') || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('compliance_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Compliance rule deleted successfully'
      });

      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete compliance rule',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      rule_type: 'Documentation Timeliness',
      is_active: true,
      days_allowed_for_documentation: 3,
      lockout_day: 'Sunday',
      lockout_time: '23:59:59',
      grace_period_hours: 0,
      send_warning_notifications: true,
      warning_days_before_due: '2,1,0',
      automatic_locking: true,
      require_approval_to_unlock: true,
      allow_exceptions: false,
      exception_roles: ''
    });
    setEditingRule(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Compliance Rules</h1>
            <p className="text-muted-foreground">Manage documentation compliance rules</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingRule ? 'Edit Rule' : 'Create New Rule'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, rule_name: e.target.value }))}
                  placeholder="e.g., Standard Documentation Timeline"
                />
              </div>

              <div>
                <Label>Rule Type *</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, rule_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Documentation Timeliness">Documentation Timeliness</SelectItem>
                    <SelectItem value="Signature Required">Signature Required</SelectItem>
                    <SelectItem value="Supervisor Review">Supervisor Review</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Days Allowed *</Label>
                <Input
                  type="number"
                  value={formData.days_allowed_for_documentation}
                  onChange={(e) => setFormData(prev => ({ ...prev, days_allowed_for_documentation: parseInt(e.target.value) }))}
                  min="1"
                />
              </div>

              <div>
                <Label>Lockout Day *</Label>
                <Select
                  value={formData.lockout_day}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, lockout_day: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lockout Time *</Label>
                <Input
                  type="time"
                  value={formData.lockout_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, lockout_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Warning Days Before Due (comma-separated)</Label>
              <Input
                value={formData.warning_days_before_due}
                onChange={(e) => setFormData(prev => ({ ...prev, warning_days_before_due: e.target.value }))}
                placeholder="e.g., 2,1,0"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Send Warning Notifications</Label>
                <Switch
                  checked={formData.send_warning_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_warning_notifications: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Automatic Locking</Label>
                <Switch
                  checked={formData.automatic_locking}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, automatic_locking: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Require Approval to Unlock</Label>
                <Switch
                  checked={formData.require_approval_to_unlock}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, require_approval_to_unlock: checked }))}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
              {editingRule && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="text-muted-foreground">No compliance rules found.</p>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{rule.rule_name}</h3>
                            {rule.is_active ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.rule_type}</p>
                          <div className="text-sm space-y-1">
                            <p>Documentation Deadline: {rule.days_allowed_for_documentation} days</p>
                            <p>Lockout: {rule.lockout_day} at {rule.lockout_time}</p>
                            <p>Automatic Locking: {rule.automatic_locking ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(rule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(rule.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}