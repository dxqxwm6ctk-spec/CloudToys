import React, { useRef, useState } from 'react';
import { getApiBase } from '@/lib/api-url';
import { authHeader } from '@/lib/auth-token';
import { Link, useLocation } from 'wouter';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  useAdminCreateProduct, 
  useAdminUpdateProduct, 
  useGetProduct,
  useAdminListCategories,
  getAdminListProductsQueryKey,
  getGetProductQueryKey,
  resolveMediaUrl
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  shortDescription: z.string().min(10, "Short description is required"),
  description: z.string().min(20, "Full description is required"),
  price: z.coerce.number().positive("Price must be a positive number"),
  compareAtPrice: z.coerce.number().positive("Compare at price must be positive").optional().nullable(),
  currency: z.string().min(3, "Currency code is required").default("USD"),
  imageUrl: z.string().refine(
    (val) => { try { new URL(val); return true; } catch { return val.startsWith('/'); } },
    "Must be a valid URL"
  ),
  galleryUrls: z.array(z.object({
    value: z.string().refine(
      (val) => { try { new URL(val); return true; } catch { return val.startsWith('/'); } },
      "Must be a valid URL"
    )
  })).optional(),
  categoryId: z.string().min(1, "Category is required"),
  stockQuantity: z.coerce.number().int("Must be a whole number").min(0, "Cannot be negative"),
  badge: z.string().nullable().optional(),
  features: z.array(z.object({ value: z.string().min(1, "Feature cannot be empty") })).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  id?: string;
  isEdit?: boolean;
}

export default function ProductForm({ id, isEdit = false }: ProductFormProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedVariants, setUploadedVariants] = useState<{
    thumbUrl: string;
    mediumUrl: string;
    largeUrl: string;
  } | null>(null);
  
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  
  const { data: categories, isLoading: isLoadingCategories } = useAdminListCategories();
  
  const { data: existingProduct, isLoading: isLoadingProduct } = useGetProduct(id || '', {
    query: {
      enabled: isEdit && !!id,
      queryKey: getGetProductQueryKey(id || '')
    }
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      shortDescription: '',
      description: '',
      price: 0,
      compareAtPrice: null,
      currency: 'USD',
      imageUrl: '',
      galleryUrls: [],
      categoryId: '',
      stockQuantity: 0,
      badge: null,
      features: [{ value: '' }],
    }
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control,
    name: "features",
  });

  const { fields: galleryFields, append: appendGallery, remove: removeGallery } = useFieldArray({
    control: form.control,
    name: "galleryUrls",
  });

  // Reset form when existing product loads
  React.useEffect(() => {
    if (isEdit && existingProduct) {
      // We need to find the category ID since the public getProduct returns categorySlug
      const catId = categories?.find(c => c.slug === existingProduct.categorySlug)?.id || '';
      
      form.reset({
        name: existingProduct.name,
        slug: existingProduct.slug,
        shortDescription: existingProduct.shortDescription,
        description: existingProduct.description || '',
        price: existingProduct.price,
        compareAtPrice: existingProduct.compareAtPrice,
        currency: existingProduct.currency,
        imageUrl: existingProduct.imageUrl,
        galleryUrls: (existingProduct.galleryUrls || []).map(url => ({ value: url })),
        categoryId: catId,
        stockQuantity: existingProduct.stockQuantity,
        badge: existingProduct.badge || null,
        features: (existingProduct.features || []).map(f => ({ value: f })),
      });
    }
  }, [existingProduct, isEdit, form, categories]);

  const onSubmit = (data: ProductFormValues) => {
    const payload = {
      ...data,
      features: data.features?.map(f => f.value).filter(Boolean),
      galleryUrls: data.galleryUrls?.map(g => g.value).filter(Boolean),
      // Carry AVIF variant URLs generated by the file upload (if any)
      ...(uploadedVariants ?? {}),
    };

    if (isEdit && id) {
      updateProduct.mutate(
        { id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Product updated successfully" });
            queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
            setLocation('/products');
          },
          onError: () => {
            toast({ title: "Failed to update product", variant: "destructive" });
          }
        }
      );
    } else {
      createProduct.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            toast({ title: "Product created successfully" });
            queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
            setLocation('/products');
          },
          onError: () => {
            toast({ title: "Failed to create product", variant: "destructive" });
          }
        }
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (isEdit && id) formData.append('productId', id);

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

      const result = (await response.json()) as {
        thumbUrl: string;
        mediumUrl: string;
        largeUrl: string;
      };
      form.setValue('imageUrl', result.mediumUrl, { shouldValidate: true });
      setUploadedVariants({
        thumbUrl: result.thumbUrl,
        mediumUrl: result.mediumUrl,
        largeUrl: result.largeUrl,
      });
      toast({ title: 'Image uploaded', description: 'Optimised AVIF variants generated.' });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isSaving = createProduct.isPending || updateProduct.isPending;
  const isLoading = (isEdit && isLoadingProduct) || isLoadingCategories;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/products">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            {isEdit ? 'Edit Product' : 'Add New Product'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit ? `Editing ${existingProduct?.name}` : 'Create a new product for your catalog.'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Classic Wooden Train" {...field} />
                        </FormControl>
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
                        <FormControl>
                          <Input placeholder="classic-wooden-train" {...field} />
                        </FormControl>
                        <FormDescription>The URL-friendly name. Must be unique.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shortDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Short Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A brief summary for product cards..." 
                            className="resize-none h-20" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed product information for the main page..." 
                            className="min-h-[150px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                          <FormLabel className="mb-0">Primary Image</FormLabel>
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
                        <FormControl>
                          <Input placeholder="https://… or upload a file above" {...field} />
                        </FormControl>
                        {field.value && (
                          <div className="mt-2 rounded-lg border border-border p-2 bg-muted/30 max-w-xs">
                            <img src={resolveMediaUrl(field.value)} alt="Preview" className="w-full h-auto rounded-md" onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjwvc3ZnPg==';
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

                  <div>
                    <FormLabel className="mb-2 block">Gallery Images</FormLabel>
                    <div className="space-y-3">
                      {galleryFields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                          <FormField
                            control={form.control}
                            name={`galleryUrls.${index}.value`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="https://..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={() => removeGallery(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => appendGallery({ value: '' })}
                        className="mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Gallery Image
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Features</CardTitle>
                  <CardDescription>Bullet points to display on the product detail page.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {featureFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start">
                        <FormField
                          control={form.control}
                          name={`features.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input placeholder="e.g. Hand-painted with non-toxic colors" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon" 
                          onClick={() => removeFeature(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => appendFeature({ value: '' })}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Feature
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="badge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Badge</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === 'none' ? null : val)} defaultValue={field.value || 'none'} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="No badge" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No badge</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="bestseller">Bestseller</SelectItem>
                            <SelectItem value="sale">Sale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" step="1" min="0" {...field} />
                        </FormControl>
                        <FormDescription>
                          Units available. Marked out of stock automatically at 0.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input type="number" step="0.01" className="pl-7" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compareAtPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare at price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="pl-7" 
                              {...field} 
                              value={field.value === null ? '' : field.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : Number(val));
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>Shows as a strike-through price</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => setLocation('/products')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
