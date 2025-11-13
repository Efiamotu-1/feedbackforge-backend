const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

// SCHEMA
const feedbackSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      // required: [true, 'A feedback must include a customer name'],
      trim: true,
      minlength: [3, 'Customer name must have at least 3 characters'],
      maxlength: [100, 'Customer name must have less than 100 characters'],
    },
    email: {
      type: String,
      // required: [true, 'Email is required'],
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      // required: [true, 'Phone number is required'],
      validate: {
        validator: function (v) {
          return /^0[789][01]\d{8}$/.test(v); // Nigerian format: 080xxxxxxxx
        },
        message: 'Invalid Nigerian phone number format',
      },
    },
    serviceType: {
      type: String,
      // required: [true, 'Service type is required'],
      enum: {
        values: [
          'Branch Visit',
          'Mobile App',
          'ATM Service',
          'Online Banking',
          'Customer Service Call',
          'USSD Banking',
          'POS Transaction',
        ],
        message: 'Invalid service type',
      },
    },
    branch: {
      type: String,
      required: function () {
        return this.serviceType === 'Branch Visit';
      },
    },
    rating: {
      type: Number,
      required: [true, 'A feedback must include a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please include a comment in your feedback'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters long'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    accountNumber: {
      type: String,
      select: false, // for privacy
    },

    // ═══════════════════════════════════════════════════════════
    // AI ANALYSIS FIELDS - Enhanced for Dashboard Metrics
    // ═══════════════════════════════════════════════════════════
    
    // Basic Sentiment Analysis
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      index: true, // Index for fast filtering on dashboard
    },
    sentimentScore: {
      type: Number,
      min: [0, 'Sentiment score cannot be below 0'],
      max: [100, 'Sentiment score cannot exceed 100'],
      // Score interpretation: 0-30: Negative, 31-60: Neutral, 61-100: Positive
    },
    
    // Category Classification (for trend analysis)
    categories: {
      type: [String],
      enum: [
        'service_quality',
        'wait_time',
        'staff_behavior',
        'product_features',
        'pricing',
        'technical_issues',
        'security_concerns',
        'user_experience',
        'account_management',
        'transaction_issues',
      ],
      index: true, // Index for category-based filtering
    },
    
    // NEW: Emotion Detection (multiple emotions can be present)
    emotions: {
      type: [{
        type: String,
        enum: [
          'satisfied',
          'frustrated',
          'angry',
          'happy',
          'disappointed',
          'confused',
          'impressed',
          'anxious',
          'grateful',
          'concerned',
          'excited',
          'worried',
        ],
      }],
      default: [],
      // Helps identify emotional patterns across customer base
    },
    
    // NEW: Urgency Level (for prioritization on dashboard)
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      index: true, // Index for quick filtering of high-priority items
      // critical: Requires immediate attention (system down, security breach)
      // high: Needs response within 24 hours
      // medium: Should be addressed within 3-5 days
      // low: General feedback, no immediate action needed
    },
    
    // NEW: AI-Generated Actionable Insights
    actionableInsights: {
      type: String,
      maxlength: [500, 'Actionable insights cannot exceed 500 characters'],
      // AI provides specific recommendations for bank management
      // Example: "Technical team should investigate mobile app crashes on Android 14"
    },
    
    // NEW: AI Analysis Metadata
    aiAnalysisTimestamp: {
      type: Date,
      // Tracks when AI analysis was performed
    },
    aiModel: {
      type: String,
      default: 'gpt-4o',
      // Tracks which AI model was used for analysis
      // Useful for comparing model performance over time
    },
    aiConfidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      // AI's confidence in its analysis (higher = more certain)
    },

    // FRAUD DETECTION FIELDS
    trustScore: {
      type: Number,
      default: 100,
      min: [0, 'Trust score cannot be below 0'],
      max: [100, 'Trust score cannot exceed 100'],
    },
    authenticityScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    fraudFlags: [String],
    verificationStatus: {
      type: String,
      enum: ['verified', 'phone_verified', 'unverified', 'suspicious'],
      default: 'unverified',
    },

    // METADATA
    ipAddress: String,
    deviceFingerprint: String,
    userAgent: String,
    submissionMetadata: mongoose.Schema.Types.Mixed,

    // STATUS & RESPONSES
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
    responses: [
      {
        message: String,
        respondedBy: String,
        respondedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    internalNotes: [
      {
        note: String,
        addedBy: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // SYSTEM FIELDS
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: Date,
    referenceNumber: {
      type: String,
      unique: true,
    },
    slug: String,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// ─── VIRTUALS ───────────────────────────────────────────────────────────────────
// Virtual properties for easy access on dashboard
//

// Check if feedback is positive
feedbackSchema.virtual('isPositive').get(function () {
  return this.sentiment === 'positive';
});

// Check if feedback is negative (requires attention)
feedbackSchema.virtual('isNegative').get(function () {
  return this.sentiment === 'negative';
});

// Check if feedback is urgent (for priority queue)
feedbackSchema.virtual('isUrgent').get(function () {
  return this.urgency === 'high' || this.urgency === 'critical';
});

// Check if feedback needs immediate action
feedbackSchema.virtual('needsImmediateAction').get(function () {
  // Critical urgency OR negative sentiment with low rating
  return this.urgency === 'critical' || (this.sentiment === 'negative' && this.rating <= 2);
});

// Get sentiment category based on score
feedbackSchema.virtual('sentimentCategory').get(function () {
  if (!this.sentimentScore) return 'unknown';
  if (this.sentimentScore >= 70) return 'very positive';
  if (this.sentimentScore >= 50) return 'positive';
  if (this.sentimentScore >= 30) return 'neutral';
  if (this.sentimentScore >= 10) return 'negative';
  return 'very negative';
});

// Calculate days since submission (for tracking response time)
feedbackSchema.virtual('daysSinceSubmission').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// Check if feedback is overdue for response
feedbackSchema.virtual('isOverdue').get(function () {
  const days = this.daysSinceSubmission;
  if (this.urgency === 'critical') return days > 1;
  if (this.urgency === 'high') return days > 2;
  if (this.urgency === 'medium') return days > 5;
  return days > 14; // Low priority
});

//
// ─── DOCUMENT MIDDLEWARE ───────────────────────────────────────────────────────
//

// Auto-slugify for easy URL usage
feedbackSchema.pre('save', function (next) {
  if (this.customerName) {
    this.slug = slugify(this.customerName + '-' + Date.now(), { lower: true });
  }

  // Auto-generate a unique reference number e.g., FB202511110001
  if (!this.referenceNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.referenceNumber = `FB${new Date().getFullYear()}${timestamp}`;
  }

  this.updatedAt = Date.now();
  next();
});

//
// ─── QUERY MIDDLEWARE ──────────────────────────────────────────────────────────
//

// Hide fraudulent or closed feedback from public queries
feedbackSchema.pre(/^find/, function (next) {
  this.find({ status: { $ne: 'closed' } });
  this.start = Date.now();
  next();
});

feedbackSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start}ms and returned ${docs.length} docs`);
  next();
});

//
// ─── AGGREGATION MIDDLEWARE ─────────────────────────────────────────────────────
//
feedbackSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { status: { $ne: 'closed' } } });
  next();
});

//
// ─── DATABASE INDEXES ───────────────────────────────────────────────────────────
// Compound indexes for optimal dashboard query performance
//

// Basic single field indexes (already defined inline above):
// - sentiment (index: true)
// - urgency (index: true)
// - categories (index: true)

// Compound indexes for common dashboard queries
feedbackSchema.index({ createdAt: -1 }); // Sort by newest first
feedbackSchema.index({ sentiment: 1, createdAt: -1 }); // Sentiment trends over time
feedbackSchema.index({ serviceType: 1, sentiment: 1 }); // Service performance analysis
feedbackSchema.index({ urgency: 1, status: 1, createdAt: -1 }); // Priority queue
feedbackSchema.index({ branch: 1, sentiment: 1, createdAt: -1 }); // Branch performance
feedbackSchema.index({ rating: 1, sentiment: 1 }); // Rating vs sentiment correlation
feedbackSchema.index({ status: 1, createdAt: -1 }); // Status tracking
feedbackSchema.index({ referenceNumber: 1 }, { unique: true }); // Ensure unique reference

// Text index for search functionality (optional but useful)
feedbackSchema.index({ 
  comment: 'text', 
  customerName: 'text',
  actionableInsights: 'text'
}, {
  weights: {
    comment: 10,          // Highest priority for search
    actionableInsights: 5, // Medium priority
    customerName: 1       // Lowest priority
  },
  name: 'feedback_text_search'
});

//
// ─── MODEL EXPORT ───────────────────────────────────────────────────────────────
//
const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
