const express = require('express')
const { getAllFeedback, getFeedback, createFeedback, updateFeedback, deleteFeedback } = require('../controllers/feedbackController')
const {protect, restrictTo} = require('../controllers/authController')
const router = express.Router() 


router.route('/').get(protect, getAllFeedback).post(createFeedback)
router.route('/:id').get(getFeedback).patch(protect, restrictTo('admin', 'super-admin', 'branch-admin'), updateFeedback).delete(protect, restrictTo('admin', 'super-admin', 'branch-admin'), deleteFeedback)

module.exports = router