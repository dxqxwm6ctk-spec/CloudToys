import React from 'react';
import { useAdminListOrders, useAdminUpdateOrderStatus, getAdminListOrdersQueryKey } from '@workspace/api-client-react';
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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Package, Truck, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { AdminOrder } from '@workspace/api-client-react';

export default function OrdersList() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useAdminListOrders({
    page,
    pageSize: 20,
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  const updateStatus = useAdminUpdateOrderStatus();

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatus.mutate(
      { id: orderId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: "Order status updated" });
          queryClient.invalidateQueries({ queryKey: getAdminListOrdersQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update order", variant: "destructive" });
        }
      }
    );
  };

  const STATUS_LABEL: Record<string, string> = {
    processing: 'Processing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Package className="w-4 h-4 text-amber-500" />;
      case 'shipped': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'out_for_delivery': return <Truck className="w-4 h-4 text-indigo-500" />;
      case 'delivered': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return "bg-amber-100 text-amber-800 border-amber-200";
      case 'shipped': return "bg-blue-100 text-blue-800 border-blue-200";
      case 'out_for_delivery': return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case 'delivered': return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case 'cancelled': return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage customer orders and shipping status.</p>
        </div>
        
        <div className="w-48">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Est. Delivery</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Details</TableHead>
              <TableHead className="text-right">Update Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 bg-muted rounded w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded-full w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16 ml-auto" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 ml-auto" /></TableCell>
                  <TableCell><div className="h-10 bg-muted rounded w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium font-mono">{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {/* Fallback to tracking steps for a date since API doesn't return created date on list */}
                    {order.steps[0]?.date ? format(new Date(order.steps[0].date), 'MMM d, yyyy') : 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <Badge variant="outline" className={getStatusColor(order.status)}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(order.estimatedDelivery), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {order.total != null ? `$${order.total.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" /> View
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Select 
                      defaultValue={order.status} 
                      onValueChange={(val) => handleStatusChange(order.id, val)}
                    >
                      <SelectTrigger className="w-[140px] ml-auto h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
            Showing {((page - 1) * data.pageSize) + 1} to {Math.min(page * data.pageSize, data.total)} of {data.total} orders
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

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{selectedOrder.orderNumber}</DialogTitle>
                <DialogDescription>
                  Placed {selectedOrder.steps[0]?.date
                    ? format(new Date(selectedOrder.steps[0].date), 'MMM d, yyyy')
                    : 'Unknown date'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.customerName ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{selectedOrder.customerEmail ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payment method</p>
                    <p className="font-medium">{selectedOrder.paymentMethod ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="outline" className={getStatusColor(selectedOrder.status)}>
                      {STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
                    </Badge>
                  </div>
                  {selectedOrder.shippingAddress && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Shipping address</p>
                      <p className="font-medium">{selectedOrder.shippingAddress}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Items</p>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                ${(item.price * item.quantity).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No item detail recorded for this order (placed before item tracking was added).
                    </p>
                  )}
                </div>

                <div className="flex justify-end border-t border-border pt-3">
                  <p className="text-base font-semibold">
                    Total: {selectedOrder.total != null ? `$${selectedOrder.total.toFixed(2)}` : '—'}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
