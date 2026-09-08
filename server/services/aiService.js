const Anthropic = require('@anthropic-ai/sdk');

let anthropicClient = null;

const getAnthropicClient = () => {
  if (!anthropicClient && process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
};

/**
 * AI Feature 1: Product Description Generator
 */
const generateProductDescription = async ({ name, category, condition, price }) => {
  const client = getAnthropicClient();

  if (!client) {
    // Intelligent fallback if API key is not configured
    return `Great quality ${condition ? condition.toLowerCase().replace('_', ' ') : 'used'} ${name} in ${category || 'general'} category. Offered at $${price || 'reasonable price'}. In good working order, ideal for students on campus. Message me to arrange pickup or inspection!`;
  }

  const prompt = `You are an assistant for a college campus student marketplace.
Write a clear, concise, appealing, and honest marketplace description for a student selling the following item:
- Product Name: ${name}
- Category: ${category}
- Condition: ${condition}
- Price: $${price}

Include key highlights that a fellow student would care about (utility, condition, reason to buy, campus pickup readiness). Keep it friendly, authentic, and under 120 words. Return only the description text without quotation marks or conversational preamble.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('Claude AI generate description error:', error.message);
    return `Great condition ${name} in ${category}. Perfect for student coursework and daily campus life. Asking $${price}. Feel free to reach out with any questions or to schedule a campus meetup!`;
  }
};

/**
 * AI Feature 2: Improve Description
 */
const improveProductDescription = async ({ currentDescription, name, category }) => {
  const client = getAnthropicClient();

  if (!client) {
    return currentDescription
      ? `${currentDescription.trim()}\n\nNote: Clean, tested, and ready for immediate campus handoff. Feel free to ask questions!`
      : 'Item in great working condition. Available for easy on-campus pickup.';
  }

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

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('Claude AI improve description error:', error.message);
    return currentDescription;
  }
};

/**
 * AI Feature 3: Category Suggestion
 */
const suggestCategory = async ({ name, description, availableCategories }) => {
  const categoriesList = availableCategories.map((c) => (typeof c === 'string' ? c : c.name));

  const client = getAnthropicClient();

  if (!client) {
    // Basic heuristic match
    const lower = `${name} ${description}`.toLowerCase();
    for (const cat of categoriesList) {
      if (lower.includes(cat.toLowerCase())) return cat;
    }
    return categoriesList.includes('Other') ? 'Other' : categoriesList[0] || '';
  }

  const prompt = `You are a categorization assistant for a university marketplace.
Given this item:
Name: "${name}"
Description: "${description || ''}"

Choose the single most suitable category strictly from this list:
[${categoriesList.join(', ')}]

Rules:
- Respond ONLY with the exact matching category name from the list.
- Do not add punctuation or extra words.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const suggested = response.content[0].text.trim();
    // Validate that the suggestion is strictly in the allowed categories list
    const matched = categoriesList.find(
      (c) => c.toLowerCase() === suggested.toLowerCase()
    );

    return matched || (categoriesList.includes('Other') ? 'Other' : categoriesList[0]);
  } catch (error) {
    console.error('Claude AI suggest category error:', error.message);
    return categoriesList[0] || 'Other';
  }
};

/**
 * AI Feature 4: Listing Assistant
 */
const listingAssistant = async ({ rawNotes, availableCategories }) => {
  const categoriesList = availableCategories.map((c) => (typeof c === 'string' ? c : c.name));
  const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'];

  const client = getAnthropicClient();

  if (!client) {
    // Intelligent heuristic extraction fallback
    return {
      name: rawNotes.slice(0, 50).trim(),
      description: rawNotes.trim(),
      category: categoriesList[0] || 'Other',
      condition: 'GOOD',
      suggestedPrice: 20,
    };
  }

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
  "suggestedPrice": numeric value or estimate (number only, e.g. 25)
}

Return ONLY valid JSON. No markdown backticks, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim().replace(/^```json\s*|```$/g, '');
    const parsed = JSON.parse(text);

    // Validate category and condition
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
      suggestedPrice: Number(parsed.suggestedPrice) > 0 ? Number(parsed.suggestedPrice) : 10,
    };
  } catch (error) {
    console.error('Claude AI listing assistant error:', error.message);
    return {
      name: rawNotes.slice(0, 60),
      description: rawNotes,
      category: categoriesList[0] || 'Other',
      condition: 'GOOD',
      suggestedPrice: 15,
    };
  }
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

  const client = getAnthropicClient();
  if (!client) {
    return defaultSuggestions;
  }

  const prompt = `Generate 4 helpful, polite, concise quick-reply suggestions for a college student inquiring about or negotiating for this marketplace item:
Product: ${productName || 'Item'} (Listed at $${productPrice || 'N/A'})
${conversationContext ? `Recent chat context: "${conversationContext}"` : ''}

Format your response as a JSON array of 4 short strings (max 10 words each). Example:
["Is this still available?", "Can we meet at the library?", "Would you take $20?", "What condition is it in?"]

Return ONLY the raw JSON array.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim().replace(/^```json\s*|```$/g, '');
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4).map((s) => String(s).trim());
    }
    return defaultSuggestions;
  } catch (error) {
    console.error('Claude AI message suggestions error:', error.message);
    return defaultSuggestions;
  }
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

  const client = getAnthropicClient();
  if (!client) {
    return {
      classification: validReasons.includes(reason) ? reason : 'Other',
      confidence: 'Medium',
      summary: 'Report logged for review.',
    };
  }

  const prompt = `You are a content moderation assistant for a campus marketplace.
Review this listing report:
Report Reason: "${reason}"
Report Description: "${description || ''}"
Reported Product Name: "${productName || ''}"
Reported Product Description: "${productDescription || ''}"

Select the most appropriate classification strictly from:
[${validReasons.join(', ')}]

Respond in JSON format:
{
  "classification": "One of the reasons above",
  "confidence": "High" | "Medium" | "Low",
  "summary": "1-sentence summary of why this report was flagged"
}

Return ONLY raw JSON.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim().replace(/^```json\s*|```$/g, '');
    const parsed = JSON.parse(text);
    const classification = validReasons.includes(parsed.classification)
      ? parsed.classification
      : 'Other';

    return {
      classification,
      confidence: parsed.confidence || 'Medium',
      summary: parsed.summary || 'Listing flagged by student user.',
    };
  } catch (error) {
    console.error('Claude AI report classification error:', error.message);
    return {
      classification: validReasons.includes(reason) ? reason : 'Other',
      confidence: 'Low',
      summary: 'Flagged for administrator review.',
    };
  }
};

module.exports = {
  generateProductDescription,
  improveProductDescription,
  suggestCategory,
  listingAssistant,
  getMessageSuggestions,
  classifyReport,
};
