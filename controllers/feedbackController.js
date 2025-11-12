const fs = require('fs')
const Feedback = require('./../models/feedbackModel')
const APIFeatures = require('./../utils/apiFeatures')



// exports.aliasTopTours = (req, res, next) => {
//     req.query.limit = '5',
//         req.query.sort = '-ratingsAverage, price'
//     req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
//     next()
// }

// exports.getTourStats = catchAsync(async (req,res,next) => {
//         const stats = await Tour.aggregate([
//             {$match: { ratingsAverage : { $gte: 4.5}}},
//             { $group : {
//                 _id: {$toUpper: '$difficulty'},
//                 numRatings: {$sum: '$ratingsQuantity'},
//                 avgRating: {$avg: '$ratingsAverage'},
//                 avgPrice: {$avg: '$price'},
//                 minPrice: {$min: '$price'},
//                 maxPrice: {$max: '$price'},
//                 numTours: {$sum: 1}
//             }},
//             {$sort: {avgPrice: 1}},
//             // cd {$match: {_id: { $ne: 'EASY'}}}
//         ])
//         res.status(200).json({
//             status: 'success',
//             data: {
//                 stats
//             }
//         }) 
// })

// exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    
//         const year  = req.params.year * 1
//         const plan = await Tour.aggregate([

//             {
//                 $unwind: '$startDates'
//             },
//             {
//                 $match: { startDates: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } }
//             },
//             {
//                 $group: {
//                     _id: { $month: '$startDates' },
//                     numTourStarts: { $sum: 1 },
//                     tours: { $push: '$name' }
//                 }
//             },
//             { $addFields: { month: '$_id' } },
//             {
//                 $project: {
//                     _id: 0
//                 }
//             },
//             {
//                 $sort: { numTourStarts: -1 }
//             },
//             {
//                 $limit: 12
//             }
           
//         ])

//         res.status(200).json({
//             status: 'success',
//             data: {
//                 plan
//             }
//         })

    
// })

exports.getAllFeedback = async (req, res, next) => {
    try {
        // BUILD QUERY
        // 1A) Filtering
        // const queryObj = {...req.query}
        // const excludedFields = ['page', 'sort', 'limit', 'fields', 'search']
        // excludedFields.forEach(el => delete queryObj[el])
        // console.log(req.query)

        // // 1B) Advanced Filtering
        // let queryStr = JSON.stringify(queryObj)
        // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

        // let query = Tour.find(JSON.parse(queryStr))

        // 2) Sorting
        // if(req.query.sort) {
        //     const sortBy = req.query.sort.split(',').join(' ')
        //     query = query.sort(sortBy)
        // }else {
        //     query = query.sort('_id')
        // }

        // 3) Field Limiting

        // if(req.query.fields) {
        //     const fields = req.query.fields.split(',').join(' ')
        //     query = query.select(fields)
        // } else {
        //     query = query.select('-__v')
        // }

        // 4) Pagination
        // const page = req.query.page * 1 || 1
        // const limit = req.query.limit * 1 || 100
        // const skip = (page - 1) * limit

        // query = query.skip(skip).limit(limit)

        // if(req.query.page) {
        //     const numTours = await Tour.countDocuments()
        //     if(skip >= numTours) throw new Error('This page does not exist')
        // }

        // 5) Searching - Search across multiple fields
        // if(req.query.search) {
        //     const searchRegex = { $regex: req.query.search, $options: 'i' };
        //     query = query.find({
        //         $or: [
        //             { name: searchRegex },
        //             { summary: searchRegex },
        //             { description: searchRegex },
        //             { difficulty: searchRegex }
        //         ]
        //     });
        // }


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

exports.createFeedback = async (req, res, next) => {
try{    
        const newFeedback = await Feedback.create(req.body)
        res.status(201).json({
            status: 'success',
            data: {
                feedback: newFeedback
            }
        }) 
} catch (err) {
    res.status(404).json({
        status: "fail",
        message: err.message
    })
}
}

exports.updateFeedback = async (req, res, next) => {
try{
        const feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

         if(!feedback) {
            return next(new AppError('No feedback found with that ID', 404))
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
