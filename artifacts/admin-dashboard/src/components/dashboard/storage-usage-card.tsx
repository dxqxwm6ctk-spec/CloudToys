import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

interface StorageUsageCardProps {
  usedBytes: number;
  limitBytes: number;
  fileCount: number;
}

export function StorageUsageCard({ usedBytes, limitBytes, fileCount }: StorageUsageCardProps) {
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  const isNearLimit = percentUsed >= 80;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium font-sans text-muted-foreground">
          Image Storage (Supabase Free Tier)
        </CardTitle>
        <HardDrive className={`w-4 h-4 ${isNearLimit ? 'text-destructive' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-serif font-bold">{formatBytes(usedBytes)}</div>
          <div className="text-sm text-muted-foreground">/ {formatBytes(limitBytes)}</div>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div
            className={`h-2 rounded-full ${isNearLimit ? 'bg-destructive' : 'bg-secondary'}`}
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {fileCount.toLocaleString()} files uploaded &middot; {percentUsed.toFixed(1)}% of free storage used
        </p>
      </CardContent>
    </Card>
  );
}
