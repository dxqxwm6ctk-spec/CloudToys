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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Ban, Trash2, X } from 'lucide-react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

const BASE = getApiBase();

interface SecurityEvent {
  id: number;
  ip: string;
  method: string;
  path: string;
  reason: string;
  userId: string | null;
  email: string | null;
  createdAt: string;
}

interface BlockedIp {
  ip: string;
  reason: string | null;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  checkout_rate_limit: 'Too many checkout attempts',
  track_order_rate_limit: 'Too many order lookups',
  admin_login_rate_limit: 'Too many admin login attempts',
  global_rate_limit: 'General request flood',
};

const EMPTY_FILTERS: EventFilters = { ip: '', reason: '', from: '', to: '' };

interface EventFilters {
  ip: string;
  reason: string;
  from: string;
  to: string;
}

async function fetchEvents(filters: EventFilters): Promise<SecurityEvent[]> {
  const params = new URLSearchParams();
  if (filters.ip.trim()) params.set('ip', filters.ip.trim());
  if (filters.reason) params.set('reason', filters.reason);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const qs = params.toString();
  const res = await fetch(`${BASE}/api/admin/security/events${qs ? `?${qs}` : ''}`, { credentials: 'include', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function fetchBlockedIps(): Promise<BlockedIp[]> {
  const res = await fetch(`${BASE}/api/admin/security/blocked-ips`, { credentials: 'include', headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

async function blockIp(ip: string, reason: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/security/blocked-ips`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ ip, reason: reason || undefined }),
  });
  if (!res.ok) throw new Error('Failed to block IP');
}

async function unblockIp(ip: string): Promise<void> {
  const res = await fetch(`${BASE}/api/admin/security/blocked-ips/${encodeURIComponent(ip)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to unblock IP');
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SecurityDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [filters, setFilters] = useState<EventFilters>(EMPTY_FILTERS);
  const hasActiveFilters = !!(filters.ip || filters.reason || filters.from || filters.to);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['admin', 'security', 'events', filters],
    queryFn: () => fetchEvents(filters),
    refetchInterval: 30_000,
  });

  const { data: blockedIps, isLoading: blockedLoading } = useQuery({
    queryKey: ['admin', 'security', 'blocked-ips'],
    queryFn: fetchBlockedIps,
  });

  const blockMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) => blockIp(ip, reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'blocked-ips'] });
      toast({ title: `Blocked ${vars.ip}`, description: 'Every request from this IP is now rejected.' });
      setManualIp('');
      setManualReason('');
    },
    onError: () => toast({ title: 'Failed to block IP', variant: 'destructive' }),
  });

  const unblockMutation = useMutation({
    mutationFn: (ip: string) => unblockIp(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'blocked-ips'] });
      toast({ title: 'IP unblocked' });
    },
    onError: () => toast({ title: 'Failed to unblock IP', variant: 'destructive' }),
  });

  const blockedSet = new Set((blockedIps ?? []).map((b) => b.ip));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-primary" />
          Security
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Automated attempts (repeated checkouts, order-number scraping, admin login guessing) are throttled and
          logged here. Block an IP outright if it keeps coming back.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Block an IP manually</CardTitle>
          <CardDescription>Immediately rejects every request from this address, everywhere on the site.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input placeholder="e.g. 203.0.113.42" value={manualIp} onChange={(e) => setManualIp(e.target.value)} className="sm:max-w-xs" />
          <Input placeholder="Reason (optional)" value={manualReason} onChange={(e) => setManualReason(e.target.value)} className="flex-1" />
          <Button
            variant="destructive"
            disabled={!manualIp.trim() || blockMutation.isPending}
            onClick={() => blockMutation.mutate({ ip: manualIp.trim(), reason: manualReason.trim() })}
          >
            {blockMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}
            Block
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked IPs</CardTitle>
          <CardDescription>{blockedIps?.length ?? 0} currently blocked.</CardDescription>
        </CardHeader>
        <CardContent>
          {blockedLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !blockedIps || blockedIps.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No IPs blocked.</p>
          ) : (
            <div className="space-y-2">
              {blockedIps.map((b) => (
                <div key={b.ip} className="flex items-center justify-between bg-muted/40 rounded-lg px-4 py-2.5">
                  <div>
                    <p className="font-mono text-sm font-medium">{b.ip}</p>
                    <p className="text-xs text-muted-foreground">{b.reason || 'No reason given'} · blocked {formatDateTime(b.createdAt)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => unblockMutation.mutate(b.ip)} disabled={unblockMutation.isPending}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent suspicious activity</CardTitle>
          <CardDescription>
            Last 200 matching rate-limited or blocked requests, most recent first. Filter to investigate a
            specific IP or incident.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 px-6 pb-4">
            <Input
              placeholder="Filter by IP…"
              value={filters.ip}
              onChange={(e) => setFilters((f) => ({ ...f, ip: e.target.value }))}
              className="sm:max-w-[200px]"
            />
            <Select
              value={filters.reason || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, reason: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="sm:max-w-[220px]">
                <SelectValue placeholder="All event types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="sm:max-w-[160px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="sm:max-w-[160px]"
              aria-label="To date"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Clear filters
              </Button>
            )}
          </div>
          {eventsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : !events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {hasActiveFilters ? 'No activity matches these filters.' : 'No suspicious activity recorded yet.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>What happened</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Signed-in as</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(e.createdAt)}</TableCell>
                    <TableCell className="font-mono text-sm">{e.ip}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        {REASON_LABELS[e.reason] ?? e.reason}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{e.method} {e.path}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.email || '—'}</TableCell>
                    <TableCell>
                      {!blockedSet.has(e.ip) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => blockMutation.mutate({ ip: e.ip, reason: `Repeated: ${REASON_LABELS[e.reason] ?? e.reason}` })}
                          disabled={blockMutation.isPending}
                        >
                          <Ban className="w-3.5 h-3.5 mr-1.5" /> Block IP
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
