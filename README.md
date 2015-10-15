# middle-run

> Run a series of async middleware on both client and server.

[![npm Version][npm-image]][npm]
[![Build Status][build-image]][build]
[![JS Standard Style][style-image]][style]
[![MIT License][license-image]][LICENSE]

[![Dependency Status][deps-image]][deps]
[![Dev Dependency Status][dev-deps-image]][dev-deps]


Quick Start
-----------

`npm install middle-run --save` adds the library to `node_modules`. You can then use it as follows:

```js
import run from 'middle-run'

run([
  function (ctx) {
    // middleware can be synchronous
    // the context object is always passed as the first argument
    ctx.foo = 'bar'
    // the next middleware is automatically run after this completes
  },
  async function (ctx, next) {
    // async functions can be used for a "true" middleware
    let start = Date.now()
    // next causes the next middleware to begin
    await next()
    // after awaiting next() to resolve, all downstream middleware are done
    ctx.duration = Date.now() - start
  },
  // since run returns a function with the same signature of middleware
  // you can compose multiple together if needed
  run([
    (ctx, next, stop) => {
      // all info is passed as arguments, no need for `this`
      // stop() prevents further downstream middleware from running
      stop()
    }
  ]),
  () => {
    // this middleware won't run because `stop()` was called
  }

// run returns a function with the same signature as a middleware function
// to start the series, pass in the desired context object
// you can optionally pass in functions that are called when the series completes
// and when the series is stopped
])(context, function onComplete () {}, function onStop () {})
```


API
---

```
module "middle-run" = (middleware: Array<Middleware>) => Middleware
type Middleware = (context: any, next: Function, stop: Function) => ?Promise
```


Async Middleware
----------------

middle-run can work with any promised-based async middleware, but it was
designed specifically for ES7 async functions. Inspired by [koa][koa]'s
`yield next`, middle-run allows you to `await next()` so you can `next()`
"downstream" and the `await` for control to flow back "upstream".

This is a barebones middleware runner, and has no `use()` methods or other ways
to build out the list of middlewares, nor any url routing logic. The shared
context object should be enough to use middle-run in building a router or app
framework.


License
-------

This software is free to use under the MIT license. See the [LICENSE-MIT file][LICENSE] for license text and copyright information.


[npm]: https://www.npmjs.org/package/middle-run
[npm-image]: https://img.shields.io/npm/v/middle-run.svg
[deps]: https://david-dm.org/thetalecrafter/middle-run
[deps-image]: https://img.shields.io/david/thetalecrafter/middle-run.svg
[dev-deps]: https://david-dm.org/thetalecrafter/middle-run#info=devDependencies
[dev-deps-image]: https://img.shields.io/david/dev/thetalecrafter/middle-run.svg
[build]: https://travis-ci.org/thetalecrafter/middle-run
[build-image]: https://img.shields.io/travis/thetalecrafter/middle-run.svg
[style]: https://github.com/feross/standard
[style-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[license-image]: https://img.shields.io/npm/l/middle-run.svg
[koa]: http://koajs.com
[LICENSE]: https://github.com/thetalecrafter/middle-run/blob/master/LICENSE-MIT
