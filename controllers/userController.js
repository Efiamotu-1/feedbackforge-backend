const User = require('../models/userModel')

exports.getAllUsers = async (req,res) => {
   try{
     const users = await User.find();

        res.status(200).json({
            status: 'success',
            requestedAt: req.requestTime,
            results: users.length,
            data: {
                users
            }
        })
        
   } catch(err) {
    res.status(500).json({
        status: 'error',
        message: err.message
    });
   }
}

exports.createUser = (req, res) => {
    res.status(201).json({
        status: 'success',
        data: {
            user: {}
        }
    });
};