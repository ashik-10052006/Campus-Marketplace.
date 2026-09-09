const https = require('https');
const Anthropic = require('@anthropic-ai/sdk');

let anthropicClient = null;

const getAnthropicClient = () => {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    const httpAgent = new https.Agent({ keepAlive: false });
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      httpAgent,
    });
  }
  return anthropicClient;
};

/**
 * Helper to call Claude API with environment-configured model and safe fallback
 */
const callClaudeMessages = async ({ prompt, defaultTokens = 300 }) => {
  const client = getAnthropicClient();
  if (!client) return null;

  const primaryModel = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
  // Respect ANTHROPIC_MAX_TOKENS bounding, keeping completions fast and tailored
  const configuredMax = parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10);
  const maxTokens = Number.isFinite(configuredMax) && configuredMax > 0
    ? Math.min(defaultTokens, configuredMax, 4096)
    : defaultTokens;

  try {
    const response = await client.messages.create({
      model: primaryModel,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    if (response && response.content && response.content[0]) {
      return response.content[0].text.trim();
    }
    return null;
  } catch (error) {
    console.error(`Claude AI error (${primaryModel}):`, error.message);

    // If the configured model is not recognized, attempt fallback to claude-sonnet-4-6
    if (primaryModel !== 'claude-sonnet-4-6') {
      try {
        const fallbackRes = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: Math.min(maxTokens, 4096),
          messages: [{ role: 'user', content: prompt }],
        });
        if (fallbackRes && fallbackRes.content && fallbackRes.content[0]) {
          return fallbackRes.content[0].text.trim();
        }
      } catch (fallbackErr) {
        console.error('Claude AI fallback error:', fallbackErr.message);
      }
    }
    return null;
  }
};

/**
 * AI Feature 1: Product Description Generator
 */
const generateProductDescription = async ({ name, category, condition, price }) => {
  const prompt = `You are an assistant for a college campus student marketplace.
Write a clear, concise, appealing, and honest marketplace description for a student selling the following item:
- Product Name: ${name}
- Category: ${category}
- Condition: ${condition}
- Price: ₹${price}

Include key highlights that a fellow student would care about (utility, condition, reason to buy, campus pickup readiness). All prices mentioned must be in Indian Rupees (₹). Keep it friendly, authentic, and under 120 words. Return only the description text without quotation marks or conversational preamble.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 300 });
  if (text) {
    return text;
  }

  // Intelligent fallback if API is not available
  return `Great condition ${name} in ${category || 'General'}. Perfect for student coursework and daily campus life. Asking ₹${price || 'reasonable price'}. In good working order, ideal for students on campus. Message me to arrange pickup or inspection!`;
};

/**
 * AI Feature 2: Improve Description
 */
const improveProductDescription = async ({ currentDescription, name, category }) => {
  const prompt = `You are an editor for a student-focused campus marketplace.
Improve the following product listing description to make it clearer, more trustworthy, concise, and appealing to fellow college students:
Item Name: ${name || 'Item'}
Category: ${category || 'General'}
Current Draft:
"""
${currentDescription}
"""

Guidelines:
- Fix grammar and spelling
- Make bullet points if helpful for specs/condition
- Emphasize campus-friendly details (easy pickup, clean, tested)
- Keep it honest and under 120 words
- Return only the improved description text with no introductory phrases.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 300 });
  if (text) {
    return text;
  }

  return currentDescription
    ? `${currentDescription.trim()}\n\nNote: Clean, tested, and ready for immediate campus handoff. Feel free to ask questions!`
    : 'Item in great working condition. Available for easy on-campus pickup.';
};

/**
 * AI Feature 3: Category Suggestion
 */
const suggestCategory = async ({ name, description, availableCategories }) => {
  const categoriesList = availableCategories.map((c) => (typeof c === 'string' ? c : c.name));

  const prompt = `You are a categorization assistant for a university marketplace.
Given this item:
Name: "${name}"
Description: "${description || ''}"

Choose the single most suitable category strictly from this list:
[${categoriesList.join(', ')}]

Rules:
- Respond ONLY with the exact matching category name from the list.
- Do not add punctuation or extra words.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 50 });
  if (text) {
    const matched = categoriesList.find(
      (c) => c.toLowerCase() === text.toLowerCase()
    );
    if (matched) return matched;
  }

  // Fallback: heuristic keyword match
  const lower = `${name} ${description}`.toLowerCase();
  for (const cat of categoriesList) {
    if (lower.includes(cat.toLowerCase())) return cat;
  }
  return categoriesList.includes('Other') ? 'Other' : categoriesList[0] || '';
};

/**
 * AI Feature 4: Listing Assistant
 */
const listingAssistant = async ({ rawNotes, availableCategories }) => {
  const categoriesList = availableCategories.map((c) => (typeof c === 'string' ? c : c.name));
  const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];

  const prompt = `A college student wrote the following unformatted note about an item they want to sell:
"""
${rawNotes}
"""

Allowed Categories: [${categoriesList.join(', ')}]
Allowed Conditions: [NEW, LIKE_NEW, GOOD, FAIR]

Extract and format this into a structured JSON object with these exact keys:
{
  "name": "concise, descriptive product title",
  "description": "clear, engaging 2-3 sentence marketplace description",
  "category": "must be one of the Allowed Categories exactly",
  "condition": "must be one of the Allowed Conditions exactly",
  "suggestedPrice": numeric value or estimate in Indian Rupees (number only, e.g. 500)
}

Return ONLY valid JSON. No markdown backticks, no other text.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 400 });
  if (text) {
    try {
      const clean = text.replace(/^```json\s*|```$/g, '').trim();
      const parsed = JSON.parse(clean);

      const matchedCategory = categoriesList.find(
        (c) => c.toLowerCase() === (parsed.category || '').toLowerCase()
      ) || categoriesList[0] || 'Other';

      const matchedCondition = validConditions.find(
        (cond) => cond.toLowerCase() === (parsed.condition || '').toLowerCase()
      ) || 'GOOD';

      return {
        name: String(parsed.name || '').slice(0, 150),
        description: String(parsed.description || ''),
        category: matchedCategory,
        condition: matchedCondition,
        suggestedPrice: Number(parsed.suggestedPrice) > 0 ? Number(parsed.suggestedPrice) : 250,
      };
    } catch (parseErr) {
      console.warn('Listing assistant JSON parse error:', parseErr.message);
    }
  }

  // Fallback
  return {
    name: rawNotes.slice(0, 60),
    description: rawNotes,
    category: categoriesList[0] || 'Other',
    condition: 'GOOD',
    suggestedPrice: 300,
  };
};

/**
 * AI Feature 5: Message Suggestions
 */
const getMessageSuggestions = async ({ productName, productPrice, conversationContext }) => {
  const defaultSuggestions = [
    'Is this item still available?',
    'Can I see the item before buying?',
    'Is the price negotiable?',
    'Where can we meet on campus for pickup?',
  ];

  const prompt = `Generate 4 helpful, polite, concise quick-reply suggestions for a college student inquiring about or negotiating for this marketplace item:
Product: ${productName || 'Item'} (Listed at ₹${productPrice || 'N/A'})
${conversationContext ? `Recent chat context: "${conversationContext}"` : ''}

Format your response as a JSON array of 4 short strings (max 10 words each). All price references must use Indian Rupees (₹). Example:
["Is this still available?", "Can we meet at the library?", "Would you take ₹500?", "What condition is it in?"]

Return ONLY the raw JSON array.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 200 });
  if (text) {
    try {
      const clean = text.replace(/^```json\s*|```$/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 4).map((s) => String(s).trim());
      }
    } catch (parseErr) {
      console.warn('Message suggestions parse error:', parseErr.message);
    }
  }

  return defaultSuggestions;
};

/**
 * AI Feature 6: Report Classification
 */
const classifyReport = async ({ reason, description, productName, productDescription }) => {
  const validReasons = [
    'Spam',
    'Scam',
    'Inappropriate Content',
    'Wrong Information',
    'Duplicate Listing',
    'Other',
  ];

  const prompt = `You are a content moderation safety agent for a college campus marketplace.
A student reported a listing. Analyze the report and product details:
Reason Selected: "${reason}"
Report Details: "${description || 'No details provided'}"
Product Name: "${productName || 'N/A'}"
Product Description: "${productDescription || 'N/A'}"

Valid Classification Categories:
[${validReasons.join(', ')}]

Respond in JSON format:
{
  "classification": "One of the reasons above",
  "confidence": "High" | "Medium" | "Low",
  "summary": "1-sentence summary of why this report was flagged"
}

Return ONLY raw JSON.`;

  const text = await callClaudeMessages({ prompt, defaultTokens: 200 });
  if (text) {
    try {
      const clean = text.replace(/^```json\s*|```$/g, '').trim();
      const parsed = JSON.parse(clean);
      const classification = validReasons.includes(parsed.classification)
        ? parsed.classification
        : 'Other';

      return {
        classification,
        confidence: parsed.confidence || 'Medium',
        summary: parsed.summary || 'Listing flagged by student user.',
      };
    } catch (parseErr) {
      console.warn('Report classification parse error:', parseErr.message);
    }
  }

  return {
    classification: validReasons.includes(reason) ? reason : 'Other',
    confidence: 'Low',
    summary: 'Flagged for administrator review.',
  };
};

/**
 * AI Feature 7: Campus AI Assistant (Interactive Chatbot)
 */
const chatWithAssistant = async ({ message, history = [], user = null, catalogContext = {} }) => {
  const client = getAnthropicClient();

  const userName = user ? user.name.split(' ')[0] : 'Student';
  const userRole = user ? user.role : 'visitor';
  const categoriesList = catalogContext.categories || ['Textbooks', 'Electronics', 'Dorm & Living', 'Transportation', 'Calculators', 'Other'];
  const sampleProducts = catalogContext.products || [];

  const catalogSummary = sampleProducts.length > 0
    ? `\nCurrently featured on the marketplace:\n` + sampleProducts.slice(0, 8).map((p) => `- ${p.name} (₹${p.price}) in ${p.category ? p.category.name : 'General'}`).join('\n')
    : '';

  const systemInstructions = `You are the friendly, knowledgeable, and safety-conscious Claude AI Campus Assistant for Campus Marketplace (CampusMarket).
You help college students buy and sell items safely and affordably on campus.

User Information:
- Current User: ${userName} (${userRole})
- Marketplace Categories: ${categoriesList.join(', ')}
${catalogSummary}

Core Guidelines:
1. Tone: Friendly, authentic, encouraging, helpful, and student-focused. Keep responses concise (under 150 words unless asked for detailed explanations).
2. Currency: ALWAYS quote and discuss prices in Indian Rupees (₹ / Rs.), NEVER in USD ($) or dollars. Example: ₹500, ₹1,200, ₹3,500.
3. Safety First: Always advocate safe on-campus meetups (e.g. Campus Library, Student Union, Dining Hall, daylight hours, inspect before paying). Warn against wiring money, gift cards, or off-campus remote transfers.
4. Pricing & Selling Tips: Suggest competitive student pricing in Rupees (₹), taking clear photos in good lighting, and highlighting course codes or model numbers for textbooks/calculators.
5. Negotiation Advice: Encourage polite, respectful bargaining (e.g. "Would you consider ₹X if I can pick it up today?").
6. Formatting: Use markdown formatting (bullet points, bold text) for readability.
7. Navigation: Direct students to browse at /products.html, post an item at /create-product.html, or view chats at /messages.html when relevant.`;

  if (!client) {
    const lower = (message || '').toLowerCase();
    if (lower.includes('safe') || lower.includes('meet') || lower.includes('pickup')) {
      return `🛡️ **Campus Safety Tip:** Always arrange pickups in public, well-lit areas on campus during daylight! Great spots include the **Student Union lobby**, **Campus Library entrance**, or outside the **Student Dining Hall**. Inspect the item thoroughly before paying with cash or campus payment apps.`;
    }
    if (lower.includes('sell') || lower.includes('price') || lower.includes('how to')) {
      return `🏷️ **Quick Selling Tips:**\n• Take clear photos in good natural lighting\n• Price competitively (check similar campus listings)\n• Include course numbers for textbooks (e.g., *MATH 101*)\n• You can list your item in under 2 minutes at [+ Sell Item](/create-product.html)!`;
    }
    if (lower.includes('textbook') || lower.includes('book') || lower.includes('calculator')) {
      return `📚 **Finding Study Gear:** You can browse all active textbooks, graphing calculators, and tech on the [Marketplace Catalog](/products.html). Be sure to filter by category or search by course code to find what you need!`;
    }
    return `Hi ${userName}! 👋 I'm your **Campus AI Assistant**. I can help you find items on campus, give advice on pricing your listings, suggest safe pickup locations, and guide you through student transactions. What can I help you with today?`;
  }

  const messages = [];
  if (Array.isArray(history)) {
    history.slice(-6).forEach((h) => {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({
          role: h.role,
          content: String(h.content || '').slice(0, 1000),
        });
      }
    });
  }

  messages.push({
    role: 'user',
    content: String(message || '').slice(0, 1500),
  });

  const primaryModel = process.env.ANTHROPIC_MODEL || 'claude-opus-4-6';
  const configuredMax = parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10);
  const maxTokens = Number.isFinite(configuredMax) && configuredMax > 0
    ? Math.min(500, configuredMax, 4096)
    : 500;

  try {
    const response = await client.messages.create({
      model: primaryModel,
      max_tokens: maxTokens,
      system: systemInstructions,
      messages,
    });

    if (response && response.content && response.content[0]) {
      return response.content[0].text.trim();
    }
    return `I'm here to help you navigate Campus Marketplace! Ask me about listings, pricing, or safety tips.`;
  } catch (error) {
    console.error(`Claude AI assistant error (${primaryModel}):`, error.message);

    if (primaryModel !== 'claude-sonnet-4-6') {
      try {
        const fallbackRes = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: systemInstructions,
          messages,
        });
        if (fallbackRes && fallbackRes.content && fallbackRes.content[0]) {
          return fallbackRes.content[0].text.trim();
        }
      } catch (fallbackErr) {
        console.error('Claude AI assistant fallback error:', fallbackErr.message);
      }
    }

    return `Hi ${userName}! I'm having a brief connection issue with Claude AI, but I'm still here to help. You can browse active listings on the [Marketplace](/products.html), create a new post at [+ Sell Item](/create-product.html), or check your active chats in [Messages](/messages.html).`;
  }
};

module.exports = {
  generateProductDescription,
  improveProductDescription,
  suggestCategory,
  listingAssistant,
  getMessageSuggestions,
  classifyReport,
  chatWithAssistant,
};
