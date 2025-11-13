const fs = require('fs')
const Feedback = require('./../models/feedbackModel')
const APIFeatures = require('./../utils/apiFeatures')
const { analyzeFeedbackSentiment } = require('./../services/sentimentAnalysisService')





exports.getAllFeedback = async (req, res, next) => {
    try {
       
        // EXECUTE QUERY
        const features = new APIFeatures(Feedback.find(), req.query).filter().sort().limitFields().paginate()
        const feedbacks = await features.query

        res.status(200).json({
            status: 'success',
            requestedAt: req.requestTime,
            results: feedbacks.length,
            data: {
                feedbacks
            }
        })
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
}

exports.getFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id)


        if(!feedback) {
            return next(new AppError('No feedback found with that ID', 404))
        }

        res.status(200).json({
            status: 'success',
            requestedAt: req.requestTime,

            data: {
                feedback
            }
        })  
    } catch (err) {
        res.status(404).json({
            status: "fail",
            message: err.message
        })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CREATE FEEDBACK WITH AI SENTIMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
exports.createFeedback = async (req, res, next) => {
    try {
        console.log('\n' + '═'.repeat(70));
        console.log('📝 NEW FEEDBACK SUBMISSION');
        console.log('═'.repeat(70));

        const feedbackData = req.body;
        
        // Step 1: Create initial feedback document (without AI analysis)
        console.log('Step 1: Creating initial feedback document...');
        const feedback = new Feedback({
            ...feedbackData,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'pending',
        });

        // Step 2: Run AI sentiment analysis
        console.log('Step 2: Running AI sentiment analysis...');
        console.log(`   Comment: "${feedback.comment.substring(0, 60)}..."`);
        console.log(`   Rating: ${feedback.rating}/5`);
        
        try {
            const aiAnalysis = await analyzeFeedbackSentiment(
                feedback.comment,
                feedback.rating,
                feedback.serviceType
            );

            // Step 3: Attach AI insights to feedback
            console.log('Step 3: Attaching AI insights to feedback...');
            feedback.sentiment = aiAnalysis.sentiment;
            feedback.sentimentScore = aiAnalysis.sentimentScore;
            feedback.categories = aiAnalysis.categories;
            feedback.emotions = aiAnalysis.emotions || [];
            feedback.urgency = aiAnalysis.urgency;
            feedback.actionableInsights = aiAnalysis.actionableInsights;
            feedback.aiAnalysisTimestamp = new Date();
            feedback.aiModel = process.env.AI_MODEL || 'gpt-4o';
            feedback.aiConfidenceScore = aiAnalysis.confidenceScore;

            console.log('✅ AI Analysis Results:');
            console.log(`   ├─ Sentiment: ${aiAnalysis.sentiment} (${aiAnalysis.sentimentScore}/100)`);
            console.log(`   ├─ Categories: ${aiAnalysis.categories.join(', ')}`);
            console.log(`   ├─ Emotions: ${aiAnalysis.emotions.join(', ')}`);
            console.log(`   ├─ Urgency: ${aiAnalysis.urgency}`);
            console.log(`   └─ Confidence: ${aiAnalysis.confidenceScore}%`);

        } catch (aiError) {
            console.error('⚠️  AI Analysis failed, saving feedback without AI insights:', aiError.message);
            // Feedback will be saved without AI analysis if it fails
        }

        // Step 4: Save to database
        console.log('Step 4: Saving feedback to database...');
        await feedback.save();

        // Step 5: Check if urgent action needed
        if (feedback.isUrgent || feedback.needsImmediateAction) {
            console.log('🚨 ALERT: High-priority feedback detected!');
            console.log(`   Reference: ${feedback.referenceNumber}`);
            console.log(`   Urgency: ${feedback.urgency}`);
        }

        console.log('✅ Feedback saved successfully!');
        console.log(`   Reference Number: ${feedback.referenceNumber}`);
        console.log('═'.repeat(70) + '\n');

        // Step 6: Return response
        res.status(201).json({
            status: 'success',
            message: 'Feedback submitted successfully',
            data: {
                feedback: {
                    id: feedback._id,
                    referenceNumber: feedback.referenceNumber,
                    customerName: feedback.customerName,
                    rating: feedback.rating,
                    serviceType: feedback.serviceType,
                    comment: feedback.comment,
                    
                    // AI Analysis Results
                    sentiment: feedback.sentiment,
                    sentimentScore: feedback.sentimentScore,
                    categories: feedback.categories,
                    emotions: feedback.emotions,
                    urgency: feedback.urgency,
                    actionableInsights: feedback.actionableInsights,
                    
                    // Virtual properties
                    isNegative: feedback.isNegative,
                    isUrgent: feedback.isUrgent,
                    needsImmediateAction: feedback.needsImmediateAction,
                    sentimentCategory: feedback.sentimentCategory,
                    
                    // Metadata
                    createdAt: feedback.createdAt,
                    status: feedback.status,
                }
            }
        });
        
    } catch (err) {
        console.error('❌ Error creating feedback:', err.message);
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
}

exports.updateFeedback = async (req, res, next) => {
try{
        const feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

         if(!feedback) {
            throw new Error('No feedback found with that ID', 404)
        }

        res.status(200).json({
            status: "success",
            data: {
                feedback
            }
        })
    } catch (err) {
        res.status(404).json({
            status: "fail",
            message: err.message
        })
    }
}

exports.deleteFeedback = async (req, res, next) => {
try{
        const feedback = await Feedback.findByIdAndDelete(req.params.id)

         if(!feedback) {
            return next(new AppError('No feedback found with that ID', 404))
        }

        res.status(204).json({
            status: "success",
            data: null
        })
    } catch (err) {
        res.status(404).json({
            status: "fail",
            message: err.message
        })
    }
}
