import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_DAILY_LIMIT = 15; // Free tier requests per day

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
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Get user's API key
    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("gemini_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error("Settings fetch error:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!settings?.gemini_api_key) {
      return new Response(
        JSON.stringify({ error: "NO_API_KEY", message: "Please add your Gemini API key in settings" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check daily usage
    const today = new Date().toISOString().split("T")[0];
    const { data: usage, error: usageError } = await supabase
      .from("api_usage")
      .select("request_count")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const currentCount = usage?.request_count || 0;
    const remainingRequests = Math.max(0, FREE_DAILY_LIMIT - currentCount);

    // Build the prompt
    const systemPrompt = `You are a helpful AI assistant for a productivity app. 
Analyze the provided ${fileType} content and respond based on the user's instruction.
If asked for a diagram, include a mermaid.js code block.
If asked for an image, describe what image should be generated.
Be concise and actionable.`;

    const fullPrompt = overlayPrompt 
      ? `Content:\n${prompt}\n\nInstruction: ${overlayPrompt}`
      : `Content:\n${prompt}\n\nProvide a helpful summary with key points and action items.`;

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.gemini_api_key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: systemPrompt + "\n\n" + fullPrompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      
      if (geminiResponse.status === 400 && errorText.includes("API_KEY_INVALID")) {
        return new Response(
          JSON.stringify({ error: "INVALID_API_KEY", message: "Your Gemini API key is invalid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Gemini API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";

    // Update usage count
    if (usage) {
      await supabase
        .from("api_usage")
        .update({ request_count: currentCount + 1 })
        .eq("user_id", user.id)
        .eq("usage_date", today);
    } else {
      await supabase
        .from("api_usage")
        .insert({ user_id: user.id, usage_date: today, request_count: 1 });
    }

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
      usage: {
        used: currentCount + 1,
        limit: FREE_DAILY_LIMIT,
        remaining: Math.max(0, FREE_DAILY_LIMIT - currentCount - 1)
      }
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
