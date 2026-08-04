import React from 'react';
import { useCurrency } from '@/context/CurrencyContext';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Eye,
  User,
  Mail,
  CreditCard,
  MapPin,
  Calendar,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import type { AdminOrder } from '@workspace/api-client-react';

export default function OrdersList() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
  const [selectedOrder, setSelectedOrder] = React.useState<AdminOrder | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { renderPrice } = useCurrency();
  
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

  const formatOrderDate = (order: AdminOrder) => {
    if (order.createdAt) return format(new Date(order.createdAt), 'MMM d, yyyy');
    if (order.steps[0]?.date) return format(new Date(order.steps[0].date), 'MMM d, yyyy');
    return 'Unknown';
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
              <TableHead>Customer</TableHead>
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
                  <TableCell><div className="h-4 bg-muted rounded w-28" /></TableCell>
                  <TableCell><div className="h-6 bg-muted rounded-full w-24" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-32" /></TableCell>
                  <TableCell><div className="h-4 bg-muted rounded w-16 ml-auto" /></TableCell>
                  <TableCell><div className="h-8 bg-muted rounded w-16 ml-auto" /></TableCell>
                  <TableCell><div className="h-10 bg-muted rounded w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium font-mono">{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{formatOrderDate(order)}</TableCell>
                  <TableCell className="text-muted-foreground">{order.customerName ?? '—'}</TableCell>
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
                    {order.total != null ? (
                      <div>{renderPrice(Number(order.total))}</div>
                    ) : '—'}
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

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col" side="right">
          {selectedOrder && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SheetTitle className="font-mono text-lg">{selectedOrder.orderNumber}</SheetTitle>
                    <SheetDescription className="flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Placed on {formatOrderDate(selectedOrder)}
                    </SheetDescription>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(selectedOrder.status)} shrink-0 flex items-center gap-1.5`}>
                    {getStatusIcon(selectedOrder.status)}
                    {STATUS_LABEL[selectedOrder.status] ?? selectedOrder.status}
                  </Badge>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-6">

                  {/* Customer Information */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Customer Information</h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3 text-sm">
                        <User className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">{selectedOrder.customerName ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium break-all">{selectedOrder.customerEmail ?? '—'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <span className="text-muted-foreground">Payment: </span>
                          <span className="font-medium">{selectedOrder.paymentMethod ?? '—'}</span>
                        </div>
                      </div>
                      {selectedOrder.shippingAddress && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-muted-foreground">Address: </span>
                            <span className="font-medium break-words" dir="auto">{selectedOrder.shippingAddress}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <Separator />

                  {/* Delivery Info */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Delivery</h3>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Estimated delivery: </span>
                        <span className="font-medium">
                          {format(new Date(selectedOrder.estimatedDelivery), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </section>

                  <Separator />

                  {/* Tracking Steps */}
                  {selectedOrder.steps && selectedOrder.steps.length > 0 && (
                    <>
                      <section>
                        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">Tracking</h3>
                        <ol className="relative border-l border-border ml-2 space-y-4">
                          {selectedOrder.steps.map((step, i) => (
                            <li key={i} className="ml-5">
                              <span className={`absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background ${
                                step.completed
                                  ? 'bg-emerald-500'
                                  : 'bg-muted border border-border'
                              }`}>
                                {step.completed && (
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                )}
                              </span>
                              <div className="flex flex-col">
                                <span className={`text-sm font-medium ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {step.label}
                                </span>
                                {step.date && (
                                  <span className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(step.date), 'MMM d, yyyy · h:mm a')}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                      <Separator />
                    </>
                  )}

                  {/* Order Items */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Items Ordered
                    </h3>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="text-xs">Product</TableHead>
                              <TableHead className="text-xs text-center w-16">Qty</TableHead>
                              <TableHead className="text-xs text-right w-24">Unit Price</TableHead>
                              <TableHead className="text-xs text-right w-24">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedOrder.items.map((item, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-sm font-medium py-3">{item.name}</TableCell>
                                <TableCell className="text-sm text-center py-3">{item.quantity}</TableCell>
                                <TableCell className="text-sm text-right py-3">
                                  {renderPrice(Number(item.price))}
                                </TableCell>
                                <TableCell className="text-sm text-right py-3 font-medium">
                                  {renderPrice(Number(item.price) * item.quantity)}
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
                  </section>

                  {/* Order Total */}
                  <div className="bg-muted/40 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Order Total</span>
                      <div className="text-right text-xl font-bold">
                        {selectedOrder.total != null ? renderPrice(Number(selectedOrder.total)) : '—'}
                      </div>
                    </div>
                    {selectedOrder.items && selectedOrder.items.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                      </p>
                    )}
                  </div>

                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
