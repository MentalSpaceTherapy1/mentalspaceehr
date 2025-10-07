import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalBilling } from "@/hooks/usePortalBilling";
import { Search, FileText, CreditCard } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface ClientPaymentHistoryProps {
  clientId: string;
}

export function ClientPaymentHistory({ clientId }: ClientPaymentHistoryProps) {
  const { payments, invoices, isLoading } = usePortalBilling(clientId);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.cardLast4?.includes(searchTerm);
    
    const matchesStatus = 
      statusFilter === "all" || payment.transactionStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      case "Pending":
        return "secondary";
      case "Declined":
        return "destructive";
      case "Refunded":
        return "outline";
      default:
        return "secondary";
    }
  };

  const maskCardNumber = (last4?: string) => {
    return last4 ? `•••• ${last4}` : "N/A";
  };

  const getInvoiceNumber = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    return invoice?.invoiceNumber || invoiceId.slice(0, 8);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading payment history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction ID, method, or card..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Declined">Declined</SelectItem>
              <SelectItem value="Refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || statusFilter !== "all" 
              ? "No payments found matching your filters"
              : "No payment history available"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied To</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {format(new Date(payment.paymentDate), "MM/dd/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${payment.paymentAmount.toFixed(2)}
                    {payment.refunded && (
                      <div className="text-xs text-destructive">
                        Refunded: ${payment.refundAmount?.toFixed(2)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{payment.paymentMethod}</div>
                        {payment.cardBrand && (
                          <div className="text-xs text-muted-foreground">
                            {payment.cardBrand} {maskCardNumber(payment.cardLast4)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {payment.transactionId || "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(payment.transactionStatus)}>
                      {payment.transactionStatus}
                    </Badge>
                    {payment.transactionStatus === "Declined" && payment.declineReason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {payment.declineReason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.appliedToInvoices.length > 0 ? (
                      <div className="space-y-1">
                        {payment.appliedToInvoices.map((allocation, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {getInvoiceNumber(allocation.invoiceId)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${allocation.amountApplied.toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unallocated</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.receiptGenerated && payment.receiptUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(payment.receiptUrl, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
