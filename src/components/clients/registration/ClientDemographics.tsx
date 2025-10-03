import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface ClientDemographicsProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientDemographics({ formData, setFormData }: ClientDemographicsProps) {
  const raceOptions = [
    'White',
    'Black/African American',
    'Asian',
    'Native Hawaiian/Pacific Islander',
    'American Indian/Alaska Native',
    'Other'
  ];

  const toggleRace = (race: string) => {
    const current = formData.race || [];
    if (current.includes(race)) {
      setFormData({ ...formData, race: current.filter((r: string) => r !== race) });
    } else {
      setFormData({ ...formData, race: [...current, race] });
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Gender & Identity</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Non-binary">Non-binary</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="genderIdentity">Gender Identity</Label>
          <Input
            id="genderIdentity"
            value={formData.genderIdentity}
            onChange={(e) => setFormData({ ...formData, genderIdentity: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Sex Assigned at Birth</Label>
          <Select
            value={formData.sexAssignedAtBirth}
            onValueChange={(value) => setFormData({ ...formData, sexAssignedAtBirth: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Intersex">Intersex</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sexual Orientation</Label>
          <Select
            value={formData.sexualOrientation}
            onValueChange={(value) => setFormData({ ...formData, sexualOrientation: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Heterosexual">Heterosexual</SelectItem>
              <SelectItem value="Homosexual">Homosexual</SelectItem>
              <SelectItem value="Bisexual">Bisexual</SelectItem>
              <SelectItem value="Pansexual">Pansexual</SelectItem>
              <SelectItem value="Asexual">Asexual</SelectItem>
              <SelectItem value="Questioning">Questioning</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Marital Status</Label>
          <Select
            value={formData.maritalStatus}
            onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Single">Single</SelectItem>
              <SelectItem value="Married">Married</SelectItem>
              <SelectItem value="Divorced">Divorced</SelectItem>
              <SelectItem value="Widowed">Widowed</SelectItem>
              <SelectItem value="Separated">Separated</SelectItem>
              <SelectItem value="Domestic Partnership">Domestic Partnership</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Race & Ethnicity</h3>
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">Race (Select all that apply)</Label>
          <div className="space-y-2">
            {raceOptions.map((race) => (
              <div key={race} className="flex items-center space-x-2">
                <Checkbox
                  id={`race-${race}`}
                  checked={(formData.race || []).includes(race)}
                  onCheckedChange={() => toggleRace(race)}
                />
                <Label htmlFor={`race-${race}`} className="cursor-pointer font-normal">
                  {race}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ethnicity</Label>
          <Select
            value={formData.ethnicity}
            onValueChange={(value) => setFormData({ ...formData, ethnicity: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ethnicity" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Hispanic or Latino">Hispanic or Latino</SelectItem>
              <SelectItem value="Not Hispanic or Latino">Not Hispanic or Latino</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Language & Culture</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="primaryLanguage">Primary Language</Label>
          <Input
            id="primaryLanguage"
            value={formData.primaryLanguage}
            onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="religion">Religion</Label>
          <Input
            id="religion"
            value={formData.religion}
            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
          />
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <Checkbox
            id="needsInterpreter"
            checked={formData.needsInterpreter}
            onCheckedChange={(checked) => setFormData({ ...formData, needsInterpreter: checked })}
          />
          <Label htmlFor="needsInterpreter" className="cursor-pointer">
            Needs Interpreter
          </Label>
        </div>

        {formData.needsInterpreter && (
          <div className="space-y-2">
            <Label htmlFor="interpreterLanguage">Interpreter Language</Label>
            <Input
              id="interpreterLanguage"
              value={formData.interpreterLanguage}
              onChange={(e) => setFormData({ ...formData, interpreterLanguage: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
