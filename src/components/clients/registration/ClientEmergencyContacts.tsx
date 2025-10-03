import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';

interface ClientEmergencyContactsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientEmergencyContacts({ formData, setFormData }: ClientEmergencyContactsProps) {
  const addContact = () => {
    setFormData({
      ...formData,
      emergencyContacts: [
        ...formData.emergencyContacts,
        {
          name: '',
          relationship: '',
          phone: '',
          alternate_phone: '',
          email: '',
          address: '',
          is_primary: formData.emergencyContacts.length === 0,
          okay_to_discuss_health_info: false,
          okay_to_leave_message: false,
        }
      ]
    });
  };

  const removeContact = (index: number) => {
    const contacts = formData.emergencyContacts.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, emergencyContacts: contacts });
  };

  const updateContact = (index: number, field: string, value: any) => {
    const contacts = [...formData.emergencyContacts];
    contacts[index] = { ...contacts[index], [field]: value };
    setFormData({ ...formData, emergencyContacts: contacts });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Emergency Contacts</h3>
        <Button onClick={addContact} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {formData.emergencyContacts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No emergency contacts added yet. Click "Add Contact" to add one.
        </Card>
      ) : (
        <div className="space-y-4">
          {formData.emergencyContacts.map((contact: any, index: number) => (
            <Card key={index} className="p-6 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={() => removeContact(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>

              <div className="space-y-4 pr-12">
                <h4 className="font-medium">Contact {index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Relationship *</Label>
                    <Input
                      value={contact.relationship}
                      onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Alternate Phone</Label>
                    <Input
                      type="tel"
                      value={contact.alternate_phone}
                      onChange={(e) => updateContact(index, 'alternate_phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      value={contact.address}
                      onChange={(e) => updateContact(index, 'address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`primary-${index}`}
                      checked={contact.is_primary}
                      onCheckedChange={(checked) => updateContact(index, 'is_primary', checked)}
                    />
                    <Label htmlFor={`primary-${index}`} className="cursor-pointer">
                      Primary Contact
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`discuss-${index}`}
                      checked={contact.okay_to_discuss_health_info}
                      onCheckedChange={(checked) => updateContact(index, 'okay_to_discuss_health_info', checked)}
                    />
                    <Label htmlFor={`discuss-${index}`} className="cursor-pointer">
                      Okay to discuss health info
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`message-${index}`}
                      checked={contact.okay_to_leave_message}
                      onCheckedChange={(checked) => updateContact(index, 'okay_to_leave_message', checked)}
                    />
                    <Label htmlFor={`message-${index}`} className="cursor-pointer">
                      Okay to leave message
                    </Label>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
