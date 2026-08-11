import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/currency';
import { resolveMediaUrl } from '@workspace/api-client-react';
import { Loader2, Search, ShieldOff, ShieldCheck, Mail, Package, Trash2 } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

const BASE = getApiBase();

interface AdminUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  banned: boolean;
  bannedReason: string | null;
  bannedAt: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface AdminUserDetail extends AdminUser {
  address: string | null;
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    shippingFee: number;
    shippingAddress: string | null;
    paymentMethod: string | null;
    items: { productId: string; name: string; quantity: number; price: number; imageUrl?: string | null }[] | null;
    createdAt: string | null;
  }[];
}

async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${BASE}/api/admin/users`, { credentials: 'include', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

async function fetchUserDetail(id: string): Promise<AdminUserDetail> {
  const res = await fetch(`${BASE}/api/admin/users/${id}`, { credentials: 'include', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load user');
  return res.json();
}

async function banUser(id: string, reason: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/users/${id}/ban`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ reason: reason || undefined }),
  });
  if (!res.ok) throw new Error('Failed to ban user');
}

async function unbanUser(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/users/${id}/unban`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to unban user');
}

async function deleteUserOrder(userId: string, orderId: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/users/${userId}/orders/${orderId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to delete order');
  }
}

async function deleteUserOrderItem(userId: string, orderId: string, productId: string): Promise<void> {
  const res = await fetch(
    `${BASE}/api/admin/users/${userId}/orders/${orderId}/items/${encodeURIComponent(productId)}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: authHeader(),
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to delete order item');
  }
}

function canEditOrder(status: string): boolean {
  return !['shipped', 'out_for_delivery', 'delivered'].includes(status);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function UsersList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'order'; orderId: string; orderNumber: string }
    | { type: 'item'; orderId: string; orderNumber: string; productId: string; itemName: string }
    | null
  >(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin', 'users', selectedId],
    queryFn: () => fetchUserDetail(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const banMutation = useMutation({
    mutationFn: () => banUser(selectedId!, banReason),
    onSuccess: () => {
      invalidate();
      setBanReason('');
      toast({ title: 'User banned', description: 'They can no longer sign in or place orders.' });
    },
    onError: () => toast({ title: 'Failed to ban user', variant: 'destructive' }),
  });

  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(selectedId!),
    onSuccess: () => {
      invalidate();
      toast({ title: 'User unbanned' });
    },
    onError: () => toast({ title: 'Failed to unban user', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId || !deleteTarget) return;
      if (deleteTarget.type === 'order') {
        await deleteUserOrder(selectedId, deleteTarget.orderId);
      } else {
        await deleteUserOrderItem(selectedId, deleteTarget.orderId, deleteTarget.productId);
      }
    },
    onSuccess: () => {
      invalidate();
      toast({
        title: deleteTarget?.type === 'order' ? 'Order deleted' : 'Order item deleted',
        description: 'The customer details were updated.',
      });
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: error.message || 'Delete failed', variant: 'destructive' });
    },
  });

  const filtered = (users ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.email ?? '').toLowerCase().includes(q) || (u.fullName ?? '').toLowerCase().includes(q);
  });

  const selected = filtered.find((u) => u.id === selectedId) ?? users?.find((u) => u.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every customer who has signed in, with their order history. Ban an account to block sign-in and checkout immediately.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">No users found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last sign-in</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setSelectedId(u.id)}
                >
                  <TableCell>
                    <div className="font-medium">{u.fullName || u.email || 'Unknown'}</div>
                    {u.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(u.lastSignInAt)}</TableCell>
                  <TableCell className="text-sm">{u.orderCount}</TableCell>
                  <TableCell className="text-sm">{formatPrice(u.totalSpent)}</TableCell>
                  <TableCell>
                    {u.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setBanReason(''); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{detail.fullName || detail.email || 'Customer'}</SheetTitle>
                <SheetDescription>{detail.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-xs">Joined</p>
                    <p>{formatDate(detail.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last sign-in</p>
                    <p>{formatDate(detail.lastSignInAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p>{detail.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Address</p>
                    <p>{detail.address || '—'}</p>
                  </div>
                </div>

                {detail.banned && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                    <p className="font-medium text-destructive text-sm">Account banned</p>
                    {detail.bannedReason && <p className="text-xs text-muted-foreground mt-1">Reason: {detail.bannedReason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Since {formatDate(detail.bannedAt)}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="font-medium mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Orders ({detail.orders.length})</p>
                  {detail.orders.length === 0 ? (
                    <p className="text-muted-foreground text-xs">No orders yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {detail.orders.map((o) => {
                        const editable = canEditOrder(o.status);
                        return (
                          <div key={o.id} className="bg-muted/40 rounded-lg px-3 py-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-mono text-xs font-medium">{o.orderNumber}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {o.status.replace(/_/g, ' ')} · {formatDate(o.createdAt)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {o.paymentMethod || 'Payment not recorded'} · {o.shippingAddress || 'Address not recorded'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-medium">{formatPrice(o.total)}</p>
                                {editable && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Delete order"
                                    aria-label={`Delete order ${o.orderNumber}`}
                                    onClick={() => setDeleteTarget({
                                      type: 'order',
                                      orderId: o.id,
                                      orderNumber: o.orderNumber,
                                    })}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {o.items && o.items.length > 0 && (
                              <div className="space-y-2 border-t border-border/60 pt-2">
                                {o.items.map((item) => (
                                  <div key={`${o.id}-${item.productId}`} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-background">
                                        {item.imageUrl ? (
                                          <img src={resolveMediaUrl(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
                                        ) : (
                                          <Package className="m-2 h-5 w-5 text-muted-foreground" />
                                        )}
                                      </div>
                                      <span className="min-w-0 truncate">
                                        {item.name} × {item.quantity}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-muted-foreground">
                                        {formatPrice(Number(item.price) * item.quantity)}
                                      </span>
                                      {editable && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          title="Delete item"
                                          aria-label={`Delete ${item.name}`}
                                          onClick={() => setDeleteTarget({
                                            type: 'item',
                                            orderId: o.id,
                                            orderNumber: o.orderNumber,
                                            productId: item.productId,
                                            itemName: item.name,
                                          })}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {!editable && (
                              <p className="text-[11px] text-muted-foreground">
                                Locked after shipping or dispatch
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {detail.banned ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => unbanMutation.mutate()}
                    disabled={unbanMutation.isPending}
                  >
                    {unbanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Unban this user
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">Ban this user</p>
                    <Textarea
                      placeholder="Reason (optional) — shown only to admins"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      rows={2}
                    />
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => banMutation.mutate()}
                      disabled={banMutation.isPending}
                    >
                      {banMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldOff className="w-4 h-4 mr-2" />}
                      Ban — block sign-in &amp; checkout
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleteMutation.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'order' ? 'Delete this order?' : 'Delete this item from the order?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'order'
                ? `This will permanently delete ${deleteTarget.orderNumber}.`
                : `This will remove ${deleteTarget?.itemName ?? 'this item'} from ${deleteTarget?.orderNumber ?? 'the order'}. If it is the last item, the whole order will be deleted.`}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
