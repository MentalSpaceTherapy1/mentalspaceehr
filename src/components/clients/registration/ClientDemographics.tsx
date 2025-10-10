import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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
              <SelectItem value="Mexican, Mexican American, Chicano/a">Mexican, Mexican American, Chicano/a</SelectItem>
              <SelectItem value="Puerto Rican">Puerto Rican</SelectItem>
              <SelectItem value="Cuban">Cuban</SelectItem>
              <SelectItem value="Central American">Central American</SelectItem>
              <SelectItem value="South American">South American</SelectItem>
              <SelectItem value="Other Hispanic/Latino">Other Hispanic/Latino</SelectItem>
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
          <Select
            value={formData.primaryLanguage}
            onValueChange={(value) => setFormData({ ...formData, primaryLanguage: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="Chinese (Mandarin)">Chinese (Mandarin)</SelectItem>
              <SelectItem value="Chinese (Cantonese)">Chinese (Cantonese)</SelectItem>
              <SelectItem value="Tagalog">Tagalog</SelectItem>
              <SelectItem value="Vietnamese">Vietnamese</SelectItem>
              <SelectItem value="Arabic">Arabic</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="Korean">Korean</SelectItem>
              <SelectItem value="Russian">Russian</SelectItem>
              <SelectItem value="German">German</SelectItem>
              <SelectItem value="Portuguese">Portuguese</SelectItem>
              <SelectItem value="Italian">Italian</SelectItem>
              <SelectItem value="Polish">Polish</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Other Languages Spoken</Label>
          <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
          <div className="grid grid-cols-2 gap-3">
            {['Spanish', 'Chinese (Mandarin)', 'Chinese (Cantonese)', 'Tagalog', 'Vietnamese', 
              'Arabic', 'French', 'Korean', 'Russian', 'German', 'Portuguese', 'Italian', 
              'Polish', 'Other'].map((lang) => (
              <div key={lang} className="flex items-center space-x-2">
                <Checkbox
                  id={`lang-${lang}`}
                  checked={(formData.otherLanguagesSpoken || []).includes(lang)}
                  onCheckedChange={(checked) => {
                    const current = formData.otherLanguagesSpoken || [];
                    const updated = checked
                      ? [...current, lang]
                      : current.filter((l: string) => l !== lang);
                    setFormData({ ...formData, otherLanguagesSpoken: updated });
                  }}
                />
                <Label htmlFor={`lang-${lang}`} className="cursor-pointer font-normal">
                  {lang}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="religion">Religion</Label>
          <Select
            value={formData.religion}
            onValueChange={(value) => setFormData({ ...formData, religion: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Christianity - Catholic">Christianity - Catholic</SelectItem>
              <SelectItem value="Christianity - Protestant">Christianity - Protestant</SelectItem>
              <SelectItem value="Christianity - Orthodox">Christianity - Orthodox</SelectItem>
              <SelectItem value="Christianity - Other">Christianity - Other</SelectItem>
              <SelectItem value="Islam">Islam</SelectItem>
              <SelectItem value="Judaism">Judaism</SelectItem>
              <SelectItem value="Buddhism">Buddhism</SelectItem>
              <SelectItem value="Hinduism">Hinduism</SelectItem>
              <SelectItem value="Sikhism">Sikhism</SelectItem>
              <SelectItem value="Atheist/Agnostic">Atheist/Agnostic</SelectItem>
              <SelectItem value="Spiritual but not religious">Spiritual but not religious</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
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
