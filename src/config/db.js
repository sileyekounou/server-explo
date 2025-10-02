const mongoose = require('mongoose')
require('dotenv').config()
const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI
    await mongoose.connect(uri, {
      serverApi: {
        version: '1',
        strict: true,
        deprecationErrors: true,
      },
    })
    await mongoose.connection.db.admin().command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!',
    )
  } catch (error) {
    console.error('MongoDB connection error:', error)
    process.exit(1)
  }
}
module.exports = connectDB