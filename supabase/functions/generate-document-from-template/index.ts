import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateDocumentRequest {
  templateId: string;
  clientId: string;
  customData?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { templateId, clientId, customData = {} }: GenerateDocumentRequest = await req.json();

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError) throw templateError;

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*, profiles!inner(*)")
      .eq("id", clientId)
      .single();

    if (clientError) throw clientError;

    // Get clinician info
    const { data: clinician } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", client.primary_therapist_id)
      .single();

    // Build variable map
    const variableMap: Record<string, string> = {
      clientName: `${client.first_name} ${client.last_name}`,
      clientFirstName: client.first_name,
      clientLastName: client.last_name,
      clientDOB: client.date_of_birth || "",
      clientMRN: client.medical_record_number || "",
      date: new Date().toLocaleDateString(),
      today: new Date().toLocaleDateString(),
      clinicianName: clinician ? `${clinician.first_name} ${clinician.last_name}` : "",
      clinicianFirstName: clinician?.first_name || "",
      clinicianLastName: clinician?.last_name || "",
      ...customData,
    };

    // Replace variables in template content
    let content = template.template_content || "";
    Object.entries(variableMap).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      content = content.replace(placeholder, value);
    });

    // Generate filename
    let filename = template.default_file_name || "document_{{date}}";
    Object.entries(variableMap).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, "g");
      filename = filename.replace(placeholder, value);
    });
    filename = filename.replace(/[^a-z0-9_-]/gi, "_") + ".html";

    // Upload generated document
    const filePath = `generated/${clientId}/${Date.now()}_${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, new Blob([content], { type: "text/html" }), {
        contentType: "text/html",
      });

    if (uploadError) throw uploadError;

    // Create document record
    const { data: document, error: docError } = await supabase
      .from("client_documents")
      .insert({
        client_id: clientId,
        title: template.template_name,
        file_path: filePath,
        file_name: filename,
        mime_type: "text/html",
        document_type: template.template_type,
        document_category: template.template_category,
        uploaded_method: "Template Generation",
        document_source: "Template",
        requires_signature: (template.signature_fields || []).length > 0,
        status: "pending",
      })
      .select()
      .single();

    if (docError) throw docError;

    return new Response(
      JSON.stringify({
        success: true,
        documentId: document.id,
        filePath,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Document generation failed' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
