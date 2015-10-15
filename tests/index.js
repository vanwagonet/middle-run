import run from '..'
import test from 'blue-tape'

test('middleware should run in order', t => {
  let index = 0
  return run([
    () => t.equal(++index, 1, 'must run the middleware in order'),
    () => t.equal(++index, 2, 'must run the middleware in order'),
    run([
      () => t.equal(++index, 3, 'must run the middleware in order'),
      () => t.equal(++index, 4, 'must run the middleware in order')
    ]),
    () => t.equal(++index, 5, 'must run the middleware in order')
  ])()
})

test('stop running middleware after stop()', t => run([
  (ctx, next, stop) => { stop() },
  () => t.fail('calling stop must stop the next middleware from running')
])())

test('stop running parent middleware after stop()', t => run([
  run([ (ctx, next, stop) => { stop() } ]),
  () => t.fail('calling stop must stop the next parent middleware from running')
])())

test('next should invoke the next middleware', t => run([
  run([
    async (ctx, next) => {
      t.equal(++ctx.index, 1, 'mothing is run before the first middleware')
      await next()
      t.equal(++ctx.index, 4, 'after await next() should run after all other middleware')
    }
  ]),
  ctx => t.equal(++ctx.index, 2, 'next middleware is run on next()'),
  ctx => t.equal(++ctx.index, 3, 'all other middleware should run before next() resolves')
])({ index: 0 }))

test('all middleware get same context', t => {
  let shared = {}
  return run([
    async (ctx, next) => {
      t.equal(ctx, shared, 'each middleware should recieve the same context')
      await next()
      t.equal(ctx.added, 'added', 'context mutations should be visible after next')
    },
    run([
      ctx => t.equal(ctx, shared, 'nested middleware should recieve the same context'),
      ctx => { ctx.added = 'added' }
    ]),
    ctx => t.equal(ctx, shared, 'later middleware should recieve the same context')
  ])(shared)
})

test('a thrown error makes the returned promise reject', async (t) => {
  try {
    await run([
      () => { throw new Error('test') }
    ])().then(
      () => t.fail('thrown error must not cause the promise to resolve'),
      err => t.equal(err.message, 'test', 'thrown error must be passed to catch')
    )
  } catch (err) {
    t.fail('an error in a middleware must be caught by the run() promise')
  }
})

test('a thrown error in nested run makes the returned promise reject', async (t) => {
  try {
    await run([
      run([
        () => { throw new Error('nested') }
      ])
    ])().then(
      () => t.fail('thrown error must not cause the parent promise to resolve'),
      err => t.equal(err.message, 'nested', 'thrown error must be passed to the parent catch')
    )
  } catch (err) {
    t.fail('an error in a middleware must be caught by the top run() promise')
  }
})
