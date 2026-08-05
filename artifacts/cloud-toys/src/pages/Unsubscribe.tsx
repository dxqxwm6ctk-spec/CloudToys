import { useEffect, useRef, useState } from 'react';
import { PageTransition } from '../components/ui/PageTransition';
import { useUnsubscribeNewsletter } from '@workspace/api-client-react';
import { MailX, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

export function Unsubscribe() {
  const email = new URLSearchParams(window.location.search).get('email') || '';
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'invalid-link'>(
    email ? 'idle' : 'invalid-link',
  );
  const attempted = useRef(false);
  const unsubscribeMutation = useUnsubscribeNewsletter();

  useEffect(() => {
    if (!email || attempted.current) return;
    attempted.current = true;
    unsubscribeMutation.mutate(
      { params: { email } },
      {
        onSuccess: () => setStatus('success'),
        onError: () => setStatus('error'),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-24 max-w-lg min-h-[60vh] flex flex-col items-center justify-center text-center">
        {status === 'idle' || unsubscribeMutation.isPending ? (
          <>
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mb-6" />
            <h1 className="font-serif text-2xl font-bold mb-2">Unsubscribing…</h1>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-primary mb-6" />
            <h1 className="font-serif text-3xl font-bold mb-3">You're unsubscribed</h1>
            <p className="text-muted-foreground mb-8">
              {email} will no longer receive Cloud Toys newsletter emails.
            </p>
            <Link href="/" className="text-primary font-medium hover:underline">
              Back to shop
            </Link>
          </>
        ) : status === 'invalid-link' ? (
          <>
            <MailX className="w-12 h-12 text-destructive mb-6" />
            <h1 className="font-serif text-3xl font-bold mb-3">Invalid unsubscribe link</h1>
            <p className="text-muted-foreground mb-8">
              We couldn't find a valid email in this link. Please use the unsubscribe link from your email.
            </p>
            <Link href="/" className="text-primary font-medium hover:underline">
              Back to shop
            </Link>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-destructive mb-6" />
            <h1 className="font-serif text-3xl font-bold mb-3">Something went wrong</h1>
            <p className="text-muted-foreground mb-8">
              We couldn't process your request. Please try again in a moment.
            </p>
            <Link href="/" className="text-primary font-medium hover:underline">
              Back to shop
            </Link>
          </>
        )}
      </div>
    </PageTransition>
  );
}
