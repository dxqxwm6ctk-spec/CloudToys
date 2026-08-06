import React from 'react';
import { useAdminListProducts, useAdminDeleteProduct, getAdminListProductsQueryKey, resolveMediaUrl } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/currency';
import { authHeader } from '@/lib/auth-token';
import { useAuth } from '@/context/AuthContext';

export default function ProductsList() {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data, isLoading } = useAdminListProducts({
    page,
    pageSize: 20,
    search: search || undefined
  });

  // Pass the bearer token explicitly as well as through the generated client's
  // global token getter. This keeps deletion working when the admin dashboard
  // and API are on different origins and the session cookie is unavailable.
  const deleteProduct = useAdminDeleteProduct({
    request: { headers: authHeader() },
  });

  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    deleteProduct.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Product deleted",
          description: `"${name}" has been removed from the catalog.`,
        });
        queryClient.invalidateQueries({ queryKey: getAdminListProductsQueryKey() });
      },
      onError: (error) => {
        const message =
          (error as { data?: { error?: string }; message?: string }).data?.error ??
          (error as { message?: string }).message ??
          "Failed to delete product. Please try again.";
        toast({
          title: "Error",
          description: message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your entire toy catalog.</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-card p-2 rounded-lg border border-border">
        <Search className="w-5 h-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Search products..." 
          className="border-0 focus-visible:ring-0 shadow-none bg-transparent"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset to page 1 on search
          }}
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="w-12 h-12 bg-muted rounded-md" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-48 mb-2" /><div className="h-3 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded-full w-20" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted border border-border">
                        <img 
                          src={resolveMediaUrl(product.imageUrl)} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{product.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.slug}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.categoryName}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(product.price, product.currency)}
                  </TableCell>
                  <TableCell>
                    {product.inStock ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">In Stock</Badge>
                    ) : (
                      <Badge variant="destructive">Out of Stock</Badge>
                    )}
                    {product.badge && (
                      <Badge variant="secondary" className="ml-2 capitalize">{product.badge}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setLocation(`/products/${product.id}/edit`)}
                        title="Edit product"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {role !== 'supervisor' && <Button
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleteProduct.isPending}
                        title="Delete product"
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {data && data.total > data.pageSize && (
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * data.pageSize) + 1} to {Math.min(page * data.pageSize, data.total)} of {data.total} products
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
