# middle-run

[![Greenkeeper badge](https://badges.greenkeeper.io/thetalecrafter/middle-run.svg)](https://greenkeeper.io/)

> Run a series of async middleware functions on both client and server.

[![npm Version][npm-image]][npm]
[![Build Status][build-image]][build]
[![JS Standard Style][style-image]][style]
[![MIT License][license-image]][LICENSE]

middle-run is a simple library to compose and run ES7 async functions in order. This allows you to build out a process in a manner similar to [Connect][connect], only not necessarily specific to fulfilling a request on a server. middle-run can be used on both client and server.


Quick Example
-------------

`npm install middle-run --save`

```js
import run from 'middle-run'

run([
  // middleware can be synchronous
  function (step) {
    // the namespace object is always passed as the first argument
    // the context property is shared across all middleware functions
    step.context.foo = 'bar'
    // the next middleware is automatically run after this completes
  },
  // async functions can be used for a "true" middleware
  async function ({ context, next }) {
    let start = Date.now()
    // next causes the next middleware to begin
    await next()
    // after awaiting next() to resolve, all downstream middleware are done
    context.duration = Date.now() - start
  },
  // since run returns a function with the same signature of middleware
  // you can compose multiple together if needed
  run([
    ({ resolve }) => {
      // all info is passed in the first argument, no need for `this`
      // resolve() prevents further downstream middleware from running
      // you can optionally resolve to a particular value,
      // the top-level promise will resolve to this value
      resolve('someValue')
    }
  ]),
  () => {
    // this won't run because `resolve()` was called
  }

// run returns a function with the same signature as a middleware function
// to start the series, pass in the desired context object
// you can optionally pass in functions that are called when the series completes
// and when the series is stopped
])({ context: {}, next() {}, resolve() {} })
```


API
---

### run

```js
import run from 'middle-run'
// or var run = require('middle-run')

run(middleware)({ context: {}, extra: 'stuff' })
  .then(function (value) {})
```

`run` is a function that takes an array of middleware functions, and returns a middleware function. Run the series of middleware by calling the function, and optionally pass in an object with properties to add to the argument given to each middleware.

### middleware function

```js
run([
  async ({ context, next, resolve }) => {
    let v1 = await next()
    let v2 = await resolve('foo')
    v1 === 'foo' // true
    v2 === 'foo' // true
  }
])
```

Each middleware function recieves a single object argument containing a `context` object, a `next` function, and a `resolve` function. Properties of the object passed to the function returned from run will also be added to the object passed.

### context

By default, the context is an object that is part of the middleware argument. The same object will be passed to each and every middleware that runs.

You can replace the default object with whatever you like by passing a `context` property to the top-level middleware returned by `run`.

Any properties added to the root argument object will not be carried to next middleware, so if you need something shared, `context` is the place to put it.

### next

Calling `next()` will immediately start the next middleware, and return a promise that will resolve to the value passed to `resolve` in a downstream middleware. When the promise resolves, all downstream middleware have completely finished running.

Control will continue upstream when this middleware returns (or resolves if it is an async function or returns a promise), or as soon as `resolve` is called.

`next` should only be called once, but if you do call `next` again in the same middleware function, it will simply return the same promise it did initially.

### resolve

Calling `resolve()` will allow control to flow back to the previous middleware, even if this middleware function hasn't completed. A value can be passed as the first argument, and will set the value to resolve the whole series with.

`resolve` returns a promise that will resolve to the final value, which may have been changed by upstream middleware.

Calling `resolve` will prevent any downstream middleware from running if called before this middleware has completed or `next` is called. If `next` is called after resolve, it will not trigger the next middleware, but will return a promise that resolves to the current value (last passed to `resolve`).


Async Middleware
----------------

middle-run can work with any promised-based async middleware, but it was designed specifically for ES7 async functions. Inspired by [koa][koa]'s `yield next`, middle-run allows you to `await next()` so you can `next()` "downstream" and the `await` for control to flow back "upstream".

This is a barebones middleware runner, and has no `use()` methods or other ways to build out the list of middlewares, nor any url routing logic. Expanding the argument object with properties passed in the object to the function returned by `run` hopefully is enough to make middle-run useful in building a router or app framework.


License
-------

This software is free to use under the MIT license. See the [LICENSE-MIT file][LICENSE] for license text and copyright information.


[npm]: https://www.npmjs.org/package/middle-run
[npm-image]: https://img.shields.io/npm/v/middle-run.svg
[build]: https://travis-ci.org/thetalecrafter/middle-run
[build-image]: https://img.shields.io/travis/thetalecrafter/middle-run.svg
[style]: https://github.com/feross/standard
[style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[license-image]: https://img.shields.io/npm/l/middle-run.svg
[connect]: https://github.com/senchalabs/connect
[koa]: http://koajs.com
[LICENSE]: https://github.com/thetalecrafter/middle-run/blob/master/LICENSE-MIT
