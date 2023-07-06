# Up and Running with Express and Redis OM for Node.js in 5-minutes

OK. So that title is a bold claim. And this is a read-and-follow-along sort of tutorial. So, it might be 6 minutes or 4 minutes depending on how fast you type. Regardless, this should get you building something useful quickly and could make a nice foundation for something bigger.

Oh, and you might be wondering what [Redis OM][redis-om] is. Well, there's an extensive [README][redis-om-readme] on GitHub. Go check it out!

Also, [this document](https://github.com/redis-developer/redis-om-node-tutorial/blob/main/README.md), and [the code](https://github.com/redis-developer/redis-om-node-tutorial) that we're about to implement, and [the data](https://github.com/redis-developer/redis-om-node-tutorial/tree/main/songs) needed to test it are all out on GitHub. Refer to them as you need.

## Let's Build Something

So, what are we going to build? We're going to build a RESTful service that lets you manage songs. It'll let you do all the CRUD things (that's create, read, update, and delete for the uninitiated) with songs. Plus, we'll add some cool search endpoints to the service as well. That way, we can find songs by an artist or a genre, from a particular year, or with certain lyrics.

Test data for this problem was a little tricky. Most song lyrics are copyrighted and getting permission to use them for a little old tutorial wasn't really an option. And we definitely want to be able to search on song lyrics. How else are we going to find that song that goes "oooo ah ah ah ah"?

Fortunately, my buddy [Dylan Beattie][dylan-beattie] is literally the original [Rockstar developer][rockstar]. In addition to coding cool things, he writes [parody songs][dylan-beattie-music] with tech themes. And, more importantly, he has given me permission to use them as test data.

## Humble Beginnings

We're using Redis as our database—that's the whole idea behind Redis OM. So, you'll need some Redis, specifically with [Search][redis-search] and [JSON][redis-json] capabilities. I usually use [Redis Stack][redis-stack] for this and the easiest way to do this is to set up a free [Redis Cloud][redis-cloud] instance. But, you can also use Docker:

```bash
$ docker run -p 6379:6379 redis/redis-stack:latest
```

I'm assuming you are relatively Node.js savvy so you should be able to get that installed on your own. We'll be using the _top-level await_ feature for modules that was introduced in Node.js v14.8.0 so do make sure you have that version, or a newer one. If you don't, go and get it.

Once you have that, it's time to create a project:

```bash
$ npm init
```

Give it a name, version, and description. Use whatever you like. I called mine "Metalpedia".

Install [Express][express], [Node Redis][node-redis], and [Redis OM][redis-om]:

```bash
$ npm install express redis redis-om
```

And, just to make our lives easy, we'll use [nodemon][nodemon]:

```bash
$ npm install nodemon --save-dev
```

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

Oh, and you don't need the "main" entry. We're not building a package to share. So go ahead and remove that.

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
    "express": "^4.17.3",
    "redis": "^4.6.7",
    "redis-om": "^0.4.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

Excellent. Set up done. Let's write some code!

## Getting the Express Service Up and Running

I like to write my services with a little version and name endpoint at the root. That way if some random developer hits the site of the service, they'll get a clue as to what it is. It also acts as a nice [tracer bullet][tracer-bullet] to make sure things are working. So let's do that:

Create a file named `server.js` in the root of your project folder and populate it thus:

```javascript
import express from 'express'

// create an express app and use JSON
const app = new express()
app.use(express.json())

// setup the root level GET to return name and version from package.json
app.get('/', (req, res) => {
  res.send({
    name: process.env.npm_package_name,
    version: process.env.npm_package_version
  })
})

// start listening
app.listen(8080)
```

We now have enough to actually run something. So let's run it:

```bash
$ npm start
```

Then, hit `http://localhost:8080/` in your favorite browser. You should see something like this:

```json
{
  "name": "metalpedia",
  "version": "1.0.0"
}
```

Or, hit your service using `curl` (and [`jq`][jq] if you want to be fancy):

```bash
$ curl -X GET http://localhost:8080 -s | jq
{
  "name": "metalpedia",
  "version": "1.0.0"
}
```

Cool. Let's add some Redis.

## Connecting to Redis

First, we need to connect to Redis. We'll connect to Redis once using Node Redis and use this connection for all of our interactions with Redis.

Create a file names `redis.js` in the root of your project folder. In it, you need to import the `createClient` function and then call it to create a connection. Then, handle any errors (just as a precaution) and connect:

```javascript
import { createClient } from 'redis'

export const redis = createClient()
redis.on('error', (error) => console.error(error))
await redis.connect()
```

> Remember that _top-level await_ stuff I mentioned at the top of the document? There it is!

Note that we are exporting the opened Redis connection so that we can use it in the next step.

## Mapping Songs to Redis

We're going to use Redis OM to map data for songs from JSON documents in Redis to JavaScript objects in Node.js.

Create a file named `repository.js` in the root of your project folder. In it, you need to import the Redis connection you just created and all the parts from Redis OM that you'll need:

```javascript
import { Schema, Repository } from 'redis-om'
import { redis } from './redis.js'
```

Schemas define the properties on your JavaScript, their types, and how they are mapped internally to Redis. Here's a `Schema` that maps the properties for a song:

```javascript
const schema = new Schema('song', {
  title: { type: 'string' }, // the title of the song
  artist: { type: 'string' }, // who performed the song
  genres: { type: 'string[]' }, // array of strings for the genres of the song
  lyrics: { type: 'text' }, // the full lyrics of the song
  music: { type: 'text' }, // who wrote the music for the song
  year: { type: 'number' }, // the year the song was releases
  duration: { type: 'number' }, // the duration of the song in seconds
  link: { type: 'string' } // link to a YouTube video of the song
})
```

Now that we have connection to Redis and a `Schema`, we need to create a `Repository`. Repositories are the main interface into Redis OM. They give us the methods to read, write, and remove entities. Create a repository—and make sure it's exported as you'll need it when we get into the Express stuff:

```javascript
export const songRepository = client.fetchRepository(schema, redis)
```

We're almost done with setting up our repository. But we still need to create an index or we won't be able to search on anything. We do that by calling `.createIndex`. If an index already exists and it's the same, this function won't do anything. If it is different, it'll drop it and create a new one. In a real environment, you'd probably want to create your index as part of CI/CD. But we'll just cram them into our main code for this example:

```javascript
await songRepository.createIndex()
```

Now we have what we need to talk to Redis. Now, let's use it to make some routes in Express.

## Using Redis OM to Write, Read, and Remove

Let's create a truly RESTful API that used PUT, GET, and DELETE to upsert, fetch, and remove songs. We're going to do this using [Express Routers][express-routers] as this makes our code nice and tidy. So, create a file called `router.js` in the root of your project folder. Then add the imports and create a `Router`:

```javascript
import { Router } from 'express'
import { EntityId } from 'redis-om'

import { songRepository as repository } from './repository.js'

export const router = Router()
```

This router needs to be added in `server.js` under the `/song` path so let's do that next. Add the following line of code to at the top of `server.js`—with all the other imports—to import the song router:

```javascript
import { router } from './router.js'
```

Also add a line of code to call `.use` so that the router we are about to implement is, well, used:

```javascript
app.use('/', router)
```

Our `server.js` should now look like this:

```javascript
import express from 'express'
import { router } from './router.js'

// create an express app and use JSON
let app = new express()
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
```

### Add a Create Route

Now, let's start putting some routes in our `song-router.js`. We'll create a song first as you need to have songs in Redis before you can do any of the reading or deleting of them. Add the PUT route below. This route will call `.save` to create or replace a JSON document with the provided ID and then get that ID out of the returned song and return it:

```javascript
router.put('/:id', async (req, res) => {

  // save the song under the provided id, will overwrite if it already exists
  const song = await repository.save(req.params.id, req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})
```

Now that we have a way to shove songs into Redis, let's start shoving. Out on GitHub, there are a bunch of [JSON files](https://github.com/redis-developer/redis-om-node-tutorial/tree/main/songs) with song data in them. (Thanks [Dylan][dylan-beattie]!) Go ahead and pull those down and place them in a folder under your project root called `songs`.

Let's use `curl` to load in a song into a provided ID. I'm partial to [_HTML_](https://www.youtube.com/watch?v=woKUEIJkwxI), sung to the tune of AC/DC's _Highway to Hell_, so let's use that one:

```bash
$ curl -X PUT -H "Content-Type: application/json" -d "@songs/html.json" http://localhost:8080/song/12345 -s | jq
```

You should get back the ID of that newly inserted song:

```json
{
  "id" : "12345"
}
```

We're shipping HTML indeed. If you have the `redis-cli` handy—or want to use [RedisInsight][redis-insight]—you can take a look and see how Redis has stored this:

```bash
> json.get song:12345
"{\"title\":\"HTML\",\"artist\":\"Dylan Beattie and the Linebreakers\",\"genres\":[\"blues rock\",\"hard rock\",\"parody\",\"rock\"],\"lyrics\":\"W3C, RFC, a JIRA ticket and a style guide.\\\\nI deploy with FTP, run it all on the client side\\\\nDon\xe2\x80\x99t need Ruby, don\xe2\x80\x99t need Rails,\\\\nAin\xe2\x80\x99t nothing running on my stack\\\\nI\xe2\x80\x99m hard wired, for web scale,\\\\nYeah, I\xe2\x80\x99m gonna bring the 90s back\\\\n\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML,\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML\xe2\x80\xa6\\\\n\\\\nNo logins, no trackers,\\\\nNo cookie banners to ignore\\\\nI ain\xe2\x80\x99t afraid of, no hackers\\\\nJust the occasional 404\\\\nThey hatin\xe2\x80\x99, what I do,\\\\nBut that\xe2\x80\x99s \xe2\x80\x98cos they don\xe2\x80\x99t understand\\\\nMark it up, break it down,\\\\nRemember to escape your ampersands\xe2\x80\xa6\\\\n\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML,\\\\nI\xe2\x80\x99m shipping HTML,\\\\nHTML\xe2\x80\xa6\\\\n\\\\n(But it\xe2\x80\x99s really just markdown.)\",\"music\":\"\\\"Highway to Hell\\\" by AC/DC\",\"year\":2020,\"duration\":220,\"link\":\"https://www.youtube.com/watch?v=woKUEIJkwxI\"}"
```

Yep. Looks like JSON.

### Add a Read Route

Create down, let's add a GET route to read this song from HTTP instead of using the `redis-cli`:

```javascript
router.get('/:id', async (req, res) => {
  // fetch the song and return it
  const song = await repository.fetch(req.params.id)
  res.send(song)
})
```

Now you can use `curl` or your browser to load `http://localhost:8080/song/12345` to fetch the song:

```bash
$ curl -X GET http://localhost:8080/song/12345 -s | jq
```

And you should get back the JSON for the song:

```json
{
  "title": "HTML",
  "artist": "Dylan Beattie and the Linebreakers",
  "genres": [
    "blues rock",
    "hard rock",
    "parody",
    "rock"
  ],
  "lyrics": "W3C, RFC, a JIRA ticket and a style guide.\\nI deploy with FTP, run it all on the client side\\nDon’t need Ruby, don’t need Rails,\\nAin’t nothing running on my stack\\nI’m hard wired, for web scale,\\nYeah, I’m gonna bring the 90s back\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\nNo logins, no trackers,\\nNo cookie banners to ignore\\nI ain’t afraid of, no hackers\\nJust the occasional 404\\nThey hatin’, what I do,\\nBut that’s ‘cos they don’t understand\\nMark it up, break it down,\\nRemember to escape your ampersands…\\n\\nI’m shipping HTML,\\nHTML,\\nI’m shipping HTML,\\nHTML…\\n\\n(But it’s really just markdown.)",
  "music": "\"Highway to Hell\" by AC/DC",
  "year": 2020,
  "duration": 220,
  "link": "https://www.youtube.com/watch?v=woKUEIJkwxI"
}
```

Now that we can read and write, let's delete!

### Add a Delete Route

And, finally, let's implement a DELETE route:

```javascript
router.delete('/:id', async (req, res) => {

  // delete the song with its id
  await repository.remove(req.params.id)

  // respond with OK
  res.type('application/json')
  res.send('"OK"')

})
```

And test it out:

```bash
$ curl -X DELETE http://localhost:8080/song/12345 -s | jq
"OK"
```

This just returns "OK", which is technically JSON but aside from the response header, is indistinguishable from plain text.

## Generating IDs When Saving

Sometimes you just want to add a song without deciding what the ID is in advance. Redis OM will happily generate and ID for you. This is how we're going to implement a POST which can be though of as adding a new song to our collection of songs.

Add the following code to `router.js`:

```javascript
router.post('/songs', async (req, res) => {

  // save the song using a generated id
  const song = await repository.save(req.body)

  // return the id of the song we just saved
  res.send({ id: song[EntityId] })

})
```

Note that this code is almost identical to the PUT operation—which is an upsert—with two key exceptions:

  1. We don't have an ID on the URL, or anywhere, really.
  2. We don't pass the ID we don't have into the `.save` function.

Let's try it out and add a song:

```bash
$ curl -X POST -H "Content-Type: application/json" -d "@songs/html.json" http://localhost:8080/songs -s | jq
```

You should get back the ID of that newly inserted song:

```json
{
  "id" : "01H32Y4WMMT1DT0DN5W61R9C8B"
}
```

This song will get in the way of the next step, however, so now that we have it, let's delete it:

```bash
$ curl -X DELETE http://localhost:8080/song/01H32Y4WMMT1DT0DN5W61R9C8B -s | jq
"OK"
```

## Searching with Redis OM

All the reading, writing, and whatnot is done. Let's add some search. Search is where Redis OM really starts to shine. We're going to create routes to:

  - Return all the songs, like, all of them.
  - Fetch songs for a particular artist, like "Dylan Beattie and the Linebreakers".
  - Fetch songs that are in a certain genre, like "rock" or "electronic".
  - Fetch songs between years, like all the songs from the 80s.
  - Fetch songs that have certain words in their lyrics, like "html" or "markdown".

### Load Songs into Redis

Before we get started, let's load up Redis with a bunch of songs—so we have stuff to search for. I've written a short shell script that loads all the song data on GitHub into Redis using the server we just made. It just calls `curl` in a loop. It's on GitHub, so go [grab it](https://github.com/redis-developer/redis-om-node-tutorial/blob/main/load-data.sh) and put it in your project root. Then run it:

```bash
$ ./load-data.sh
```

You should get something like:

```bash
{"id":"01FM310A8AVVM643X13WGFQ2AR"} <- songs/big-rewrite.json
{"id":"01FM310A8Q07D6S7R3TNJB146W"} <- songs/bug-in-the-javascript.json
{"id":"01FM310A918W0JCQZ8E57JQJ07"} <- songs/d-m-c-a.json
{"id":"01FM310A9CMJGQHMHY01AP0SG4"} <- songs/enterprise-waterfall.json
{"id":"01FM310A9PA6DK4P4YR275M58X"} <- songs/flatscreens.json
{"id":"01FM310AA2XTEQV2NZE3V7K3M7"} <- songs/html.json
{"id":"01FM310AADVHEZXF7769W6PQZW"} <- songs/lost-it-on-the-blockchain.json
{"id":"01FM310AASNA81Y9ACFMCGP05P"} <- songs/meetup-2020.json
{"id":"01FM310AB4M2FKTDPGEEMM3VTV"} <- songs/re-bass.json
{"id":"01FM310ABFGFYYJXVABX2YXGM3"} <- songs/teams.json
{"id":"01FM310ABW0ANYSKN9Q1XEP8BJ"} <- songs/tech-sales.json
{"id":"01FM310AC6H4NRCGDVFMKNGKK3"} <- songs/these-are-my-own-devices.json
{"id":"01FM310ACH44414RMRHPCVR1G8"} <- songs/were-gonna-build-a-framework.json
{"id":"01FM310ACV8C72Y69VDQHA12C1"} <- songs/you-give-rest-a-bad-name.json
```

Note that this script will not erase any data. So any songs that you have in there already will still be there, alongside these. And if you run this script more than once, it will gleefully add the songs a second time.

### Add Some Search Routes

Now we can add some search routes. We initiate a search by calling `.search` on our repository. Then we call `.where` to add any filters we want—if we want any at all. Once we've specified the filters, we call `.returnAll` to get all the matching entities.

Here's the simplest search—it just returns everything. Go ahead and add it to `router.js`:

```javascript
router.get('/songs', async (req, res) => {
  const songs = await repository.search().returnAll()
  res.send(songs)
})
```

Then try it out with `curl` or your browser:

```bash
$ curl -X GET http://localhost:8080/songs -s | jq
```

We can search for a specific field by calling `.where` and `.eq`. This route finds all songs by a particular artist. Note that you must specify the complete name of the artist for this to work:

```javascript
router.get('/songs/by-artist/:artist', async (req, res) => {
  const artist = req.params.artist
  const songs = await repository.search().where('artist').eq(artist).returnAll()
  res.send(songs)
})
```

Then try it out with `curl` or your browser too:

```bash
$ curl -X GET http://localhost:8080/songs/by-artist/Dylan%20Beattie -s | jq
```

Genres are stored as an array of strings. You can use `.contains` to see if the array contains that genre or not:

```javascript
router.get('/songs/by-genre/:genre', async (req, res) => {
  const genre = req.params.genre
  const songs = await repository.search().where('genres').contains(genre).returnAll()
  res.send(songs)
})
```

And try it out:

```bash
$ curl -X GET http://localhost:8080/songs/by-genre/rock -s | jq
$ curl -X GET http://localhost:8080/songs/by-genre/parody -s | jq
```

This route lets you get all the songs between two years. Great for finding all those 80s hits. Of course, all of Dylan's songs are more recent than that, so we'll go a little more narrow when we try it out:

```javascript
router.get('/songs/between-years/:start-:stop', async (req, res) => {
  const start = Number.parseInt(req.params.start)
  const stop = Number.parseInt(req.params.stop)
  const songs = await repository.search().where('year').between(start, stop).returnAll()
  res.send(songs)
})
```

And, try it out, of course:

```bash
$ curl -X GET http://localhost:8080/songs/between-years/2020-2021 -s | jq
```

Let's add the final route to find songs that have certain words in the lyrics using `.match`:

```javascript
router.get('/songs/with-lyrics/:lyrics', async (req, res) => {
  const lyrics = req.params.lyrics
  const songs = await repository.search().where('lyrics').match(lyrics).returnAll()
  res.send(songs)
})
```

We can try this out too, getting all the songs that contain both the words "html" and "markdown":

```bash
$ curl -X GET http://localhost:8080/songs/with-lyrics/html%20markdown -s | jq
```

## Wrapping Up

And that's a wrap. I've walked you through some of the basics with this tutorial. But you should totally go deeper. If you want to learn more, go ahead and check out [Redis OM for Node.js on GitHub][redis-om]. It explains the capabilities of Redis OM for Node.js in greater detail.

If you have any questions or are stuck, feel free to jump on the [Redis Discord][discord] server and ask there. I'm always hanging out and happy to help.

And, if you find a flaw, bug, or just think this tutorial could be improved, send a pull request or open an issue.

Thanks!


[redis-om]:             https://github.com/redis/redis-om-node
[redis-om-readme]:      https://github.com/redis/redis-om-node/blob/main/README.md
[redis-stack]:          https://redis.io/docs/stack/
[redis-cloud]:          https://redis.com/try-free/
[redis-insight]:        https://redis.com/redis-enterprise/redis-insight/
[redis-search]:               https://redis.io/docs/stack/search/
[redis-json]:                 https://redis.io/docs/stack/json/
[rockstar]:             https://github.com/RockstarLang/rockstar
[dylan-beattie]:        https://dylanbeattie.net/
[dylan-beattie-music]:  https://dylanbeattie.net/music/
[express]:              https://expressjs.com/
[express-routers]:      https://expressjs.com/en/4x/api.html#router
[node-redis]:           https://github.com/redis/node-redis
[nodemon]:              https://nodemon.io/
[tracer-bullet]:        https://pragprog.com/tips/
[jq]:                   https://jqlang.github.io/jq/
[discord]:              https://discord.gg/redis
