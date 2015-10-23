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

test('a single function middleware can be passed as well', t => {
  let index = 0
  return run(
    () => t.equal(++index, 1, 'must run the middleware in order')
  )().then(() => {
    t.equal(index, 1, 'the single function must run')
  })
})

test('run should resolve to a value', async t => {
  let val = {}
  let value = await run(({ resolve }) => resolve(val))()
  t.equal(value, val, 'the resolved value should be what is passed to resolve')
})

test('an empty array can be passed', t => {
  return run([])().then(value => {
    t.equal(value, undefined, 'an empty series must resolve to undefined')
  })
})

test('done running middleware after resolve()', t => run([
  ({ resolve }) => { resolve() },
  () => t.fail('calling resolve must stop the next middleware from running')
])())

test('stop running parent middleware after resolve()', t => run([
  run([ ({ resolve }) => { resolve() } ]),
  () => t.fail('calling resolve must stop the next parent middleware from running')
])())

test('next should invoke the next middleware', t => {
  let val = 'value'
  return run([
    run([
      async ({ ctx, next }) => {
        t.equal(++ctx.index, 1, 'mothing is run before the first middleware')
        await next()
        t.equal(++ctx.index, 4, 'after await next() should run after all other middleware')
      }
    ]),
    ({ ctx }) => t.equal(++ctx.index, 2, 'next middleware is run on next()'),
    ({ ctx, resolve }) => {
      t.equal(++ctx.index, 3, 'all other middleware should run before next() resolves')
      resolve(val)
    }
  ])({ ctx: { index: 0 } })
})

test('next should return a promise for the current resolved value', t => {
  let val = 'value'
  return run([
    run([
      async ({ next }) => {
        let value = await next()
        t.equal(value, val, 'the resolved value of next() should be the resolve value')
      }
    ]),
    ({ resolve }) => resolve(val)
  ])()
})

test('next is idempotent', t => {
  let count = 0
  return run([
    async ({ next }) => {
      let p1 = next()
      let p2 = next()
      t.equal(p2, p1, 'each next() call must return the same promise')
    },
    () => {
      t.equal(++count, 1, 'next middleware must only run once')
    }
  ])()
})

test('resolve should return a promise for the final resolved value', async t => {
  let val1 = 'initial'
  let val2 = 'final'
  await run([
    run([
      async ({ next, resolve }) => {
        let value = await next()
        t.equal(value, val1, 'the resolved value of next() should be the resolve value')
        resolve(val2)
      }
    ]),
    async ({ resolve }) => {
      let value = await resolve(val1)
      t.equal(value, val2, 'the resolved value of resolve() should be the final value')
    }
  ])()
  await run([
    async ({ next, resolve }) => {
      let value = await next()
      t.equal(value, val1, 'the resolved value of next() should be the resolve value')
      value = await resolve(val2)
      t.equal(value, val2, 'the resolved value of resolve() should be the final value')
    },
    run([
      async ({ resolve }) => {
        let value = await resolve(val1)
        t.equal(value, val2, 'the resolved value of resolve() should be the final value')
      }
    ])
  ])()
})

test('resolve preempts next, so the next middleware cannot run', t => run([
  async ({ resolve, next }) => {
    resolve('v')
    let value = await next()
    t.equal(value, 'v', 'next promise still resolves to current value')
  },
  () => {
    t.fail('resolve must stop the next middleware from running even after explicit next')
  }
])())

test('resolve is idempotent, and only the first call can set the value', t => {
  let count = 0
  return run(
    async ({ resolve }) => {
      let p1 = resolve('one')
      let p2 = resolve('two')
      let p3 = resolve()
      t.equal(p2, p1, 'each resolve() call must return the same promise')
      t.equal(p3, p1, 'each resolve() call must return the same promise')
    }
  )().then(value => {
    t.equal(value, 'one', 'only the first resolved value in a middleware can be used')
  })
})

test('all middleware get added context', t => {
  let shared
  return run([
    ({ context }) => {
      shared = context
    },
    async ({ context, next }) => {
      t.equal(context, shared, 'each middleware should recieve the additional context')
      await next()
      t.equal(context.added, 'added', 'context mutations should be visible after next')
    },
    run([
      ({ context }) => t.equal(context, shared, 'nested middleware should recieve the same context'),
      ({ context }) => { context.added = 'added' }
    ]),
    ({ context }) => t.equal(context, shared, 'later middleware should recieve the same context')
  ])()
})

test('context can be passed in and shared with all middleware', t => {
  let shared = {}
  return run([
    async ({ context, next }) => {
      t.equal(context, shared, 'each middleware should recieve the additional context')
      await next()
      t.equal(context.added, 'added', 'context mutations should be visible after next')
    },
    run([
      ({ context }) => t.equal(context, shared, 'nested middleware should recieve the same context'),
      ({ context }) => { context.added = 'added' }
    ]),
    ({ context }) => t.equal(context, shared, 'later middleware should recieve the same context')
  ])({ context: shared })
})

test('a thrown error makes the returned promise reject', async t => {
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

test('a thrown error in nested run makes the returned promise reject', async t => {
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
