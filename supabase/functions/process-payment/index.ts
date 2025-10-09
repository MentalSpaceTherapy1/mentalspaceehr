/**
 * Payment Processing Edge Function
 * 
 * Handles payment operations via Stripe integration including:
 * - Creating payment intents
 * - Confirming payments
 * - Processing refunds
 * - Managing saved payment methods
 * 
 * Implementation Status: STUB - Requires Stripe integration
 * 
 * @see docs/integrations/PAYMENT_INTEGRATION_SPEC.md
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Type Definitions
// ============================================================================

interface ProcessPaymentRequest {
  action: 'create_intent' | 'confirm_payment' | 'process_refund' | 'save_payment_method';
  
  // For create_intent
  clientId?: string;
  amount?: number; // in cents
  currency?: string;
  description?: string;
  sessionId?: string;
  invoiceId?: string;
  savePaymentMethod?: boolean;
  
  // For confirm_payment
  paymentIntentId?: string;
  paymentMethodId?: string;
  
  // For process_refund
  paymentId?: string;
  refundAmount?: number; // in cents
  reason?: string;
  
  // Metadata
  metadata?: Record<string, any>;
}

interface ProcessPaymentResponse {
  success: boolean;
  paymentIntent?: {
    id: string;
    clientSecret?: string;
    status: string;
    amount: number;
  };
  payment?: {
    id: string;
    amount: number;
    status: string;
    receiptUrl?: string;
  };
  refund?: {
    id: string;
    amount: number;
    status: string;
  };
  error?: {
    message: string;
    code: string;
    type?: string;
  };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const requestData: ProcessPaymentRequest = await req.json();
    
    console.log('Payment request:', {
      action: requestData.action,
      userId: user.id,
      clientId: requestData.clientId
    });

    // Route to appropriate handler
    let response: ProcessPaymentResponse;
    
    switch (requestData.action) {
      case 'create_intent':
        response = await handleCreateIntent(requestData, supabaseClient);
        break;
        
      case 'confirm_payment':
        response = await handleConfirmPayment(requestData, supabaseClient);
        break;
        
      case 'process_refund':
        response = await handleRefund(requestData, supabaseClient);
        break;
        
      case 'save_payment_method':
        response = await handleSavePaymentMethod(requestData, supabaseClient);
        break;
        
      default:
        response = {
          success: false,
          error: {
            message: 'Invalid action',
            code: 'INVALID_ACTION'
          }
        };
    }

    return new Response(
      JSON.stringify(response),
      {
        status: response.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Internal server error',
          code: 'PROCESSING_ERROR'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================================
// Handler Functions (Stubs)
// ============================================================================

async function handleCreateIntent(
  request: ProcessPaymentRequest,
  supabase: any
): Promise<ProcessPaymentResponse> {
  // TODO: Implement Stripe Payment Intent creation
  
  const { clientId, amount, currency = 'usd', description, sessionId, invoiceId } = request;
  
  // Validate inputs
  if (!clientId || !amount || amount <= 0) {
    return {
      success: false,
      error: {
        message: 'Client ID and valid amount are required',
        code: 'INVALID_REQUEST'
      }
    };
  }

  console.log('Creating payment intent:', {
    clientId,
    amount,
    currency,
    description
  });

  // TODO: Initialize Stripe
  // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  
  // TODO: Get or create Stripe customer
  // const customer = await getOrCreateStripeCustomer(clientId, supabase);
  
  // TODO: Create payment intent
  // const paymentIntent = await stripe.paymentIntents.create({
  //   amount,
  //   currency,
  //   customer: customer.id,
  //   description,
  //   metadata: {
  //     clientId,
  //     sessionId: sessionId || '',
  //     invoiceId: invoiceId || '',
  //   },
  //   automatic_payment_methods: {
  //     enabled: true,
  //   },
  // });

  // TODO: Store payment intent in database
  // await supabase.from('payments').insert({
  //   client_id: clientId,
  //   stripe_payment_intent_id: paymentIntent.id,
  //   amount: amount / 100, // Convert cents to dollars
  //   currency,
  //   status: 'pending',
  //   description,
  //   session_id: sessionId,
  //   invoice_id: invoiceId,
  // });

  // STUB RESPONSE
  return {
    success: true,
    paymentIntent: {
      id: 'pi_stub_' + Date.now(),
      clientSecret: 'pi_stub_secret_' + Date.now(),
      status: 'requires_payment_method',
      amount: amount || 0
    }
  };
}

async function handleConfirmPayment(
  request: ProcessPaymentRequest,
  supabase: any
): Promise<ProcessPaymentResponse> {
  // TODO: Implement payment confirmation
  
  const { paymentIntentId, paymentMethodId } = request;
  
  if (!paymentIntentId) {
    return {
      success: false,
      error: {
        message: 'Payment Intent ID is required',
        code: 'INVALID_REQUEST'
      }
    };
  }

  console.log('Confirming payment:', { paymentIntentId, paymentMethodId });

  // TODO: Confirm payment intent with Stripe
  // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  // const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
  //   payment_method: paymentMethodId,
  // });

  // TODO: Update database with payment result
  // await supabase.from('payments')
  //   .update({
  //     status: paymentIntent.status,
  //     stripe_charge_id: paymentIntent.latest_charge,
  //     paid_at: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
  //   })
  //   .eq('stripe_payment_intent_id', paymentIntentId);

  // STUB RESPONSE
  return {
    success: true,
    payment: {
      id: 'pay_stub_' + Date.now(),
      amount: 0,
      status: 'succeeded',
      receiptUrl: 'https://stripe.com/receipt/stub'
    }
  };
}

async function handleRefund(
  request: ProcessPaymentRequest,
  supabase: any
): Promise<ProcessPaymentResponse> {
  // TODO: Implement refund processing
  
  const { paymentId, refundAmount, reason } = request;
  
  if (!paymentId) {
    return {
      success: false,
      error: {
        message: 'Payment ID is required',
        code: 'INVALID_REQUEST'
      }
    };
  }

  console.log('Processing refund:', { paymentId, refundAmount, reason });

  // TODO: Get original payment from database
  // const { data: payment } = await supabase
  //   .from('payments')
  //   .select('*')
  //   .eq('id', paymentId)
  //   .single();

  // TODO: Process refund with Stripe
  // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  // const refund = await stripe.refunds.create({
  //   charge: payment.stripe_charge_id,
  //   amount: refundAmount, // Optional: partial refund
  //   reason: reason || 'requested_by_customer',
  // });

  // TODO: Record refund in database
  // await supabase.from('payment_refunds').insert({
  //   payment_id: paymentId,
  //   stripe_refund_id: refund.id,
  //   amount: refund.amount / 100,
  //   reason: reason,
  //   status: refund.status,
  //   refunded_at: new Date().toISOString(),
  // });

  // TODO: Update payment status
  // await supabase.from('payments')
  //   .update({ status: 'refunded' })
  //   .eq('id', paymentId);

  // STUB RESPONSE
  return {
    success: true,
    refund: {
      id: 'ref_stub_' + Date.now(),
      amount: refundAmount || 0,
      status: 'succeeded'
    }
  };
}

async function handleSavePaymentMethod(
  request: ProcessPaymentRequest,
  supabase: any
): Promise<ProcessPaymentResponse> {
  // TODO: Implement saving payment method
  
  const { clientId, paymentMethodId } = request;
  
  if (!clientId || !paymentMethodId) {
    return {
      success: false,
      error: {
        message: 'Client ID and Payment Method ID are required',
        code: 'INVALID_REQUEST'
      }
    };
  }

  console.log('Saving payment method:', { clientId, paymentMethodId });

  // TODO: Attach payment method to customer
  // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  // const customer = await getOrCreateStripeCustomer(clientId, supabase);
  // await stripe.paymentMethods.attach(paymentMethodId, {
  //   customer: customer.id,
  // });

  // TODO: Get payment method details
  // const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  // TODO: Save to database
  // await supabase.from('saved_payment_methods').insert({
  //   client_id: clientId,
  //   stripe_payment_method_id: paymentMethodId,
  //   stripe_customer_id: customer.id,
  //   type: paymentMethod.type,
  //   last4: paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4,
  //   brand: paymentMethod.card?.brand,
  //   expiry_month: paymentMethod.card?.exp_month,
  //   expiry_year: paymentMethod.card?.exp_year,
  //   bank_name: paymentMethod.us_bank_account?.bank_name,
  // });

  // STUB RESPONSE
  return {
    success: true,
    payment: {
      id: 'pm_stub_' + Date.now(),
      amount: 0,
      status: 'saved'
    }
  };
}

// ============================================================================
// Helper Functions (Stubs)
// ============================================================================

async function getOrCreateStripeCustomer(clientId: string, supabase: any): Promise<any> {
  // TODO: Implement customer lookup/creation
  
  // Check if customer already exists in database
  // const { data: existingCustomer } = await supabase
  //   .from('clients')
  //   .select('stripe_customer_id')
  //   .eq('id', clientId)
  //   .single();

  // if (existingCustomer?.stripe_customer_id) {
  //   return { id: existingCustomer.stripe_customer_id };
  // }

  // Create new Stripe customer
  // const { data: client } = await supabase
  //   .from('clients')
  //   .select('first_name, last_name, email')
  //   .eq('id', clientId)
  //   .single();

  // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');
  // const customer = await stripe.customers.create({
  //   email: client.email,
  //   name: `${client.first_name} ${client.last_name}`,
  //   metadata: {
  //     clientId,
  //   },
  // });

  // Save customer ID to database
  // await supabase
  //   .from('clients')
  //   .update({ stripe_customer_id: customer.id })
  //   .eq('id', clientId);

  // return customer;
  
  // STUB
  return { id: 'cus_stub_' + clientId };
}

/**
 * Rate limiting helper
 * TODO: Implement actual rate limiting with Redis or similar
 */
async function checkRateLimit(clientId: string, action: string): Promise<boolean> {
  // TODO: Implement rate limiting
  // Check attempts in last hour
  // Return false if exceeded
  return true;
}

/**
 * Fraud check helper
 * TODO: Implement fraud detection logic
 */
async function performFraudCheck(request: ProcessPaymentRequest): Promise<boolean> {
  // TODO: Implement fraud detection
  // - Check amount against limits
  // - Check velocity
  // - Check geolocation if available
  // - Integrate with Stripe Radar
  return true;
}

// ============================================================================
// Constants
// ============================================================================

const PAYMENT_LIMITS = {
  maxDailyAmount: 500000, // $5,000 in cents
  maxTransactionAmount: 100000, // $1,000 in cents
  maxAttemptsPerHour: 5,
};

const STRIPE_ERROR_MESSAGES: Record<string, string> = {
  card_declined: 'Your card was declined. Please try a different payment method.',
  expired_card: 'Your card has expired. Please use a different card.',
  incorrect_cvc: 'The security code you entered is incorrect.',
  insufficient_funds: 'Your card has insufficient funds.',
  processing_error: 'An error occurred while processing your payment. Please try again.',
};
