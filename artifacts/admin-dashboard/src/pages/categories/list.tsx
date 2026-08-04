import React, { useRef, useState } from 'react';
import { 
  useAdminListCategories, 
  useAdminCreateCategory, 
  useAdminUpdateCategory, 
  useAdminDeleteCategory,
  getAdminListCategoriesQueryKey,
  resolveMediaUrl
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
  imageUrl: z.string().refine(
    (val) => { try { new URL(val); return true; } catch { return val.startsWith('/'); } },
    "Must be a valid URL"
  ),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function CategoriesList() {
  const { data: categories, isLoading } = useAdminListCategories();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createCategory = useAdminCreateCategory();
  const updateCategory = useAdminUpdateCategory();
  const deleteCategory = useAdminDeleteCategory();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', imageUrl: '' }
  });

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      slug: category.slug,
      imageUrl: category.imageUrl
    });
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setEditingId(null);
    form.reset({ name: '', slug: '', imageUrl: '' });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? This could break products using this category.`)) return;

    deleteCategory.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Category deleted" });
        queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
      },
      onError: (err: any) => {
        const message = err?.response?.data?.error || "Failed to delete";
        toast({ title: message, variant: "destructive" });
      }
    });
  };

  const onSubmit = (data: CategoryFormValues) => {
    if (editingId) {
      updateCategory.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast({ title: "Category updated" });
          queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" })
      });
    } else {
      createCategory.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Category created" });
          queryClient.invalidateQueries({ queryKey: getAdminListCategoriesQueryKey() });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Failed to create", variant: "destructive" })
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${getApiBase()}/api/admin/images/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: authHeader(),
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Upload failed');
      }

      const result = (await response.json()) as { mediumUrl: string };
      form.setValue('imageUrl', result.mediumUrl, { shouldValidate: true });
      toast({ title: 'Image uploaded', description: 'Optimised AVIF variant generated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organize your products into sections.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Category' : 'Create Category'}</DialogTitle>
              <DialogDescription>
                Define a section for grouping similar products.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Wooden Toys" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl><Input {...field} placeholder="wooden-toys" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-1.5">
                        <FormLabel className="mb-0">Image</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploading
                            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            : <Upload className="w-3.5 h-3.5 mr-1.5" />}
                          {isUploading ? 'Processing…' : 'Upload file'}
                        </Button>
                      </div>
                      <FormControl><Input {...field} placeholder="https://... or upload a file above" /></FormControl>
                      {field.value && (
                        <div className="mt-2 rounded-lg border border-border p-2 bg-muted/30 max-w-xs">
                          <img src={resolveMediaUrl(field.value)} alt="Preview" className="w-full h-auto rounded-md" onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }} />
                        </div>
                      )}
                      <FormDescription>
                        Upload a file (converted to AVIF automatically) or paste a URL directly.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
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
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="w-16 h-12 bg-muted rounded-md" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-8" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {cat.imageUrl ? (
                      <div className="w-16 h-12 rounded-md overflow-hidden bg-muted border border-border">
                        <img src={resolveMediaUrl(cat.imageUrl)} alt={cat.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 rounded-md bg-muted border border-border flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{cat.name}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {cat.productCount} items
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
