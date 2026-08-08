import React from 'react';
import {
  useAdminDeleteImage,
  useAdminListImages,
  getAdminListImagesQueryKey,
  type AdminImage,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FileImage, Loader2, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authHeader } from '@/lib/auth-token';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function formatBytes(bytes: number): string {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown date'
    : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function fileLabel(image: AdminImage): string {
  return image.mimeType?.replace(/^image\//, '').toUpperCase() || 'FILE';
}

export default function ImagesList() {
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [preview, setPreview] = React.useState<AdminImage | null>(null);

  const listQuery = useAdminListImages(
    { search: search.trim() || undefined },
    { request: { headers: authHeader() } },
  );
  const deleteImage = useAdminDeleteImage({
    request: { headers: authHeader() },
  });

  const handleDelete = (image: AdminImage) => {
    if (role === 'supervisor') return;

    const confirmed = window.confirm(
      `Delete "${image.path}"?\n\nThis removes the file permanently and may affect a product or category that references it.`,
    );
    if (!confirmed) return;

    deleteImage.mutate(
      { params: { path: image.path } },
      {
        onSuccess: () => {
          setPreview((current) => (current?.path === image.path ? null : current));
          toast({
            title: 'Image deleted',
            description: `${image.name} was removed from Supabase Storage.`,
          });
          queryClient.invalidateQueries({ queryKey: getAdminListImagesQueryKey() });
        },
        onError: (error) => {
          const response = error as { data?: { error?: string }; message?: string };
          toast({
            title: 'Unable to delete image',
            description: response.data?.error ?? response.message ?? 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const images = listQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-serif font-bold text-foreground">
            <FileImage className="h-8 w-8 text-primary" />
            Images
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage every file in the product-images Supabase bucket.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => listQuery.refetch()}
          disabled={listQuery.isFetching}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by storage path..."
              aria-label="Search images by storage path"
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch('')}
                aria-label="Clear image search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {listQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="aspect-square animate-pulse bg-muted" />
              <CardContent className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div>
              <h2 className="font-serif text-xl font-bold">Could not load images</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the API connection and try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => listQuery.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileImage className="h-10 w-10 text-muted-foreground" />
            <div>
              <h2 className="font-serif text-xl font-bold">
                {search ? 'No matching images' : 'No stored images'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? 'Try a different path or clear the search.'
                  : 'Uploaded product image variants will appear here.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {listQuery.data?.total ?? images.length} file
              {(listQuery.data?.total ?? images.length) === 1 ? '' : 's'}
              {search ? ` matching “${search}”` : ''}
            </p>
            {role === 'supervisor' && (
              <Badge variant="outline">View only</Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image) => (
              <Card key={image.path} className="group overflow-hidden">
                <button
                  type="button"
                  className="relative block aspect-square w-full cursor-zoom-in overflow-hidden bg-muted"
                  onClick={() => setPreview(image)}
                  aria-label={`Preview ${image.path}`}
                >
                  <img
                    src={image.publicUrl}
                    alt={image.path}
                    loading="lazy"
                    className="h-full w-full object-contain p-3 transition-transform duration-200 group-hover:scale-105"
                  />
                  <Badge className="absolute left-3 top-3">{fileLabel(image)}</Badge>
                </button>
                <CardHeader className="space-y-1 p-4 pb-2">
                  <CardTitle className="truncate font-sans text-sm" title={image.path}>
                    {image.name}
                  </CardTitle>
                  <CardDescription className="truncate font-mono text-[11px]" title={image.path}>
                    {image.path}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 p-4 pt-2">
                  <div className="min-w-0 text-xs text-muted-foreground">
                    <div>{formatBytes(image.size)}</div>
                    <div>{formatDate(image.updatedAt ?? image.createdAt)}</div>
                  </div>
                  {role !== 'supervisor' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(image)}
                      disabled={deleteImage.isPending}
                      title={`Delete ${image.name}`}
                      aria-label={`Delete ${image.name}`}
                    >
                      {deleteImage.isPending && deleteImage.variables?.params.path === image.path ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${preview.path}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-3 z-10"
              onClick={() => setPreview(null)}
              aria-label="Close image preview"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="flex max-h-[75vh] items-center justify-center bg-muted p-6">
              <img
                src={preview.publicUrl}
                alt={preview.path}
                className="max-h-[68vh] max-w-full object-contain"
              />
            </div>
            <div className="p-5">
              <p className="break-all font-mono text-xs text-muted-foreground">{preview.path}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatBytes(preview.size)} · {fileLabel(preview)} · Updated{' '}
                {formatDate(preview.updatedAt ?? preview.createdAt)}
              </p>
              {role !== 'supervisor' && (
                <Button
                  variant="destructive"
                  className="mt-4"
                  onClick={() => handleDelete(preview)}
                  disabled={deleteImage.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete image
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}