// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ROUTES - Dashboard API Endpoints
// ═══════════════════════════════════════════════════════════════════════════

const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// All analytics routes require authentication
// Only admin, super-admin, and branch-admin can access analytics
// ═══════════════════════════════════════════════════════════════════════════

// Apply authentication to all routes in this router
router.use(protect);
router.use(restrictTo('admin', 'super-admin', 'branch-admin'));

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// 1. Sentiment Overview
// GET /api/v1/analytics/sentiment-overview
// Query params: ?startDate=2025-01-01&endDate=2025-12-31&serviceType=Mobile App&branch=Victoria Island
router.get('/sentiment-overview', analyticsController.getSentimentOverview);

// 2. Service Type Performance
// GET /api/v1/analytics/service-metrics
// Query params: ?startDate=2025-01-01&endDate=2025-12-31
router.get('/service-metrics', analyticsController.getServiceTypeMetrics);

// 3. Sentiment Trends Over Time
// GET /api/v1/analytics/trends
// Query params: ?period=daily&days=30
// period: hourly, daily, weekly, monthly
router.get('/trends', analyticsController.getSentimentTrends);

// 4. Category Analysis
// GET /api/v1/analytics/categories
// Query params: ?startDate=2025-01-01&endDate=2025-12-31&minCount=5
router.get('/categories', analyticsController.getCategoryInsights);

// 5. Emotion Analysis
// GET /api/v1/analytics/emotions
// Query params: ?startDate=2025-01-01&endDate=2025-12-31&serviceType=Mobile App
router.get('/emotions', analyticsController.getEmotionAnalysis);

// 6. Urgency Dashboard (Priority Queue)
// GET /api/v1/analytics/urgency
router.get('/urgency', analyticsController.getUrgencyDashboard);

// 7. Pulse Metrics (CSAT, NPS, CES)
// GET /api/v1/analytics/pulse
// Query params: ?days=30
router.get('/pulse', analyticsController.getPulseMetrics);

// 8. Actionable Insights
// GET /api/v1/analytics/insights
// Query params: ?limit=10&urgency=high&serviceType=Mobile App
router.get('/insights', analyticsController.getActionableInsights);

// 9. Branch Comparison
// GET /api/v1/analytics/branches
router.get('/branches', analyticsController.getBranchComparison);

module.exports = router;


