import React, { useState } from 'react';
import {
  useAdminListStaff,
  useAdminCreateStaff,
  useAdminUpdateStaff,
  useAdminDeleteStaff,
  getAdminListStaffQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, KeyRound, ShieldCheck, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type StaffRole = 'admin' | 'manager' | 'supervisor';

const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
};

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin: 'Full access, including managing other staff accounts',
  manager: 'Day-to-day store operations — no staff, security, or payment settings access',
  supervisor: 'Read-only across the dashboard, can update order status',
};

const createStaffSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(100),
  password: z.string().min(8, 'At least 8 characters').max(200),
  role: z.enum(['admin', 'manager', 'supervisor']),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
});
type CreateStaffValues = z.infer<typeof createStaffSchema>;

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'At least 8 characters').max(200),
});
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const editEmailSchema = z.object({
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
});
type EditEmailValues = z.infer<typeof editEmailSchema>;

export default function StaffList() {
  const { username: currentUsername } = useAuth();
  const { data: staff, isLoading } = useAdminListStaff();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStaff = useAdminCreateStaff();
  const updateStaff = useAdminUpdateStaff();
  const deleteStaff = useAdminDeleteStaff();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [editEmailId, setEditEmailId] = useState<string | null>(null);

  const createForm = useForm<CreateStaffValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { username: '', password: '', role: 'manager', email: '' },
  });

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '' },
  });

  const editEmailForm = useForm<EditEmailValues>({
    resolver: zodResolver(editEmailSchema),
    defaultValues: { email: '' },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getAdminListStaffQueryKey() });

  const handleCreateNew = () => {
    createForm.reset({ username: '', password: '', role: 'manager', email: '' });
    setIsCreateOpen(true);
  };

  const onCreateSubmit = (data: CreateStaffValues) => {
    createStaff.mutate(
      { data: { ...data, email: data.email || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Staff account created' });
          invalidate();
          setIsCreateOpen(false);
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to create staff account';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const handleRoleChange = (id: string, role: StaffRole) => {
    updateStaff.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          toast({ title: 'Role updated' });
          invalidate();
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to update role';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateStaff.mutate(
      { id, data: { active } },
      {
        onSuccess: () => {
          toast({ title: active ? 'Account enabled' : 'Account disabled' });
          invalidate();
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to update account';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const onResetPasswordSubmit = (data: ResetPasswordValues) => {
    if (!resetPasswordId) return;
    updateStaff.mutate(
      { id: resetPasswordId, data: { password: data.password } },
      {
        onSuccess: () => {
          toast({ title: 'Password reset' });
          setResetPasswordId(null);
          resetForm.reset({ password: '' });
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to reset password';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const onEditEmailSubmit = (data: EditEmailValues) => {
    if (!editEmailId) return;
    updateStaff.mutate(
      { id: editEmailId, data: { email: data.email || '' } },
      {
        onSuccess: () => {
          toast({ title: data.email ? 'Google email saved' : 'Google email removed' });
          invalidate();
          setEditEmailId(null);
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to update Google email';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const handleDelete = (id: string, username: string) => {
    if (!window.confirm(`Remove staff account "${username}"? This can't be undone.`)) return;

    deleteStaff.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: 'Staff account removed' });
          invalidate();
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error || 'Failed to remove account';
          toast({ title: message, variant: 'destructive' });
        },
      },
    );
  };

  const isSaving = createStaff.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Staff & Admins</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage who can access this dashboard, and what they're allowed to do.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Staff Account</DialogTitle>
              <DialogDescription>
                Add a new person with access to this admin dashboard.
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. sara" autoComplete="off" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input {...field} type="password" autoComplete="new-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => (
                            <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>{ROLE_DESCRIPTIONS[field.value as StaffRole]}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Email (optional)</FormLabel>
                      <FormControl><Input {...field} type="email" placeholder="e.g. sara@gmail.com" autoComplete="off" /></FormControl>
                      <FormDescription>
                        Lets this person sign in with "Sign in with Google" using this address, instead of (or in addition to) the password above.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Google Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : staff?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No staff accounts found.
                </TableCell>
              </TableRow>
            ) : (
              staff?.map((s) => {
                const isSelf = s.username === currentUsername;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {s.username}
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => {
                          setEditEmailId(s.id);
                          editEmailForm.reset({ email: s.email ?? '' });
                        }}
                        className="text-sm text-left hover:underline"
                        title="Edit Google email"
                      >
                        {s.email ? (
                          <span className="text-foreground">{s.email}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={s.role}
                        onValueChange={(role) => handleRoleChange(s.id, role as StaffRole)}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="w-36 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as StaffRole[]).map((role) => (
                            <SelectItem key={role} value={role}>{ROLE_LABELS[role]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={s.active}
                          onCheckedChange={(checked) => handleToggleActive(s.id, checked)}
                          disabled={isSelf}
                        />
                        <span className="text-xs text-muted-foreground">
                          {s.active ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog
                          open={editEmailId === s.id}
                          onOpenChange={(open) => {
                            setEditEmailId(open ? s.id : null);
                            editEmailForm.reset({ email: open ? (s.email ?? '') : '' });
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Edit Google email">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Google Sign-In Email</DialogTitle>
                              <DialogDescription>
                                Set the Google account email "{s.username}" can use to sign in with Google. Leave empty to disable Google sign-in for this account.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...editEmailForm}>
                              <form onSubmit={editEmailForm.handleSubmit(onEditEmailSubmit)} className="space-y-4 py-4">
                                <FormField
                                  control={editEmailForm.control}
                                  name="email"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Google Email</FormLabel>
                                      <FormControl><Input {...field} type="email" placeholder="e.g. sara@gmail.com" autoComplete="off" /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter className="pt-4">
                                  <Button type="button" variant="outline" onClick={() => setEditEmailId(null)}>Cancel</Button>
                                  <Button type="submit" disabled={updateStaff.isPending}>
                                    {updateStaff.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <Dialog
                          open={resetPasswordId === s.id}
                          onOpenChange={(open) => {
                            setResetPasswordId(open ? s.id : null);
                            resetForm.reset({ password: '' });
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Reset password">
                              <KeyRound className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reset Password</DialogTitle>
                              <DialogDescription>
                                Set a new password for "{s.username}".
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...resetForm}>
                              <form onSubmit={resetForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4 py-4">
                                <FormField
                                  control={resetForm.control}
                                  name="password"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>New Password</FormLabel>
                                      <FormControl><Input {...field} type="password" autoComplete="new-password" /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter className="pt-4">
                                  <Button type="button" variant="outline" onClick={() => setResetPasswordId(null)}>Cancel</Button>
                                  <Button type="submit" disabled={updateStaff.isPending}>
                                    {updateStaff.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Reset
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id, s.username)}
                          disabled={isSelf}
                          className="hover:bg-destructive/10 hover:text-destructive"
                          title={isSelf ? "You can't delete your own account" : 'Remove'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong className="text-foreground">Admin</strong> can manage staff accounts and every
          setting. <strong className="text-foreground">Manager</strong> handles day-to-day
          operations. <strong className="text-foreground">Supervisor</strong> has read-only
          access, aside from updating order status. There must always be at least one active admin.
          Set a <strong className="text-foreground">Google Email</strong> on an account to let that
          person sign in with "Sign in with Google" instead of a password.
        </p>
      </div>
    </div>
  );
}
