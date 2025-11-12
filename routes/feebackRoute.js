const express = require('express')
const { getAllFeedback, getFeedback, createFeedback, updateFeedback, deleteFeedback } = require('../controllers/feedbackController')
const {protect, restrictTo} = require('../controllers/authController')
const router = express.Router() 

// router.param('id', checkID)

// router.route('/tour-stats').get(getTourStats)
// router.route('/top-5-cheap').get(aliasTopTours, getAllTours)
// router.route('/monthly-plan/:year').get(getMonthlyPlan)
router.route('/').get(protect, getAllFeedback).post(createFeedback)
router.route('/:id').get(getFeedback).patch(updateFeedback).delete(protect, restrictTo('admin', 'super-admin', 'branch-admin'), deleteFeedback)

module.exports = router