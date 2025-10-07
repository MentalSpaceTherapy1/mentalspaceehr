import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actionType: 'access' | 'create' | 'update' | 'delete' | 'view';
  entity: string;
  entityId?: string;
  performedBy: string;
  performedById: string;
  details?: string;
  ipAddress?: string;
  changes?: any;
}

export const useClientAuditLog = (clientId: string) => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['client-audit-log', clientId],
    queryFn: async () => {
      const logs: AuditLogEntry[] = [];

      // Fetch portal access logs
      const { data: portalAccess } = await supabase
        .from('portal_access_log')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (portalAccess) {
        // Get user info separately
        const userIds = [...new Set(portalAccess.map(log => log.portal_user_id))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        const userMap = new Map(users?.map(u => [u.id, u]));

        logs.push(...portalAccess.map(log => {
          const user = userMap.get(log.portal_user_id);
          return {
            id: log.id,
            timestamp: log.created_at,
            action: log.action,
            actionType: 'access' as const,
            entity: 'Portal',
            performedBy: user ? `${user.first_name} ${user.last_name}` : 'Client',
            performedById: log.portal_user_id,
            ipAddress: log.ip_address,
            details: log.action
          };
        }));
      }

      // Fetch appointment change logs
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_id', clientId);

      if (appointments) {
        const appointmentIds = appointments.map(a => a.id);
        
        const { data: appointmentLogs } = await supabase
          .from('appointment_change_logs')
          .select('*')
          .in('appointment_id', appointmentIds)
          .order('changed_at', { ascending: false })
          .limit(100);

        if (appointmentLogs) {
          // Get user info separately
          const userIds = [...new Set(appointmentLogs.map(log => log.changed_by).filter(Boolean))];
          const { data: users } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

          const userMap = new Map(users?.map(u => [u.id, u]));

          logs.push(...appointmentLogs.map(log => {
            const user = userMap.get(log.changed_by || '');
            const actionType: 'create' | 'update' | 'delete' | 'view' | 'access' = 
              log.action === 'create' ? 'create' : 'update';
            
            return {
              id: log.id,
              timestamp: log.changed_at,
              action: log.action,
              actionType,
              entity: 'Appointment',
              entityId: log.appointment_id,
              performedBy: user ? `${user.first_name} ${user.last_name}` : 'System',
              performedById: log.changed_by || 'system',
              details: log.reason || log.action,
              changes: {
                old: log.old_values,
                new: log.new_values
              }
            };
          }));
        }
      }

      // Fetch document activity
      const { data: documents } = await supabase
        .from('client_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('uploaded_date', { ascending: false })
        .limit(50);

      if (documents) {
        // Get user info separately
        const uploaderIds = [...new Set(documents.map(doc => doc.uploaded_by).filter(Boolean))];
        const signerIds = [...new Set(documents.map(doc => doc.signed_by).filter(Boolean))];
        const allUserIds = [...new Set([...uploaderIds, ...signerIds])];
        
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', allUserIds);

        const userMap = new Map(users?.map(u => [u.id, u]));

        // Upload events
        logs.push(...documents.map(doc => {
          const uploader = userMap.get(doc.uploaded_by || '');
          return {
            id: `doc-upload-${doc.id}`,
            timestamp: doc.uploaded_date,
            action: 'Document Uploaded',
            actionType: 'create' as const,
            entity: 'Document',
            entityId: doc.id,
            performedBy: uploader ? `${uploader.first_name} ${uploader.last_name}` : 'Unknown',
            performedById: doc.uploaded_by || 'unknown',
            details: doc.title
          };
        }));

        // Signature events
        documents.forEach(doc => {
          if (doc.signed_at && doc.signed_by) {
            const signer = userMap.get(doc.signed_by);
            logs.push({
              id: `doc-sign-${doc.id}`,
              timestamp: doc.signed_at,
              action: 'Document Signed',
              actionType: 'update' as const,
              entity: 'Document',
              entityId: doc.id,
              performedBy: signer ? `${signer.first_name} ${signer.last_name}` : 'Unknown',
              performedById: doc.signed_by,
              details: doc.title
            });
          }
        });

        // View events from viewed_by array
        documents.forEach(doc => {
          if (doc.viewed_by && Array.isArray(doc.viewed_by)) {
            doc.viewed_by.forEach((view: any) => {
              logs.push({
                id: `doc-view-${doc.id}-${view.viewedDate}`,
                timestamp: view.viewedDate,
                action: 'Document Viewed',
                actionType: 'view' as const,
                entity: 'Document',
                entityId: doc.id,
                performedBy: 'Staff Member',
                performedById: view.userId,
                details: doc.title
              });
            });
          }
        });
      }

      // Fetch insurance changes
      const { data: insurance } = await supabase
        .from('client_insurance')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (insurance) {
        // Get user info separately
        const creatorIds = [...new Set(insurance.map(ins => ins.created_by).filter(Boolean))];
        const updaterIds = [...new Set(insurance.map(ins => ins.updated_by).filter(Boolean))];
        const allUserIds = [...new Set([...creatorIds, ...updaterIds])];
        
        const { data: users } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', allUserIds);

        const userMap = new Map(users?.map(u => [u.id, u]));

        logs.push(...insurance.map(ins => {
          const creator = userMap.get(ins.created_by || '');
          return {
            id: `insurance-create-${ins.id}`,
            timestamp: ins.created_at,
            action: 'Insurance Added',
            actionType: 'create' as const,
            entity: 'Insurance',
            entityId: ins.id,
            performedBy: creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown',
            performedById: ins.created_by || 'unknown',
            details: `${ins.rank} - ${ins.insurance_company}`
          };
        }));

        insurance.forEach(ins => {
          if (ins.updated_at !== ins.created_at && ins.updated_by) {
            const updater = userMap.get(ins.updated_by);
            logs.push({
              id: `insurance-update-${ins.id}`,
              timestamp: ins.updated_at,
              action: 'Insurance Updated',
              actionType: 'update' as const,
              entity: 'Insurance',
              entityId: ins.id,
              performedBy: updater ? `${updater.first_name} ${updater.last_name}` : 'Unknown',
              performedById: ins.updated_by,
              details: `${ins.rank} - ${ins.insurance_company}`
            });
          }
        });
      }

      // Sort all logs by timestamp descending
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
    enabled: !!clientId,
  });

  return {
    auditLogs: auditLogs || [],
    isLoading,
  };
};
