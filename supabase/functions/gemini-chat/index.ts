import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, fileType, overlayPrompt } = await req.json();

    // Build the prompt
    const systemPrompt = `You are a helpful AI assistant for a productivity app. 
Analyze the provided ${fileType || 'text'} content and respond based on the user's instruction.
If asked for a diagram, include a mermaid.js code block.
If asked for an image, describe what image should be generated.
Be concise and actionable.`;

    const fullPrompt = overlayPrompt 
      ? `Content:\n${prompt}\n\nInstruction: ${overlayPrompt}`
      : `Content:\n${prompt}\n\nProvide a helpful summary with key points and action items.`;

    // Call Lovable AI Gateway
    console.log("Calling Lovable AI Gateway...");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "RATE_LIMITED", message: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ error: "PAYMENT_REQUIRED", message: "AI credits exhausted. Please add credits in Lovable settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "No response generated";
    console.log("AI response received successfully");

    // Parse response for structured output
    const hasMermaid = responseText.includes("```mermaid");
    const hasImageRequest = overlayPrompt?.toLowerCase().includes("image") || 
                           overlayPrompt?.toLowerCase().includes("picture");

    let mermaid = null;
    if (hasMermaid) {
      const mermaidMatch = responseText.match(/```mermaid\n([\s\S]*?)```/);
      mermaid = mermaidMatch ? mermaidMatch[1].trim() : null;
    }

    // Extract key points and action items using simple parsing
    const lines = responseText.split("\n").filter((l: string) => l.trim());
    const keyPoints: string[] = [];
    const actionItems: string[] = [];
    
    let inKeyPoints = false;
    let inActionItems = false;
    
    for (const line of lines) {
      if (line.toLowerCase().includes("key point") || line.toLowerCase().includes("key concept")) {
        inKeyPoints = true;
        inActionItems = false;
        continue;
      }
      if (line.toLowerCase().includes("action item") || line.toLowerCase().includes("next step")) {
        inKeyPoints = false;
        inActionItems = true;
        continue;
      }
      
      const cleanLine = line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim();
      if (cleanLine && cleanLine.length > 5) {
        if (inKeyPoints && keyPoints.length < 5) {
          keyPoints.push(cleanLine);
        } else if (inActionItems && actionItems.length < 5) {
          actionItems.push(cleanLine);
        }
      }
    }

    // Fallback if parsing didn't find structured content
    if (keyPoints.length === 0) {
      keyPoints.push("Content analyzed successfully");
      keyPoints.push("Key information extracted");
    }
    if (actionItems.length === 0) {
      actionItems.push("Review the analysis above");
      actionItems.push("Apply insights to your workflow");
    }

    const result = {
      summary: responseText.split("\n")[0] || "Analysis complete",
      fullResponse: responseText,
      keyPoints,
      actionItems,
      mermaid,
      imagePlaceholder: hasImageRequest ? {
        title: "AI Generated Concept",
        prompt: overlayPrompt,
        style: "Educational / Conceptual"
      } : null,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
