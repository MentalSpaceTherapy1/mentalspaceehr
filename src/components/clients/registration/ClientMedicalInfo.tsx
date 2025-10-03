import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface ClientMedicalInfoProps {
  formData: any;
  setFormData: (data: any) => void;
}

export function ClientMedicalInfo({ formData, setFormData }: ClientMedicalInfoProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Social Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Education Level</Label>
          <Select
            value={formData.education}
            onValueChange={(value) => setFormData({ ...formData, education: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select education level" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Less than High School">Less than High School</SelectItem>
              <SelectItem value="High School/GED">High School/GED</SelectItem>
              <SelectItem value="Some College">Some College</SelectItem>
              <SelectItem value="Associate Degree">Associate Degree</SelectItem>
              <SelectItem value="Bachelor Degree">Bachelor Degree</SelectItem>
              <SelectItem value="Graduate Degree">Graduate Degree</SelectItem>
              <SelectItem value="Doctoral Degree">Doctoral Degree</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Employment Status</Label>
          <Select
            value={formData.employmentStatus}
            onValueChange={(value) => setFormData({ ...formData, employmentStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select employment status" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Employed Full-time">Employed Full-time</SelectItem>
              <SelectItem value="Employed Part-time">Employed Part-time</SelectItem>
              <SelectItem value="Self-employed">Self-employed</SelectItem>
              <SelectItem value="Unemployed">Unemployed</SelectItem>
              <SelectItem value="Student">Student</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
              <SelectItem value="Disabled">Disabled</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input
            id="occupation"
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employer">Employer</Label>
          <Input
            id="employer"
            value={formData.employer}
            onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Living Arrangement</Label>
          <Select
            value={formData.livingArrangement}
            onValueChange={(value) => setFormData({ ...formData, livingArrangement: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Alone">Alone</SelectItem>
              <SelectItem value="With Partner/Spouse">With Partner/Spouse</SelectItem>
              <SelectItem value="With Parents">With Parents</SelectItem>
              <SelectItem value="With Children">With Children</SelectItem>
              <SelectItem value="With Roommates">With Roommates</SelectItem>
              <SelectItem value="Group Home">Group Home</SelectItem>
              <SelectItem value="Assisted Living">Assisted Living</SelectItem>
              <SelectItem value="Homeless">Homeless</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Housing Status</Label>
          <Select
            value={formData.housingStatus}
            onValueChange={(value) => setFormData({ ...formData, housingStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Own">Own</SelectItem>
              <SelectItem value="Rent">Rent</SelectItem>
              <SelectItem value="Temporary">Temporary</SelectItem>
              <SelectItem value="Homeless">Homeless</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-lg font-semibold pt-4">Veteran Status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isVeteran"
            checked={formData.isVeteran}
            onCheckedChange={(checked) => setFormData({ ...formData, isVeteran: checked })}
          />
          <Label htmlFor="isVeteran" className="cursor-pointer">
            Veteran
          </Label>
        </div>

        {formData.isVeteran && (
          <>
            <div className="space-y-2">
              <Label htmlFor="militaryBranch">Military Branch</Label>
              <Input
                id="militaryBranch"
                value={formData.militaryBranch}
                onChange={(e) => setFormData({ ...formData, militaryBranch: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="militaryDischargeType">Discharge Type</Label>
              <Input
                id="militaryDischargeType"
                value={formData.militaryDischargeType}
                onChange={(e) => setFormData({ ...formData, militaryDischargeType: e.target.value })}
              />
            </div>
          </>
        )}
      </div>

      <h3 className="text-lg font-semibold pt-4">Legal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Legal Status</Label>
          <Select
            value={formData.legalStatus}
            onValueChange={(value) => setFormData({ ...formData, legalStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="bg-card border z-50">
              <SelectItem value="Competent">Competent</SelectItem>
              <SelectItem value="Guardian">Guardian</SelectItem>
              <SelectItem value="Conservator">Conservator</SelectItem>
              <SelectItem value="Power of Attorney">Power of Attorney</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.legalStatus && formData.legalStatus !== 'Competent' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="guardianName">Guardian/Representative Name</Label>
              <Input
                id="guardianName"
                value={formData.guardianName}
                onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianPhone">Guardian Phone</Label>
              <Input
                id="guardianPhone"
                type="tel"
                value={formData.guardianPhone}
                onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardianRelationship">Relationship</Label>
              <Input
                id="guardianRelationship"
                value={formData.guardianRelationship}
                onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
