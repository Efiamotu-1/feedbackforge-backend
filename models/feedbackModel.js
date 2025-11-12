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

    // AI ANALYSIS FIELDS
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
    },
    sentimentScore: Number,
    categories: [String],

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
//
feedbackSchema.virtual('isPositive').get(function () {
  return this.sentiment === 'positive';
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
// ─── MODEL EXPORT ───────────────────────────────────────────────────────────────
//
const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;
