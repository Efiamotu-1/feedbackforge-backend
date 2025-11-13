// ═══════════════════════════════════════════════════════════════════════════
// AI SENTIMENT ANALYSIS SERVICE
// ═══════════════════════════════════════════════════════════════════════════
// This service uses OpenAI GPT-4o to analyze customer feedback and extract:
// - Sentiment (positive/negative/neutral)
// - Sentiment Score (0-100)
// - Categories (technical_issues, service_quality, etc.)
// - Emotions (frustrated, happy, angry, etc.)
// - Urgency Level (low, medium, high, critical)
// - Actionable Insights (specific recommendations for management)
// ═══════════════════════════════════════════════════════════════════════════

const OpenAI = require('openai');
// const Anthropic = require('@anthropic-ai/sdk'); // Commented out - using OpenAI

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ALTERNATIVE: Anthropic Claude (commented out for now)
// const anthropic = new Anthropic({
//   apiKey: process.env.ANTHROPIC_API_KEY,
// });

/**
 * Analyzes customer feedback using OpenAI GPT-4o
 * @param {string} feedbackText - The customer's feedback comment
 * @param {number} rating - The rating given (1-5)
 * @param {string} serviceType - Type of service (Mobile App, ATM, etc.)
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeFeedbackSentiment(feedbackText, rating, serviceType = '') {
  try {
    console.log('🤖 Starting AI sentiment analysis...');
    console.log(`   Feedback: "${feedbackText.substring(0, 50)}..."`);
    console.log(`   Rating: ${rating}/5`);

    // ═══════════════════════════════════════════════════════════════════════
    // OPTION A: OpenAI GPT-4o (PRIMARY - ACTIVE)
    // ═══════════════════════════════════════════════════════════════════════
    
    const prompt = `You are an expert sentiment analyst for a Nigerian banking institution. Analyze this customer feedback and provide a comprehensive analysis.

CUSTOMER FEEDBACK:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comment: "${feedbackText}"
Rating: ${rating}/5 stars
Service Type: ${serviceType || 'Not specified'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze this feedback and provide a JSON response with the following structure:

{
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentScore": <number 0-100>,
  "categories": [<array of 1-3 categories>],
  "emotions": [<array of 1-3 emotions>],
  "urgency": "low" | "medium" | "high" | "critical",
  "actionableInsights": "<specific recommendation>",
  "confidenceScore": <number 0-100>
}

FIELD DEFINITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. sentiment: Overall sentiment
   - "positive": Customer is satisfied, praising service
   - "neutral": Mixed feelings or factual statement
   - "negative": Customer is dissatisfied, complaining

2. sentimentScore: Numeric sentiment (0-100)
   - 0-30: Very negative (angry, extremely dissatisfied)
   - 31-50: Negative (disappointed, unsatisfied)
   - 51-60: Neutral (mixed feelings, no strong opinion)
   - 61-80: Positive (satisfied, happy)
   - 81-100: Very positive (extremely satisfied, delighted)

3. categories: Choose 1-3 most relevant from:
   - "service_quality": Overall service experience
   - "wait_time": Queue or response time issues
   - "staff_behavior": Employee interaction (helpful/rude)
   - "product_features": Banking product functionality
   - "pricing": Fees, charges, costs
   - "technical_issues": App/website/system problems
   - "security_concerns": Safety, fraud, account security
   - "user_experience": Interface, ease of use
   - "account_management": Account-related operations
   - "transaction_issues": Payments, transfers, deposits

4. emotions: Choose 1-3 most prominent from:
   - "satisfied": Content with service
   - "frustrated": Annoyed by problems
   - "angry": Very upset or mad
   - "happy": Pleased and joyful
   - "disappointed": Let down by service
   - "confused": Unclear or uncertain
   - "impressed": Positively surprised
   - "anxious": Worried or nervous
   - "grateful": Thankful for service
   - "concerned": Worried about issue
   - "excited": Enthusiastic about feature
   - "worried": Fearful about problem

5. urgency: Priority level
   - "critical": System down, security breach, account locked (respond <1 hour)
   - "high": Major issue affecting service, very angry customer (respond <24 hours)
   - "medium": General complaint, needs attention (respond <5 days)
   - "low": Suggestion, praise, minor issue (respond <14 days)

6. actionableInsights: Specific, brief recommendation (max 150 words)
   - Be specific about which team/department should act
   - Mention the exact issue to address
   - If multiple customers mention same issue, note it
   - For positive feedback, suggest what to continue/expand
   - Example: "Technical team should investigate mobile app login issues on Android devices. Consider rolling back recent update."

7. confidenceScore: Your confidence in this analysis (0-100)
   - Consider clarity of feedback, amount of information provided

IMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.`;

    const completion = await openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert for banking feedback. You provide detailed, accurate analysis in JSON format. You understand Nigerian banking context and customer concerns.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    const responseText = completion.choices[0].message.content;
    const analysis = JSON.parse(responseText);

    console.log('✅ AI analysis completed successfully');
    console.log(`   Sentiment: ${analysis.sentiment} (${analysis.sentimentScore}/100)`);
    console.log(`   Urgency: ${analysis.urgency}`);
    console.log(`   Emotions: ${analysis.emotions.join(', ')}`);

    // Validate and return analysis
    return validateAnalysisResult(analysis);

  } catch (error) {
    console.error('❌ AI Sentiment Analysis Error:', error.message);
    
    // Return fallback analysis if AI fails
    return getFallbackAnalysis(feedbackText, rating);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OPTION B: Anthropic Claude (COMMENTED OUT - for future use)
// ═══════════════════════════════════════════════════════════════════════════

/*
async function analyzeFeedbackWithClaude(feedbackText, rating, serviceType = '') {
  try {
    const prompt = `Analyze this customer feedback and provide a JSON response:

Feedback: "${feedbackText}"
Rating: ${rating}/5
Service Type: ${serviceType}

Provide:
1. sentiment: "positive", "neutral", or "negative"
2. sentimentScore: number from 0-100 (0=very negative, 100=very positive)
3. categories: array of relevant categories from: ["service_quality", "wait_time", "staff_behavior", "product_features", "pricing", "technical_issues", "security_concerns", "user_experience", "account_management", "transaction_issues"]
4. emotions: array of detected emotions from: ["satisfied", "frustrated", "angry", "happy", "disappointed", "confused", "impressed", "anxious", "grateful", "concerned", "excited", "worried"]
5. urgency: "low", "medium", "high", or "critical"
6. actionableInsights: brief specific suggestion for the bank
7. confidenceScore: your confidence level (0-100)

Respond ONLY with valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].text;
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, '').trim();
    const analysis = JSON.parse(cleanJson);

    return validateAnalysisResult(analysis);
    
  } catch (error) {
    console.error('❌ Claude Analysis Error:', error.message);
    return getFallbackAnalysis(feedbackText, rating);
  }
}
*/

/**
 * Validates AI analysis result and ensures all required fields are present
 * @param {Object} analysis - Raw analysis from AI
 * @returns {Object} Validated analysis
 */
function validateAnalysisResult(analysis) {
  // Ensure sentiment is valid
  const validSentiments = ['positive', 'neutral', 'negative'];
  if (!validSentiments.includes(analysis.sentiment)) {
    analysis.sentiment = 'neutral';
  }

  // Ensure sentimentScore is in range
  analysis.sentimentScore = Math.max(0, Math.min(100, analysis.sentimentScore || 50));

  // Ensure categories is an array
  if (!Array.isArray(analysis.categories)) {
    analysis.categories = [];
  }

  // Ensure emotions is an array
  if (!Array.isArray(analysis.emotions)) {
    analysis.emotions = [];
  }

  // Ensure urgency is valid
  const validUrgencies = ['low', 'medium', 'high', 'critical'];
  if (!validUrgencies.includes(analysis.urgency)) {
    analysis.urgency = 'low';
  }

  // Ensure actionableInsights exists
  if (!analysis.actionableInsights || analysis.actionableInsights.trim() === '') {
    analysis.actionableInsights = 'Review feedback and determine appropriate action.';
  }

  // Ensure confidenceScore is in range
  analysis.confidenceScore = Math.max(0, Math.min(100, analysis.confidenceScore || 75));

  return analysis;
}

/**
 * Provides fallback analysis if AI service fails
 * Uses simple rule-based analysis based on rating and keywords
 * @param {string} feedbackText - The feedback text
 * @param {number} rating - The rating (1-5)
 * @returns {Object} Fallback analysis
 */
function getFallbackAnalysis(feedbackText, rating) {
  console.log('⚠️  Using fallback analysis (AI service unavailable)');

  const text = feedbackText.toLowerCase();
  
  // Determine sentiment from rating
  let sentiment = 'neutral';
  let sentimentScore = 50;
  
  if (rating >= 4) {
    sentiment = 'positive';
    sentimentScore = rating * 20; // 4->80, 5->100
  } else if (rating <= 2) {
    sentiment = 'negative';
    sentimentScore = rating * 20; // 1->20, 2->40
  } else {
    sentiment = 'neutral';
    sentimentScore = 60;
  }

  // Detect categories based on keywords
  const categories = [];
  if (text.includes('app') || text.includes('website') || text.includes('online')) {
    categories.push('technical_issues');
  }
  if (text.includes('staff') || text.includes('rude') || text.includes('helpful')) {
    categories.push('staff_behavior');
  }
  if (text.includes('wait') || text.includes('queue') || text.includes('slow')) {
    categories.push('wait_time');
  }
  if (text.includes('atm') || text.includes('transaction') || text.includes('transfer')) {
    categories.push('transaction_issues');
  }
  if (categories.length === 0) {
    categories.push('service_quality');
  }

  // Detect emotions based on keywords
  const emotions = [];
  if (text.includes('frustrat') || text.includes('annoying')) emotions.push('frustrated');
  if (text.includes('angry') || text.includes('upset')) emotions.push('angry');
  if (text.includes('happy') || text.includes('great')) emotions.push('happy');
  if (text.includes('satisfied') || text.includes('good')) emotions.push('satisfied');
  if (text.includes('disappoint')) emotions.push('disappointed');
  if (emotions.length === 0) {
    emotions.push(rating >= 4 ? 'satisfied' : 'disappointed');
  }

  // Determine urgency
  let urgency = 'low';
  if (rating === 1 || text.includes('urgent') || text.includes('immediately')) {
    urgency = 'high';
  } else if (rating === 2) {
    urgency = 'medium';
  }

  return {
    sentiment,
    sentimentScore,
    categories: categories.slice(0, 3),
    emotions: emotions.slice(0, 3),
    urgency,
    actionableInsights: `Review this ${sentiment} feedback regarding ${categories[0]}. Customer rated ${rating}/5 stars.`,
    confidenceScore: 60, // Lower confidence for fallback
  };
}

/**
 * Batch analyze multiple feedbacks (useful for migrating old data)
 * @param {Array} feedbacks - Array of feedback objects
 * @returns {Promise<Array>} Array of analysis results
 */
async function batchAnalyzeFeedbacks(feedbacks) {
  console.log(`📊 Batch analyzing ${feedbacks.length} feedbacks...`);
  
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < feedbacks.length; i++) {
    try {
      const feedback = feedbacks[i];
      console.log(`   Processing ${i + 1}/${feedbacks.length}...`);
      
      const analysis = await analyzeFeedbackSentiment(
        feedback.comment,
        feedback.rating,
        feedback.serviceType
      );
      
      results.push({ feedbackId: feedback._id, analysis, success: true });
      successCount++;
      
      // Rate limiting: wait 1 second between requests to avoid API limits
      if (i < feedbacks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to analyze feedback ${i + 1}:`, error.message);
      results.push({ feedbackId: feedbacks[i]._id, error: error.message, success: false });
      failCount++;
    }
  }

  console.log(`✅ Batch analysis complete: ${successCount} succeeded, ${failCount} failed`);
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  analyzeFeedbackSentiment,
  batchAnalyzeFeedbacks,
  // analyzeFeedbackWithClaude, // Uncomment when switching to Claude
};


