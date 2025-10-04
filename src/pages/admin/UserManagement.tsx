import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { RoleAssignmentDialog } from '@/components/admin/RoleAssignmentDialog';
import { getAllUsersWithRoles } from '@/lib/api/userRoles';
import { toggleUserActive } from '@/lib/api/users';
import { AppRole } from '@/hooks/useUserRoles';
import { Search, UserCog, UserPlus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface UserWithRoles {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  last_login_date: string | null;
  roles: AppRole[];
}

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivateUser, setDeactivateUser] = useState<UserWithRoles | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsersWithRoles();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleRolesUpdated = () => {
    fetchUsers();
  };

  const handleToggleActive = async (user: UserWithRoles) => {
    if (user.is_active) {
      // Show confirmation dialog for deactivation
      setDeactivateUser(user);
    } else {
      // Activate immediately
      try {
        await toggleUserActive(user.id, true);
        toast({
          title: 'Success',
          description: `${user.first_name} ${user.last_name} has been activated`,
        });
        fetchUsers();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to activate user',
          variant: 'destructive',
        });
      }
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateUser) return;

    try {
      await toggleUserActive(deactivateUser.id, false);
      toast({
        title: 'Success',
        description: `${deactivateUser.first_name} ${deactivateUser.last_name} has been deactivated`,
      });
      fetchUsers();
      setDeactivateUser(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to deactivate user',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage user roles and permissions
            </p>
          </div>
          <Button onClick={() => navigate('/admin/users/create')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map(role => (
                          <RoleBadge key={role} role={role} showTooltip={false} />
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? 'default' : 'outline'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => handleToggleActive(user)}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_login_date 
                      ? formatDistanceToNow(new Date(user.last_login_date), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManageRoles(user)}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Manage Roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedUser && (
          <RoleAssignmentDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            userId={selectedUser.id}
            userName={`${selectedUser.first_name} ${selectedUser.last_name}`}
            currentRoles={selectedUser.roles}
            onRolesUpdated={handleRolesUpdated}
          />
        )}

        <AlertDialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deactivate {deactivateUser?.first_name} {deactivateUser?.last_name}? 
                They will not be able to access the system until reactivated.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeactivate}>
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
