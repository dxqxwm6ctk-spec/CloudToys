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
import { useToast } from '@/hooks/use-toast';
import { Package, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function OrdersList() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [page, setPage] = React.useState(1);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Package className="w-4 h-4 text-amber-500" />;
      case 'shipped': return <Truck className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case 'shipped': return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case 'delivered': return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400";
      case 'cancelled': return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
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
                  <TableCell><div className="h-10 bg-muted rounded w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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
                      <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(order.estimatedDelivery), 'MMM d, yyyy')}
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
    </div>
  );
}
