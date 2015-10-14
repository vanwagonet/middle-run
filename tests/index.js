import run from '..'
import test from 'blue-tape'

test('middleware should run in order', t => {
  let index = 0
  return run([
    () => t.equal(++index, 1, 'must run the middleware in order'),
    () => t.equal(++index, 2, 'must run the middleware in order'),
    () => t.equal(++index, 3, 'must run the middleware in order')
  ])
})

test('stop running middleware after stop()', t => run([
  (ctx, next, stop) => { stop() },
  () => t.fail('calling stop must stop the next middleware from running')
]))

test('next should invoke the next middleware', t => {
  let index = 0
  return run([
    async (ctx, next) => {
      t.equal(++index, 1, 'mothing is run before the first middleware')
      await next()
      t.equal(++index, 4, 'after await next() should run after all other middleware')
    },
    () => t.equal(++index, 2, 'next middleware is run on next()'),
    () => t.equal(++index, 3, 'all other middleware should run before next() resolves')
  ])
})

test('all middleware get same context', t => {
  let shared
  return run([
    ctx => { shared = ctx },
    async (ctx, next) => {
      t.equal(ctx, shared, 'each middleware should recieve the same context')
      await next()
      t.equal(ctx.added, 'added', 'context mutations should be visible after next')
    },
    ctx => { ctx.added = 'added' },
    ctx => {
      t.equal(ctx, shared, 'later middleware should recieve the same context')
    }
  ])
})

test('a thrown error makes the returned promise reject', async (t) => {
  try {
    await run([
      () => { throw new Error('test') }
    ]).then(
      () => t.fail('thrown error must not cause the promise to resolve'),
      err => t.equal(err.message, 'test', 'thrown error must be passed to catch')
    )
  } catch (err) {
    t.fail('an error in a middleware must be caught by the run() promise')
  }
})
