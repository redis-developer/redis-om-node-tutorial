import { Router } from 'express'

let router = Router()

router.get('/', (req, res) => {
  res.type('application/json')
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

export default router
