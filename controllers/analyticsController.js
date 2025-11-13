// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS CONTROLLER - Dashboard Metrics & Business Intelligence
// ═══════════════════════════════════════════════════════════════════════════
// This controller provides aggregated data for the admin dashboard:
// - Sentiment overview and trends
// - Service type performance comparison
// - Category analysis and insights
// - Emotion patterns across customer base
// - Performance metrics (CSAT, NPS, CES)
// - Time-based trend analysis
// ═══════════════════════════════════════════════════════════════════════════

const Feedback = require('./../models/feedbackModel');

// ═══════════════════════════════════════════════════════════════════════════
// 1. SENTIMENT OVERVIEW - Main Dashboard Widget
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Overall sentiment distribution with percentages and averages
// Business Use: Quick health check of customer satisfaction
// Dashboard: "75% positive, 15% neutral, 10% negative"
// ═══════════════════════════════════════════════════════════════════════════

exports.getSentimentOverview = async (req, res) => {
  try {
    console.log('📊 Fetching sentiment overview...');
    
    const { startDate, endDate, serviceType, branch } = req.query;

    // Build match criteria
    const matchStage = {
      sentiment: { $exists: true, $ne: null }, // Only include analyzed feedback
    };

    // Date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    } else {
      // Default: Last 30 days
      matchStage.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    // Optional filters
    if (serviceType) matchStage.serviceType = serviceType;
    if (branch) matchStage.branch = branch;

    console.log('   Filters:', matchStage);

    // Aggregate sentiment statistics
    const sentimentStats = await Feedback.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate totals and percentages
    const totalFeedback = sentimentStats.reduce((sum, s) => sum + s.count, 0);

    const result = sentimentStats.map((stat) => ({
      sentiment: stat._id,
      count: stat.count,
      percentage: totalFeedback > 0 ? parseFloat(((stat.count / totalFeedback) * 100).toFixed(2)) : 0,
      avgRating: parseFloat(stat.avgRating.toFixed(2)),
      avgSentimentScore: parseFloat(stat.avgSentimentScore.toFixed(1)),
    }));

    // Calculate overall metrics
    const overallAvgRating = sentimentStats.reduce((sum, s) => sum + (s.avgRating * s.count), 0) / totalFeedback;
    const overallSentimentScore = sentimentStats.reduce((sum, s) => sum + (s.avgSentimentScore * s.count), 0) / totalFeedback;

    console.log(`✅ Found ${totalFeedback} feedbacks`);
    console.log('   Distribution:', result.map(r => `${r.sentiment}: ${r.percentage}%`).join(', '));

    res.json({
      status: 'success',
      period: {
        startDate: matchStage.createdAt.$gte || 'all time',
        endDate: matchStage.createdAt.$lte || 'now',
      },
      summary: {
        totalFeedback,
        overallAvgRating: parseFloat(overallAvgRating.toFixed(2)),
        overallSentimentScore: parseFloat(overallSentimentScore.toFixed(1)),
      },
      data: result,
    });
  } catch (error) {
    console.error('❌ Error fetching sentiment overview:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. SERVICE TYPE PERFORMANCE - Compare Services
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Performance metrics for each service type (Mobile App, ATM, etc.)
// Business Use: Identify which services need improvement
// Dashboard: "Mobile App: 65/100 (needs attention), ATM: 85/100 (good)"
// ═══════════════════════════════════════════════════════════════════════════

exports.getServiceTypeMetrics = async (req, res) => {
  try {
    console.log('📊 Fetching service type performance metrics...');

    const { startDate, endDate } = req.query;
    const matchStage = {
      sentiment: { $exists: true, $ne: null },
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const metrics = await Feedback.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$serviceType',
          totalFeedback: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
          positiveCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] },
          },
          negativeCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] },
          },
          neutralCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] },
          },
          highUrgencyCount: {
            $sum: { $cond: [{ $in: ['$urgency', ['high', 'critical']] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          serviceType: '$_id',
          totalFeedback: 1,
          avgRating: { $round: ['$avgRating', 2] },
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
          positivePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$positiveCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          negativePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$negativeCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          neutralPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$neutralCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          satisfactionScore: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$positiveCount', '$totalFeedback'] },
                  100,
                ],
              },
              1,
            ],
          },
          highUrgencyCount: 1,
          // Performance rating based on sentiment score
          performanceRating: {
            $switch: {
              branches: [
                { case: { $gte: ['$avgSentimentScore', 80] }, then: 'Excellent' },
                { case: { $gte: ['$avgSentimentScore', 70] }, then: 'Good' },
                { case: { $gte: ['$avgSentimentScore', 60] }, then: 'Average' },
                { case: { $gte: ['$avgSentimentScore', 50] }, then: 'Needs Attention' },
              ],
              default: 'Critical',
            },
          },
        },
      },
      { $sort: { satisfactionScore: -1 } },
    ]);

    console.log(`✅ Analyzed ${metrics.length} service types`);

    res.json({
      status: 'success',
      data: metrics,
    });
  } catch (error) {
    console.error('❌ Error fetching service metrics:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. SENTIMENT TRENDS - Time-Based Analysis
// ═══════════════════════════════════════════════════════════════════════════
// Shows: How sentiment changes over time (daily/weekly/monthly)
// Business Use: Identify trends, spot problems early
// Dashboard: Line chart showing sentiment trends over past 30 days
// ═══════════════════════════════════════════════════════════════════════════

exports.getSentimentTrends = async (req, res) => {
  try {
    console.log('📊 Fetching sentiment trends...');

    const { period = 'daily', days = 30 } = req.query;

    // Determine date grouping format
    let groupFormat;
    switch (period) {
      case 'hourly':
        groupFormat = { $dateToString: { format: '%Y-%m-%d-%H', date: '$createdAt' } };
        break;
      case 'daily':
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'weekly':
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'monthly':
        groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const trends = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
          sentiment: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            period: groupFormat,
            sentiment: '$sentiment',
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
        },
      },
      {
        $project: {
          period: '$_id.period',
          sentiment: '$_id.sentiment',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
        },
      },
      { $sort: { '_id.period': 1, '_id.sentiment': 1 } },
    ]);

    console.log(`✅ Found ${trends.length} data points`);

    res.json({
      status: 'success',
      period,
      days: parseInt(days),
      data: trends,
    });
  } catch (error) {
    console.error('❌ Error fetching sentiment trends:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. CATEGORY INSIGHTS - Issue Analysis
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Most common categories and their sentiment
// Business Use: Identify top issues to prioritize
// Dashboard: "technical_issues: 45 mentions (mostly negative)"
// ═══════════════════════════════════════════════════════════════════════════

exports.getCategoryInsights = async (req, res) => {
  try {
    console.log('📊 Fetching category insights...');

    const { startDate, endDate, minCount = 1 } = req.query;
    const matchStage = {
      categories: { $exists: true, $ne: [] },
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const insights = await Feedback.aggregate([
      { $match: matchStage },
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
          sentiments: { $push: '$sentiment' },
          urgencyLevels: { $push: '$urgency' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
          positiveCount: {
            $size: {
              $filter: {
                input: '$sentiments',
                cond: { $eq: ['$$this', 'positive'] },
              },
            },
          },
          negativeCount: {
            $size: {
              $filter: {
                input: '$sentiments',
                cond: { $eq: ['$$this', 'negative'] },
              },
            },
          },
          neutralCount: {
            $size: {
              $filter: {
                input: '$sentiments',
                cond: { $eq: ['$$this', 'neutral'] },
              },
            },
          },
          highUrgencyCount: {
            $size: {
              $filter: {
                input: '$urgencyLevels',
                cond: { $in: ['$$this', ['high', 'critical']] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          positivePercentage: {
            $round: [{ $multiply: [{ $divide: ['$positiveCount', '$count'] }, 100] }, 1],
          },
          negativePercentage: {
            $round: [{ $multiply: [{ $divide: ['$negativeCount', '$count'] }, 100] }, 1],
          },
          dominantSentiment: {
            $cond: [
              { $gte: ['$positiveCount', '$negativeCount'] },
              'positive',
              'negative',
            ],
          },
        },
      },
      { $match: { count: { $gte: parseInt(minCount) } } },
      { $sort: { count: -1 } },
    ]);

    console.log(`✅ Found ${insights.length} categories`);

    res.json({
      status: 'success',
      data: insights,
    });
  } catch (error) {
    console.error('❌ Error fetching category insights:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. EMOTION ANALYSIS - Customer Feelings
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Distribution of emotions across feedback
// Business Use: Understand how customers feel
// Dashboard: Emotion heatmap showing "frustrated: 23%, satisfied: 45%"
// ═══════════════════════════════════════════════════════════════════════════

exports.getEmotionAnalysis = async (req, res) => {
  try {
    console.log('📊 Fetching emotion analysis...');

    const { startDate, endDate, serviceType } = req.query;
    const matchStage = {
      emotions: { $exists: true, $ne: [] },
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (serviceType) matchStage.serviceType = serviceType;

    const emotionData = await Feedback.aggregate([
      { $match: matchStage },
      { $unwind: '$emotions' },
      {
        $group: {
          _id: '$emotions',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
          sentiments: { $push: '$sentiment' },
        },
      },
      {
        $project: {
          emotion: '$_id',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
          positiveCount: {
            $size: {
              $filter: {
                input: '$sentiments',
                cond: { $eq: ['$$this', 'positive'] },
              },
            },
          },
          negativeCount: {
            $size: {
              $filter: {
                input: '$sentiments',
                cond: { $eq: ['$$this', 'negative'] },
              },
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Calculate total for percentages
    const totalEmotions = emotionData.reduce((sum, e) => sum + e.count, 0);

    const result = emotionData.map((e) => ({
      ...e,
      percentage: totalEmotions > 0 ? parseFloat(((e.count / totalEmotions) * 100).toFixed(2)) : 0,
    }));

    console.log(`✅ Found ${result.length} different emotions`);
    console.log('   Top 3:', result.slice(0, 3).map(e => `${e.emotion} (${e.percentage}%)`).join(', '));

    res.json({
      status: 'success',
      summary: {
        totalEmotions,
        uniqueEmotions: result.length,
      },
      data: result,
    });
  } catch (error) {
    console.error('❌ Error fetching emotion analysis:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. URGENCY DASHBOARD - Priority Queue
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Count of feedback by urgency level
// Business Use: See how many items need immediate attention
// Dashboard: "Critical: 2, High: 5, Medium: 12, Low: 85"
// ═══════════════════════════════════════════════════════════════════════════

exports.getUrgencyDashboard = async (req, res) => {
  try {
    console.log('📊 Fetching urgency dashboard...');

    const urgencyData = await Feedback.aggregate([
      {
        $match: {
          urgency: { $exists: true, $ne: null },
          status: { $ne: 'closed' }, // Only open items
        },
      },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 },
          avgSentimentScore: { $avg: '$sentimentScore' },
          oldestFeedback: { $min: '$createdAt' },
          newestFeedback: { $max: '$createdAt' },
        },
      },
      {
        $project: {
          urgency: '$_id',
          count: 1,
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
          oldestFeedback: 1,
          newestFeedback: 1,
          avgResponseTime: {
            $round: [
              {
                $divide: [
                  { $subtract: [new Date(), '$oldestFeedback'] },
                  1000 * 60 * 60 * 24, // Convert to days
                ],
              },
              1,
            ],
          },
        },
      },
      {
        $sort: {
          urgency: 1, // Custom sort needed for critical > high > medium > low
        },
      },
    ]);

    // Custom sort order
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    urgencyData.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    console.log(`✅ Urgency breakdown:`, urgencyData.map(u => `${u.urgency}: ${u.count}`).join(', '));

    res.json({
      status: 'success',
      data: urgencyData,
    });
  } catch (error) {
    console.error('❌ Error fetching urgency dashboard:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. PULSE METRICS - CSAT, NPS, CES
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Key performance indicators
// Business Use: Executive dashboard summary metrics
// Dashboard: "CSAT: 78.5%, NPS: +42, CES: 71.2"
// ═══════════════════════════════════════════════════════════════════════════

exports.getPulseMetrics = async (req, res) => {
  try {
    console.log('📊 Calculating pulse metrics (CSAT, NPS, CES)...');

    const { days = 30 } = req.query;

    const feedback = await Feedback.find({
      createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      rating: { $exists: true },
    }).select('rating sentiment sentimentScore');

    if (feedback.length === 0) {
      return res.json({
        status: 'success',
        message: 'No feedback data available for the specified period',
        data: {
          csat: 0,
          nps: 0,
          ces: 0,
          totalFeedback: 0,
          period: `${days} days`,
        },
      });
    }

    // ───────────────────────────────────────────────────────────────────────
    // CSAT (Customer Satisfaction Score)
    // ───────────────────────────────────────────────────────────────────────
    // Percentage of ratings that are 4 or 5 stars
    // Industry standard: >80% is good, >90% is excellent
    const satisfiedCount = feedback.filter((f) => f.rating >= 4).length;
    const csat = parseFloat(((satisfiedCount / feedback.length) * 100).toFixed(1));

    // ───────────────────────────────────────────────────────────────────────
    // NPS (Net Promoter Score)
    // ───────────────────────────────────────────────────────────────────────
    // Promoters (5 stars) - Detractors (1-3 stars)
    // Range: -100 to +100
    // Industry standard: >0 is good, >50 is excellent
    const promoters = feedback.filter((f) => f.rating === 5).length;
    const detractors = feedback.filter((f) => f.rating <= 3).length;
    const nps = parseFloat((((promoters - detractors) / feedback.length) * 100).toFixed(1));

    // ───────────────────────────────────────────────────────────────────────
    // CES (Customer Effort Score)
    // ───────────────────────────────────────────────────────────────────────
    // Based on sentiment score (higher = easier experience)
    // Using AI sentiment score as proxy for effort
    const avgSentimentScore = parseFloat(
      (feedback.reduce((sum, f) => sum + (f.sentimentScore || 0), 0) / feedback.length).toFixed(1)
    );

    // ───────────────────────────────────────────────────────────────────────
    // Additional Metrics
    // ───────────────────────────────────────────────────────────────────────
    const avgRating = parseFloat(
      (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(2)
    );

    const sentimentDistribution = {
      positive: feedback.filter((f) => f.sentiment === 'positive').length,
      neutral: feedback.filter((f) => f.sentiment === 'neutral').length,
      negative: feedback.filter((f) => f.sentiment === 'negative').length,
    };

    // Performance rating
    let performanceRating = 'Needs Improvement';
    if (csat >= 90 && nps >= 50) performanceRating = 'Excellent';
    else if (csat >= 80 && nps >= 30) performanceRating = 'Good';
    else if (csat >= 70 && nps >= 10) performanceRating = 'Average';

    console.log(`✅ Pulse Metrics Calculated:`);
    console.log(`   CSAT: ${csat}% | NPS: ${nps} | CES: ${avgSentimentScore}`);
    console.log(`   Performance: ${performanceRating}`);

    res.json({
      status: 'success',
      data: {
        // Core Metrics
        csat,
        nps,
        ces: avgSentimentScore,

        // Supporting Metrics
        avgRating,
        totalFeedback: feedback.length,
        period: `${days} days`,

        // Breakdown
        breakdown: {
          promoters,
          detractors,
          passives: feedback.length - promoters - detractors,
          satisfied: satisfiedCount,
          unsatisfied: feedback.length - satisfiedCount,
        },

        // Sentiment Distribution
        sentimentDistribution,

        // Performance Rating
        performanceRating,

        // Benchmarks for reference
        benchmarks: {
          csat: {
            excellent: '>90%',
            good: '80-90%',
            average: '70-80%',
            poor: '<70%',
          },
          nps: {
            excellent: '>50',
            good: '30-50',
            average: '0-30',
            poor: '<0',
          },
        },
      },
    });
  } catch (error) {
    console.error('❌ Error calculating pulse metrics:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. ACTIONABLE INSIGHTS - AI Recommendations
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Top AI-generated recommendations
// Business Use: Know exactly what actions to take
// Dashboard: Ranked list of recommendations with frequency
// ═══════════════════════════════════════════════════════════════════════════

exports.getActionableInsights = async (req, res) => {
  try {
    console.log('📊 Fetching actionable insights...');

    const { limit = 10, urgency, serviceType } = req.query;

    const matchStage = {
      actionableInsights: { $exists: true, $ne: null, $ne: '' },
    };

    if (urgency) matchStage.urgency = urgency;
    if (serviceType) matchStage.serviceType = serviceType;

    const insights = await Feedback.find(matchStage)
      .sort({ urgency: 1, createdAt: -1 }) // Critical first, then newest
      .limit(parseInt(limit))
      .select(
        'referenceNumber customerName actionableInsights urgency sentiment categories serviceType createdAt'
      );

    console.log(`✅ Found ${insights.length} actionable insights`);

    res.json({
      status: 'success',
      count: insights.length,
      data: insights,
    });
  } catch (error) {
    console.error('❌ Error fetching actionable insights:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. BRANCH COMPARISON (if applicable)
// ═══════════════════════════════════════════════════════════════════════════
// Shows: Performance comparison across different branches
// Business Use: Identify best/worst performing branches
// Dashboard: Branch leaderboard with scores
// ═══════════════════════════════════════════════════════════════════════════

exports.getBranchComparison = async (req, res) => {
  try {
    console.log('📊 Fetching branch comparison...');

    const { days = 30, startDate, endDate } = req.query;

    // Build match criteria with date filters
    const matchStage = {
      branch: { $exists: true, $ne: null, $ne: '' },
      sentiment: { $exists: true },
    };

    // Date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    } else {
      // Default: Use 'days' parameter (7, 30, 90, etc.)
      matchStage.createdAt = {
        $gte: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
      };
    }

    console.log(`   Analyzing branches for the last ${days} days...`);

    const branchData = await Feedback.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$branch',
          totalFeedback: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          avgSentimentScore: { $avg: '$sentimentScore' },
          positiveCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] },
          },
          negativeCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] },
          },
          neutralCount: {
            $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] },
          },
          highUrgencyCount: {
            $sum: { $cond: [{ $in: ['$urgency', ['high', 'critical']] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          branch: '$_id',
          totalFeedback: 1,
          avgRating: { $round: ['$avgRating', 2] },
          avgSentimentScore: { $round: ['$avgSentimentScore', 1] },
          positivePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$positiveCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          negativePercentage: {
            $round: [
              { $multiply: [{ $divide: ['$negativeCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          neutralPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$neutralCount', '$totalFeedback'] }, 100] },
              1,
            ],
          },
          highUrgencyCount: 1,
          performanceScore: {
            $round: [
              {
                $add: [
                  { $multiply: ['$avgSentimentScore', 0.7] }, // 70% weight on sentiment
                  { $multiply: ['$avgRating', 6] }, // 30% weight on rating (scaled to 30)
                ],
              },
              1,
            ],
          },
          // Performance rating
          performanceRating: {
            $switch: {
              branches: [
                { case: { $gte: ['$avgSentimentScore', 80] }, then: 'Excellent' },
                { case: { $gte: ['$avgSentimentScore', 70] }, then: 'Good' },
                { case: { $gte: ['$avgSentimentScore', 60] }, then: 'Average' },
                { case: { $gte: ['$avgSentimentScore', 50] }, then: 'Needs Attention' },
              ],
              default: 'Critical',
            },
          },
        },
      },
      { $sort: { performanceScore: -1 } },
    ]);

    console.log(`✅ Compared ${branchData.length} branches`);
    if (branchData.length > 0) {
      console.log(`   🥇 Top performer: ${branchData[0].branch} (Score: ${branchData[0].performanceScore})`);
      if (branchData.length > 1) {
        console.log(`   🥈 Runner-up: ${branchData[1].branch} (Score: ${branchData[1].performanceScore})`);
      }
    }

    res.json({
      status: 'success',
      period: {
        days: parseInt(days),
        startDate: matchStage.createdAt.$gte || startDate || 'all time',
        endDate: matchStage.createdAt.$lte || endDate || 'now',
      },
      summary: {
        totalBranches: branchData.length,
        topPerformer: branchData[0] || null,
        lowestPerformer: branchData[branchData.length - 1] || null,
      },
      data: branchData,
    });
  } catch (error) {
    console.error('❌ Error fetching branch comparison:', error.message);
    res.status(500).json({ status: 'error', message: error.message });
  }
};



