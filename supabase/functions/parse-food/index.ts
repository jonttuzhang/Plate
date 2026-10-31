// Turns a free-text meal description into estimated food items using Claude.
// Auth: signed-in users only. Quota: AI_DAILY_LIMIT requests per user per day (default 30).
// Secrets: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets). Never shipped in the app.
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

import { adminClient, corsHeaders, json, requireUser } from '../_shared/http.ts';
import { FOOD_ITEMS_SCHEMA, FoodItemsError, parseFoodItems } from '../_shared/food-items.ts';

const MODEL = 'claude-haiku-5-5'; // small and cheap; this is a simple extraction task
const MAX_TEXT = 500;

const SYSTEM = `You estimate the nutrition of food someone describes in a food diary app used mostly in Finland.
Return one item per distinct food or drink in the description, in the order mentioned.
- name: short and specific, in the language given below (e.g. "Ruisleipä", "Kananmuna, keitetty").
- grams: the amount eaten. Use the quantity if one is given; otherwise a typical Finnish portion
  (one slice of rye bread ≈ 30 g, one egg ≈ 55 g without shell, a cup of coffee ≈ 200 g). For drinks, grams ≈ ml.
- kcal, protein_g, carbs_g, fat_g: for that amount, not per 100 g. Typical Finnish products (Fineli values) when unsure.
Additions mentioned with a food (milk in coffee, butter on bread) are separate items.
If the text describes no food or drink, return an empty items list.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();
  const user = await requireUser(req, admin);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = (await req.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const lang = body?.lang === 'fi' ? 'Finnish' : 'English';
  if (!text || text.length > MAX_TEXT) return json({ error: 'invalid_text' }, 400);

  const limit = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '30');
  const { data: used, error: quotaError } = await admin.rpc('consume_ai_quota', { p_user: user.id, p_limit: limit });
  if (quotaError) {
    console.error('quota check failed', quotaError.message);
    return json({ error: 'server_error' }, 500);
  }
  if (used === null) return json({ error: 'daily_limit', limit }, 429);

  const refund = () => admin.rpc('refund_ai_quota', { p_user: user.id });
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    await refund();
    console.error('ANTHROPIC_API_KEY secret is not set');
    return json({ error: 'not_configured' }, 503);
  }

  try {
    const client = new Anthropic({ apiKey, timeout: 25_000, maxRetries: 2 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: `${SYSTEM}\nLanguage for names: ${lang}.`,
      messages: [{ role: 'user', content: text }],
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: FOOD_ITEMS_SCHEMA },
      },
    });

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text' || response.stop_reason === 'max_tokens') {
      await refund();
      return json({ error: 'bad_output' }, 502);
    }
    const items = parseFoodItems(textBlock.text);
    return json({ items, used, limit });
  } catch (e) {
    await refund();
    if (e instanceof FoodItemsError) {
      console.error('unparseable model output', e.message);
      return json({ error: 'bad_output' }, 502);
    }
    if (e instanceof Anthropic.RateLimitError || (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500)) {
      // 429 from Anthropic, or overloaded (529) / 5xx after the SDK's own retries.
      return json({ error: 'busy' }, 503);
    }
    if (e instanceof Anthropic.APIConnectionError) return json({ error: 'busy' }, 503);
    console.error('parse-food failed', e instanceof Error ? e.message : String(e));
    return json({ error: 'server_error' }, 500);
  }
});
