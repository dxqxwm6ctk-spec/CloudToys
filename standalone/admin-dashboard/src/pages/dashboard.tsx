import React from 'react';
import { useGetAdminStats } from '@/lib/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FolderTree, ShoppingBag, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetAdminStats();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-8 w-48 bg-muted rounded mb-2"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-serif font-bold text-foreground">Failed to load statistics</h2>
        <p className="text-muted-foreground mt-2">There was an error communicating with the server.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">Welcome back. Here's what's happening with your store today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Total Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Total Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Categories</CardTitle>
            <FolderTree className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold">{stats.totalCategories}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans text-muted-foreground">Out of Stock</CardTitle>
            <AlertTriangle className={`w-4 h-4 ${stats.outOfStockProducts > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-serif font-bold">{stats.outOfStockProducts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/products/new" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">Add New Product</div>
                  <div className="text-sm text-muted-foreground">Create a new item in your catalog</div>
                </div>
              </div>
            </Link>
            
            <Link href="/orders" className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium">Manage Orders</div>
                  <div className="text-sm text-muted-foreground">Update shipping statuses</div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary-foreground">Store Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-primary-foreground/80">In Stock Products</span>
                <span className="font-bold">{stats.inStockProducts}</span>
              </div>
              <div className="w-full bg-primary-foreground/20 rounded-full h-2">
                <div 
                  className="bg-secondary h-2 rounded-full" 
                  style={{ width: `${stats.totalProducts > 0 ? (stats.inStockProducts / stats.totalProducts) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-primary-foreground/70 leading-relaxed mt-4">
                Maintaining a high stock ratio ensures customers can always find what they're looking for. You have {stats.outOfStockProducts} items currently out of stock.
              </p>
              {stats.outOfStockProducts > 0 && (
                <Button variant="secondary" className="w-full mt-4" asChild>
                  <Link href="/products?status=out-of-stock">Review Inventory</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
