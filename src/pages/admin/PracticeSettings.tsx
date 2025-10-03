import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, Building2, MapPin, Clock, Shield, Stethoscope, Palette, Upload, X, Plus, LayoutDashboard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface OfficeHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export default function PracticeSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [useDifferentBillingAddress, setUseDifferentBillingAddress] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newSessionType, setNewSessionType] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dashboardSettings, setDashboardSettings] = useState<any>({
    administrator: { widgets: {} },
    therapist: { widgets: {} },
    associate_trainee: { widgets: {} },
    supervisor: { widgets: {} },
    billing_staff: { widgets: {} },
    front_desk: { widgets: {} }
  });
  
  const [formData, setFormData] = useState({
    practice_name: '',
    dba: '',
    tax_id: '',
    npi_number: '',
    main_phone_number: '',
    fax_number: '',
    email_address: '',
    website: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip_code: '',
    county: '',
    billing_street1: '',
    billing_street2: '',
    billing_city: '',
    billing_state: '',
    billing_zip_code: '',
    note_due_days: 3,
    note_lockout_day: 'Sunday',
    note_lockout_time: '23:59:59',
    require_supervisor_cosign: true,
    allow_note_correction_after_lockout: false,
    documentation_grace_period: null as number | null,
    default_appointment_duration: 50,
    default_session_types: ['Individual Therapy', 'Family Therapy', 'Group Therapy'],
    requires_insurance_auth: false,
    logo: '',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
  });

  const [officeHours, setOfficeHours] = useState<OfficeHours>({
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: true },
    sunday: { open: '09:00', close: '17:00', closed: true },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('practice_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettingsId(data.id);
        setFormData({
          practice_name: data.practice_name || '',
          dba: data.dba || '',
          tax_id: data.tax_id || '',
          npi_number: data.npi_number || '',
          main_phone_number: data.main_phone_number || '',
          fax_number: data.fax_number || '',
          email_address: data.email_address || '',
          website: data.website || '',
          street1: data.street1 || '',
          street2: data.street2 || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          county: data.county || '',
          billing_street1: data.billing_street1 || '',
          billing_street2: data.billing_street2 || '',
          billing_city: data.billing_city || '',
          billing_state: data.billing_state || '',
          billing_zip_code: data.billing_zip_code || '',
          note_due_days: data.note_due_days || 3,
          note_lockout_day: data.note_lockout_day || 'Sunday',
          note_lockout_time: data.note_lockout_time || '23:59:59',
          require_supervisor_cosign: data.require_supervisor_cosign ?? true,
          allow_note_correction_after_lockout: data.allow_note_correction_after_lockout ?? false,
          documentation_grace_period: data.documentation_grace_period,
          default_appointment_duration: data.default_appointment_duration || 50,
          default_session_types: data.default_session_types || ['Individual Therapy', 'Family Therapy', 'Group Therapy'],
          requires_insurance_auth: data.requires_insurance_auth ?? false,
          logo: data.logo || '',
          primary_color: data.primary_color || '#3B82F6',
          secondary_color: data.secondary_color || '#10B981',
        });

        if (data.office_hours) {
          setOfficeHours(data.office_hours as OfficeHours);
        }
        
        // Check if billing address is different
        if (data.billing_street1 || data.billing_city || data.billing_state || data.billing_zip_code) {
          setUseDifferentBillingAddress(true);
        }
        
        // Set logo preview if exists
        if (data.logo) {
          setLogoPreview(data.logo);
        }
        
        // Load dashboard settings
        if (data.dashboard_settings) {
          setDashboardSettings(data.dashboard_settings);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        office_hours: officeHours,
        dashboard_settings: dashboardSettings,
      };

      if (settingsId) {
        const { error } = await supabase
          .from('practice_settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('practice_settings')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      toast({
        title: 'Success',
        description: 'Practice settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOfficeHours = (day: string, field: string, value: string | boolean) => {
    setOfficeHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setFormData(prev => ({ ...prev, logo: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addSessionType = () => {
    if (newSessionType.trim() && !formData.default_session_types.includes(newSessionType.trim())) {
      setFormData(prev => ({
        ...prev,
        default_session_types: [...prev.default_session_types, newSessionType.trim()]
      }));
      setNewSessionType('');
    }
  };

  const removeSessionType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      default_session_types: prev.default_session_types.filter(type => type !== typeToRemove)
    }));
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Practice Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure your practice information and preferences
              </p>
            </div>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">
              <Building2 className="h-4 w-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MapPin className="h-4 w-4 mr-2" />
              Contact & Address
            </TabsTrigger>
            <TabsTrigger value="hours">
              <Clock className="h-4 w-4 mr-2" />
              Business Hours
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <Shield className="h-4 w-4 mr-2" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="clinical">
              <Stethoscope className="h-4 w-4 mr-2" />
              Clinical
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="dashboards">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="practice_name">Practice Name *</Label>
                  <Input
                    id="practice_name"
                    value={formData.practice_name}
                    onChange={(e) => setFormData({ ...formData, practice_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dba">DBA (Doing Business As)</Label>
                  <Input
                    id="dba"
                    value={formData.dba}
                    onChange={(e) => setFormData({ ...formData, dba: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_id">Tax ID / EIN *</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="npi_number">NPI Number *</Label>
                  <Input
                    id="npi_number"
                    value={formData.npi_number}
                    onChange={(e) => setFormData({ ...formData, npi_number: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="main_phone_number">Main Phone *</Label>
                    <Input
                      id="main_phone_number"
                      type="tel"
                      value={formData.main_phone_number}
                      onChange={(e) => setFormData({ ...formData, main_phone_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fax_number">Fax Number</Label>
                    <Input
                      id="fax_number"
                      type="tel"
                      value={formData.fax_number}
                      onChange={(e) => setFormData({ ...formData, fax_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="email_address">Email Address *</Label>
                    <Input
                      id="email_address"
                      type="email"
                      value={formData.email_address}
                      onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Physical Address</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="street1">Street Address *</Label>
                    <Input
                      id="street1"
                      value={formData.street1}
                      onChange={(e) => setFormData({ ...formData, street1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="street2">Street Address Line 2</Label>
                    <Input
                      id="street2"
                      value={formData.street2}
                      onChange={(e) => setFormData({ ...formData, street2: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip_code">ZIP Code *</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="county">County</Label>
                    <Input
                      id="county"
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-different-billing"
                      checked={useDifferentBillingAddress}
                      onCheckedChange={(checked) => setUseDifferentBillingAddress(checked as boolean)}
                    />
                    <Label htmlFor="use-different-billing" className="cursor-pointer">
                      Billing address is different from physical address
                    </Label>
                  </div>

                  {useDifferentBillingAddress && (
                    <div className="space-y-4 pl-6">
                      <div>
                        <Label htmlFor="billing_street1">Street Address</Label>
                        <Input
                          id="billing_street1"
                          value={formData.billing_street1}
                          onChange={(e) => setFormData({ ...formData, billing_street1: e.target.value })}
                          placeholder="456 Billing Street"
                        />
                      </div>

                      <div>
                        <Label htmlFor="billing_street2">Street Address Line 2</Label>
                        <Input
                          id="billing_street2"
                          value={formData.billing_street2}
                          onChange={(e) => setFormData({ ...formData, billing_street2: e.target.value })}
                          placeholder="Suite 200"
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="billing_city">City</Label>
                          <Input
                            id="billing_city"
                            value={formData.billing_city}
                            onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                            placeholder="Springfield"
                          />
                        </div>
                        <div>
                          <Label htmlFor="billing_state">State</Label>
                          <Input
                            id="billing_state"
                            value={formData.billing_state}
                            onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                            placeholder="IL"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="billing_zip_code">ZIP Code</Label>
                          <Input
                            id="billing_zip_code"
                            value={formData.billing_zip_code}
                            onChange={(e) => setFormData({ ...formData, billing_zip_code: e.target.value })}
                            placeholder="62701"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Office Hours</h3>
              <div className="space-y-3">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-32">
                      <span className="font-medium capitalize">{day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!officeHours[day].closed}
                        onCheckedChange={(checked) => updateOfficeHours(day, 'closed', !checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {officeHours[day].closed ? 'Closed' : 'Open'}
                      </span>
                    </div>
                    {!officeHours[day].closed && (
                      <>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={officeHours[day].open}
                            onChange={(e) => updateOfficeHours(day, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={officeHours[day].close}
                            onChange={(e) => updateOfficeHours(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="compliance">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Documentation Requirements</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="note_due_days">Note Due Days</Label>
                    <Input
                      id="note_due_days"
                      type="number"
                      value={formData.note_due_days}
                      onChange={(e) => setFormData({ ...formData, note_due_days: parseInt(e.target.value) })}
                      className="w-32"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Number of days after session to complete note
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="note_lockout_day">Note Lockout Day</Label>
                    <Select
                      value={formData.note_lockout_day}
                      onValueChange={(value) => setFormData({ ...formData, note_lockout_day: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map(day => (
                          <SelectItem key={day} value={day.charAt(0).toUpperCase() + day.slice(1)}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="note_lockout_time">Note Lockout Time</Label>
                    <Input
                      id="note_lockout_time"
                      type="time"
                      value={formData.note_lockout_time}
                      onChange={(e) => setFormData({ ...formData, note_lockout_time: e.target.value })}
                      className="w-48"
                    />
                  </div>

                  <div>
                    <Label htmlFor="documentation_grace_period">Grace Period (hours)</Label>
                    <Input
                      id="documentation_grace_period"
                      type="number"
                      value={formData.documentation_grace_period || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        documentation_grace_period: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      className="w-32"
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Supervision Requirements</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Supervisor Co-Signature</Label>
                      <p className="text-sm text-muted-foreground">
                        Associates/trainees must have notes co-signed
                      </p>
                    </div>
                    <Switch
                      checked={formData.require_supervisor_cosign}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, require_supervisor_cosign: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Note Correction After Lockout</Label>
                      <p className="text-sm text-muted-foreground">
                        Permit corrections with explanation required
                      </p>
                    </div>
                    <Switch
                      checked={formData.allow_note_correction_after_lockout}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, allow_note_correction_after_lockout: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="clinical">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Default Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="default_appointment_duration">Default Appointment Duration (minutes)</Label>
                    <Input
                      id="default_appointment_duration"
                      type="number"
                      value={formData.default_appointment_duration}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        default_appointment_duration: parseInt(e.target.value) 
                      })}
                      className="w-32"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requires Insurance Authorization</Label>
                      <p className="text-sm text-muted-foreground">
                        Default setting for new appointments
                      </p>
                    </div>
                    <Switch
                      checked={formData.requires_insurance_auth}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, requires_insurance_auth: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Session Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage available session types for scheduling
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {formData.default_session_types.map((type) => (
                    <Badge key={type} variant="secondary" className="gap-1 py-1 px-3">
                      {type}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive ml-1"
                        onClick={() => removeSessionType(type)}
                      />
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add new session type..."
                    value={newSessionType}
                    onChange={(e) => setNewSessionType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSessionType();
                      }
                    }}
                  />
                  <Button onClick={addSessionType} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Practice Logo</h3>
                <div className="space-y-4">
                  {logoPreview && (
                    <div className="relative w-48 h-48 border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-contain p-2"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={removeLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or SVG (max. 2MB)
                    </p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Brand Colors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary_color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondary_color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        className="w-20"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                        placeholder="#10B981"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-4">Locations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Manage multiple office locations for your practice
                </p>
                <Button variant="outline" onClick={() => navigate('/admin/locations')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Manage Locations
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Dashboard Settings Tab */}
          <TabsContent value="dashboards" className="space-y-6">
            <Card className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Dashboard Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Control which widgets and sections appear on each role's dashboard
                </p>
              </div>

              <Tabs defaultValue="administrator" className="space-y-4">
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="administrator">Administrator</TabsTrigger>
                  <TabsTrigger value="therapist">Therapist</TabsTrigger>
                  <TabsTrigger value="associate_trainee">Associate</TabsTrigger>
                  <TabsTrigger value="supervisor">Supervisor</TabsTrigger>
                  <TabsTrigger value="billing_staff">Billing</TabsTrigger>
                  <TabsTrigger value="front_desk">Front Desk</TabsTrigger>
                </TabsList>

                {/* Administrator Dashboard Settings */}
                <TabsContent value="administrator" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-system-health" className="cursor-pointer">System Health Status</Label>
                      <Switch
                        id="admin-system-health"
                        checked={dashboardSettings.administrator?.widgets?.system_health !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, system_health: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-active-users" className="cursor-pointer">Active Users</Label>
                      <Switch
                        id="admin-active-users"
                        checked={dashboardSettings.administrator?.widgets?.active_users !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, active_users: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-pending-approvals" className="cursor-pointer">Pending Approvals</Label>
                      <Switch
                        id="admin-pending-approvals"
                        checked={dashboardSettings.administrator?.widgets?.pending_approvals !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, pending_approvals: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-compliance-alerts" className="cursor-pointer">Compliance Alerts</Label>
                      <Switch
                        id="admin-compliance-alerts"
                        checked={dashboardSettings.administrator?.widgets?.compliance_alerts !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, compliance_alerts: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-financial-summary" className="cursor-pointer">Financial Summary</Label>
                      <Switch
                        id="admin-financial-summary"
                        checked={dashboardSettings.administrator?.widgets?.financial_summary !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, financial_summary: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-recent-activity" className="cursor-pointer">Recent Activity</Label>
                      <Switch
                        id="admin-recent-activity"
                        checked={dashboardSettings.administrator?.widgets?.recent_activity !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, recent_activity: checked }
                            }
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <Label htmlFor="admin-quick-actions" className="cursor-pointer">Quick Actions</Label>
                      <Switch
                        id="admin-quick-actions"
                        checked={dashboardSettings.administrator?.widgets?.quick_actions !== false}
                        onCheckedChange={(checked) => 
                          setDashboardSettings({
                            ...dashboardSettings,
                            administrator: {
                              ...dashboardSettings.administrator,
                              widgets: { ...dashboardSettings.administrator?.widgets, quick_actions: checked }
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Therapist Dashboard Settings */}
                <TabsContent value="therapist" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['todays_sessions', 'pending_notes', 'active_clients', 'compliance', 'schedule', 'tasks', 'productivity', 'recent_activity', 'quick_actions'].map((widget) => (
                      <div key={widget} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={`therapist-${widget}`} className="cursor-pointer capitalize">
                          {widget.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={`therapist-${widget}`}
                          checked={dashboardSettings.therapist?.widgets?.[widget] !== false}
                          onCheckedChange={(checked) => 
                            setDashboardSettings({
                              ...dashboardSettings,
                              therapist: {
                                ...dashboardSettings.therapist,
                                widgets: { ...dashboardSettings.therapist?.widgets, [widget]: checked }
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Associate Trainee Dashboard Settings */}
                <TabsContent value="associate_trainee" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['todays_sessions', 'pending_notes', 'active_clients', 'compliance', 'schedule', 'tasks', 'productivity', 'recent_activity', 'quick_actions'].map((widget) => (
                      <div key={widget} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={`associate-${widget}`} className="cursor-pointer capitalize">
                          {widget.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={`associate-${widget}`}
                          checked={dashboardSettings.associate_trainee?.widgets?.[widget] !== false}
                          onCheckedChange={(checked) => 
                            setDashboardSettings({
                              ...dashboardSettings,
                              associate_trainee: {
                                ...dashboardSettings.associate_trainee,
                                widgets: { ...dashboardSettings.associate_trainee?.widgets, [widget]: checked }
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Supervisor Dashboard Settings */}
                <TabsContent value="supervisor" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['supervisees', 'pending_cosigns', 'supervision_hours', 'compliance_issues', 'supervisee_list', 'pending_notes', 'supervision_summary', 'compliance_status', 'upcoming_meetings', 'quick_actions'].map((widget) => (
                      <div key={widget} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={`supervisor-${widget}`} className="cursor-pointer capitalize">
                          {widget.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={`supervisor-${widget}`}
                          checked={dashboardSettings.supervisor?.widgets?.[widget] !== false}
                          onCheckedChange={(checked) => 
                            setDashboardSettings({
                              ...dashboardSettings,
                              supervisor: {
                                ...dashboardSettings.supervisor,
                                widgets: { ...dashboardSettings.supervisor?.widgets, [widget]: checked }
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Billing Staff Dashboard Settings */}
                <TabsContent value="billing_staff" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['revenue_today', 'pending_claims', 'outstanding_balance', 'collection_rate', 'claims_status', 'revenue_summary', 'insurance_verification', 'client_balances', 'quick_actions'].map((widget) => (
                      <div key={widget} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={`billing-${widget}`} className="cursor-pointer capitalize">
                          {widget.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={`billing-${widget}`}
                          checked={dashboardSettings.billing_staff?.widgets?.[widget] !== false}
                          onCheckedChange={(checked) => 
                            setDashboardSettings({
                              ...dashboardSettings,
                              billing_staff: {
                                ...dashboardSettings.billing_staff,
                                widgets: { ...dashboardSettings.billing_staff?.widgets, [widget]: checked }
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Front Desk Dashboard Settings */}
                <TabsContent value="front_desk" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {['todays_appointments', 'checkins', 'waiting', 'messages', 'schedule', 'pending_tasks', 'checkin_queue', 'quick_actions'].map((widget) => (
                      <div key={widget} className="flex items-center justify-between p-3 border rounded-lg">
                        <Label htmlFor={`frontdesk-${widget}`} className="cursor-pointer capitalize">
                          {widget.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={`frontdesk-${widget}`}
                          checked={dashboardSettings.front_desk?.widgets?.[widget] !== false}
                          onCheckedChange={(checked) => 
                            setDashboardSettings({
                              ...dashboardSettings,
                              front_desk: {
                                ...dashboardSettings.front_desk,
                                widgets: { ...dashboardSettings.front_desk?.widgets, [widget]: checked }
                              }
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
