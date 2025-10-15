import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, userId } = await req.json();
    console.log('Parsing text parts list for user:', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Calling Lovable AI for text parsing...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting structured data from construction parts lists. Parse the text and return valid JSON only.'
          },
          {
            role: 'user',
            content: `Extract all parts from this text. For each part, identify:
- part_name (the name/model of the part)
- category (classify as: electrical, plumbing, hvac, structural, roofing, flooring, doors, windows, or other)
- condition (new, like-new, used-good, used-fair, or for-parts)
- price (numeric value only, extract from text if mentioned)
- description (any additional details)

Be flexible with text formats:
- Handle bullet points, numbered lists, comma-separated, or paragraph format
- Extract prices from various formats ($100, 100 USD, "one hundred dollars")
- Infer condition from context words like "brand new", "slightly used", etc.
- If multiple parts are on one line separated by commas or semicolons, split them

Return ONLY a JSON array in this exact format:
[{"part_name": "string", "category": "string", "condition": "string", "price": number, "description": "string"}]

Use defaults when fields aren't specified:
- condition: "used-good"
- description: ""
- price: 0

Text to parse:
${text}`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    const content = aiData.choices[0].message.content;
    
    // Extract JSON from the response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7, -3).trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3, -3).trim();
    }
    
    const parts = JSON.parse(jsonStr);
    console.log('Parsed parts:', parts.length);

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error('No parts could be extracted from the text');
    }

    // Insert parts into database
    const partsToInsert = parts.map((part: any) => ({
      supplier_id: userId,
      part_name: part.part_name,
      category: part.category,
      condition: part.condition,
      price: part.price || null,
      description: part.description || '',
      status: 'available'
    }));

    const { data: insertedParts, error: insertError } = await supabase
      .from('parts')
      .insert(partsToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to insert parts: ${insertError.message}`);
    }

    console.log('Successfully inserted', insertedParts.length, 'parts');

    return new Response(
      JSON.stringify({ 
        success: true, 
        parts: insertedParts,
        count: insertedParts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in parse-parts-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});