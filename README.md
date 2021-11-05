# Up and Running with Express and Redis OM for Node.js in 5-minutes

OK. So that title is a bold claim. And this is a read-and-follow-along sort of tutorial. So, it might be 6 minutes or 4 minutes depending on how fast you type. Regardless, this should get you building something useful quickly and could make a nice foundation for something bigger.

## Let's Build Something

So, what are we going to build? We're going to build a RESTful service that lets you manage songs. It'll let you do all the CRUD things (that's create, read, update, and delete for the uninitiated) with songs. Plus, we'll add some cool search endpoints to the service as well. That way, we can find songs by an artist or genre, from a particular year, or with certain lyrics.

Test data for this problem was a little tricky. Most song lyrics are copyrighted and getting permission to use them for a little old tutorial wasn't really an option. And we definitely want to be able to search on song lyrics. How else are we going to find that songs that goes "oooo ah ah ah ah"?

Fortunately, my buddy [Dylan Beattie](https://dylanbeattie.net/) is literally the original [rockstar developer](https://github.com/RockstarLang/rockstar). In addition to coding cool things, he writes [parody songs](https://dylanbeattie.net/music/) with a tech theme. And, he has given me permission to use them as test data.

## Humble Beginings

We're using Redis as our database—that's the whole idea behind Redis OM. So, you'll need some Redis, specifically with [RediSearch][redisearch-url] and [RedisJSON][redis-json-url] installed. The easiest way to do this is to set up a free [Redis Cloud][redis-cloud-url] instance. But, you can also use Docker:

    $ docker run -p 6379:6379 redislabs/redismod:preview

I'm assuming you are relatively Node.js savvy so you should be able to get that installed on your own. We'll be using the _top-level await_ feature for modules that was introduced in Node v14.8.0 so do make sure you have that version, or a newer one. If you don't, go and get it.

Once you have that, it's time to create a project:

    $ npm init

Give it a name, version, and description. Use whatever you like. I called mine "Metalpedia".

Install [Express](https://expressjs.com/) and Redis OM for Node.js:

    $ npm install express redis-om --save

And, just to make our lives easy, we'll use [nodemon](https://nodemon.io/):

    $ npm install nodemon --save-dev

Now that stuff is installed, let's set up some other details in our `package.json`. First, set the "type" to "module", so we can use ES6 Modules:

```json
  "type": "module",
```

The "test" script that `npm init` generates isn't super useful for us. Replace that with a "start" script that calls `nodemon`. This will allow the service we build to restart automatically whenever we change a file. Very convenient:

```json
  "scripts": {
    "start": "nodemon server.js"
  },
```

I like to make my packages private, so they don't accidentally get pushed to NPM:

```json
  "private": true,
```

Oh, and you don't need the "main" entry. We've not building a package to share. So go ahead and remove that.

Now, you should have a `package.json` that looks something like this:

```json
{
  "name": "metalpedia",
  "version": "1.0.0",
  "description": "Sample application for building a music repository backed by Redis and Redis OM.",
  "type": "module",
  "scripts": {
    "start": "nodemon server.js"
  },
  "author": "Guy Royse <guy@guyroyse.com> (http://guyroyse.com/)",
  "license": "MIT",
  "private": true,
  "dependencies": {
    "express": "^4.17.1",
    "redis-om": "^0.1.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.14"
  }
}
```

Excellent. Set up done. Let's write some code!

## Getting the Express Service Up and Running

I like to write my services with a little version and name endpoint at the root. That way if some random developer hits the site of the service, they'll get a clue as to what it is. So let's do that:



```javascript
import express from 'express'
import rootRouter from './lib/routers/root-router.js'

let app = new express()
app.use(express.json())
app.use('/', rootRouter)
app.listen(8080)
```

```javascript
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
```

## Mapping Redis to JavaScript



## Using Redis OM for CRUD Operations

## Searching with Redis OM

