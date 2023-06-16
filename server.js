import express from 'express'
import { router } from './router.js'

// create an express app and use JSON
const app = new express()
app.use(express.json())

// bring in the router
app.use('/', router)

// setup the root level GET to return name and version from package.json
app.get('/', (req, res) => {
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

// start listening
app.listen(8080)
