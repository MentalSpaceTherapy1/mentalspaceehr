import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: 'Pending' | 'Paid' | 'Partial' | 'Overdue' | 'Cancelled';
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  notes?: string;
  createdAt: string;
}

export interface PortalPayment {
  id: string;
  clientId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: 'Credit Card' | 'Debit Card' | 'ACH' | 'Other';
  cardLast4?: string;
  cardBrand?: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  transactionId?: string;
  transactionStatus: 'Pending' | 'Approved' | 'Declined' | 'Refunded';
  declineReason?: string;
  appliedToInvoices: Array<{
    invoiceId: string;
    amountApplied: number;
  }>;
  receiptGenerated: boolean;
  receiptUrl?: string;
  refunded: boolean;
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  notes?: string;
  createdDate: string;
}

export const usePortalBilling = (clientId?: string) => {
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['portal-invoices', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('portal_invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        clientId: invoice.client_id,
        invoiceDate: invoice.invoice_date,
        dueDate: invoice.due_date,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.tax_amount),
        discountAmount: Number(invoice.discount_amount),
        totalAmount: Number(invoice.total_amount),
        amountPaid: Number(invoice.amount_paid),
        balanceDue: Number(invoice.balance_due),
        status: invoice.status as PortalInvoice['status'],
        lineItems: invoice.line_items as PortalInvoice['lineItems'],
        notes: invoice.notes || undefined,
        createdAt: invoice.created_at,
      }));
    },
    enabled: !!clientId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['portal-payments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from('portal_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      return (data || []).map(payment => ({
        id: payment.id,
        clientId: payment.client_id,
        paymentDate: payment.payment_date,
        paymentAmount: Number(payment.payment_amount),
        paymentMethod: payment.payment_method as PortalPayment['paymentMethod'],
        cardLast4: payment.card_last4 || undefined,
        cardBrand: payment.card_brand as PortalPayment['cardBrand'] || undefined,
        transactionId: payment.transaction_id || undefined,
        transactionStatus: payment.transaction_status as PortalPayment['transactionStatus'],
        declineReason: payment.decline_reason || undefined,
        appliedToInvoices: payment.applied_to_invoices as PortalPayment['appliedToInvoices'],
        receiptGenerated: payment.receipt_generated,
        receiptUrl: payment.receipt_url || undefined,
        refunded: payment.refunded,
        refundAmount: payment.refund_amount ? Number(payment.refund_amount) : undefined,
        refundDate: payment.refund_date || undefined,
        refundReason: payment.refund_reason || undefined,
        notes: payment.notes || undefined,
        createdDate: payment.created_date,
      }));
    },
    enabled: !!clientId,
  });

  return {
    invoices: invoices || [],
    payments: payments || [],
    isLoading: invoicesLoading || paymentsLoading,
  };
};
