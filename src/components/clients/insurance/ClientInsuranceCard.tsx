import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Phone, Calendar, DollarSign, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ClientInsuranceCardProps {
  insurance: {
    id: string;
    rank: 'Primary' | 'Secondary' | 'Tertiary';
    insurance_company: string;
    plan_name: string;
    plan_type: string;
    member_id: string;
    group_number?: string;
    effective_date: string;
    termination_date?: string;
    subscriber_is_client: boolean;
    subscriber_first_name?: string;
    subscriber_last_name?: string;
    relationship_to_subscriber?: string;
    customer_service_phone: string;
    requires_referral: boolean;
    requires_prior_auth: boolean;
    mental_health_coverage: boolean;
    copay?: number;
    coinsurance?: number;
    deductible?: number;
    deductible_met?: number;
    out_of_pocket_max?: number;
    out_of_pocket_met?: number;
    last_verification_date?: string;
    remaining_sessions_this_year?: number;
    verification_notes?: string;
    front_card_image?: string;
    back_card_image?: string;
  };
  onEdit: () => void;
  canEdit: boolean;
}

export function ClientInsuranceCard({ insurance, onEdit, canEdit }: ClientInsuranceCardProps) {
  const isActive = !insurance.termination_date || new Date(insurance.termination_date) > new Date();
  const needsVerification = !insurance.last_verification_date || 
    (new Date().getTime() - new Date(insurance.last_verification_date).getTime()) > 90 * 24 * 60 * 60 * 1000; // 90 days

  return (
    <Card className={!isActive ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{insurance.insurance_company}</CardTitle>
              <Badge variant={insurance.rank === 'Primary' ? 'default' : 'secondary'}>
                {insurance.rank}
              </Badge>
              {!isActive && <Badge variant="destructive">Inactive</Badge>}
              {needsVerification && isActive && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Needs Verification
                </Badge>
              )}
            </div>
            <CardDescription>{insurance.plan_name} ({insurance.plan_type})</CardDescription>
          </div>
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Member Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Member ID</p>
            <p className="text-sm text-muted-foreground">{insurance.member_id}</p>
          </div>
          {insurance.group_number && (
            <div>
              <p className="text-sm font-medium">Group Number</p>
              <p className="text-sm text-muted-foreground">{insurance.group_number}</p>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Effective Date</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(insurance.effective_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          {insurance.termination_date && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Termination Date</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(insurance.termination_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Subscriber Information */}
        {!insurance.subscriber_is_client && insurance.subscriber_first_name && (
          <div>
            <p className="text-sm font-medium">Subscriber</p>
            <p className="text-sm text-muted-foreground">
              {insurance.subscriber_first_name} {insurance.subscriber_last_name}
              {insurance.relationship_to_subscriber && ` (${insurance.relationship_to_subscriber})`}
            </p>
          </div>
        )}

        {/* Contact Information */}
        <div className="flex items-start gap-2">
          <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Customer Service</p>
            <p className="text-sm text-muted-foreground">{insurance.customer_service_phone}</p>
          </div>
        </div>

        {/* Coverage Details */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Coverage Details</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {insurance.copay != null && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Copay: ${insurance.copay}</span>
              </div>
            )}
            {insurance.coinsurance != null && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Coinsurance: {insurance.coinsurance}%</span>
              </div>
            )}
            {insurance.deductible != null && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Deductible: ${insurance.deductible}
                  {insurance.deductible_met != null && ` (Met: $${insurance.deductible_met})`}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {insurance.requires_referral && (
              <Badge variant="outline">Requires Referral</Badge>
            )}
            {insurance.requires_prior_auth && (
              <Badge variant="outline">Requires Prior Auth</Badge>
            )}
            {insurance.mental_health_coverage && (
              <Badge variant="outline">MH Coverage</Badge>
            )}
          </div>
        </div>

        {/* Benefit Verification */}
        {insurance.last_verification_date && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Last Verified</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(insurance.last_verification_date), 'MMM d, yyyy')}
                </p>
                {insurance.remaining_sessions_this_year != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Remaining sessions: {insurance.remaining_sessions_this_year}
                  </p>
                )}
                {insurance.verification_notes && (
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    {insurance.verification_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card Images */}
        {(insurance.front_card_image || insurance.back_card_image) && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">Insurance Card</p>
            <div className="grid grid-cols-2 gap-2">
              {insurance.front_card_image && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Front</p>
                  <img 
                    src={insurance.front_card_image} 
                    alt="Insurance card front" 
                    className="rounded border w-full"
                  />
                </div>
              )}
              {insurance.back_card_image && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Back</p>
                  <img 
                    src={insurance.back_card_image} 
                    alt="Insurance card back" 
                    className="rounded border w-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
