import { useState } from 'react';
import {
  useAdminListNewsletterSubscribers,
  useAdminDeleteNewsletterSubscriber,
  getAdminListNewsletterSubscribersQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Mail, Copy, Download, Trash2, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';

const BASE = getApiBase();

export default function NewsletterList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: subscribers, isLoading } = useAdminListNewsletterSubscribers();

  const deleteMutation = useAdminDeleteNewsletterSubscriber({
    mutation: {
      onMutate: (vars) => setDeletingId(vars.id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListNewsletterSubscribersQueryKey() });
        toast({ title: 'Subscriber removed' });
      },
      onError: () => toast({ title: 'Failed to remove subscriber', variant: 'destructive' }),
      onSettled: () => setDeletingId(null),
    },
  });

  const handleCopyAll = () => {
    if (!subscribers?.length) return;
    const emails = subscribers.map((s) => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    toast({ title: 'Copied', description: `${subscribers.length} email(s) copied to clipboard.` });
  };

  const handleExportCsv = async () => {
    const res = await fetch(`${BASE}/api/admin/newsletter/subscribers/export`, {
      credentials: 'include',
      headers: authHeader(),
    });
    if (!res.ok) {
      toast({ title: 'Failed to export', variant: 'destructive' });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter-subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Newsletter</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Everyone who signed up in the storefront footer — copy the list or export a CSV to send them a campaign.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyAll} disabled={!subscribers?.length}>
            <Copy className="w-4 h-4 mr-2" />
            Copy all emails
          </Button>
          <Button onClick={handleExportCsv} disabled={!subscribers?.length}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Subscribers
          </CardTitle>
          <CardDescription>
            {subscribers ? `${subscribers.length} subscriber${subscribers.length === 1 ? '' : 's'}` : 'Loading…'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !subscribers?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Mail className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No subscribers yet</p>
              <p className="text-sm mt-1">Emails from the storefront newsletter form will show up here.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(s.subscribedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate({ id: s.id })}
                        disabled={deletingId === s.id}
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
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
