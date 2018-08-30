/* eslint-env mocha */
const run = require('..')
const assert = require('assert')

describe('middle-run', () => {
  it('middleware should run in order', () => {
    let index = 0
    return run([
      () => assert.strictEqual(++index, 1, 'must run the middleware in order'),
      () => assert.strictEqual(++index, 2, 'must run the middleware in order'),
      run([
        () => assert.strictEqual(++index, 3, 'must run the middleware in order'),
        () => assert.strictEqual(++index, 4, 'must run the middleware in order')
      ]),
      () => assert.strictEqual(++index, 5, 'must run the middleware in order')
    ])()
  })

  it('a single function middleware can be passed as well', () => {
    let index = 0
    return run(
      () => assert.strictEqual(++index, 1, 'must run the middleware in order')
    )().then(() => {
      assert.strictEqual(index, 1, 'the single function must run')
    })
  })

  it('run should resolve to a value', async () => {
    let val = {}
    let value = await run(({ resolve }) => resolve(val))()
    assert.strictEqual(value, val, 'the resolved value should be what is passed to resolve')
  })

  it('an empty array can be passed', () => {
    return run([])().then(value => {
      assert.strictEqual(value, undefined, 'an empty series must resolve to undefined')
    })
  })

  it('done running middleware after resolve()', () => run([
    ({ resolve }) => { resolve() },
    () => assert.fail('calling resolve must stop the next middleware from running')
  ])())

  it('stop running parent middleware after resolve()', () => run([
    run([ ({ resolve }) => { resolve() } ]),
    () => assert.fail('calling resolve must stop the next parent middleware from running')
  ])())

  it('next should invoke the next middleware', () => {
    let val = 'value'
    return run([
      run([
        async ({ ctx, next }) => {
          assert.strictEqual(++ctx.index, 1, 'mothing is run before the first middleware')
          await next()
          assert.strictEqual(++ctx.index, 4, 'after await next() should run after all other middleware')
        }
      ]),
      ({ ctx }) => assert.strictEqual(++ctx.index, 2, 'next middleware is run on next()'),
      ({ ctx, resolve }) => {
        assert.strictEqual(++ctx.index, 3, 'all other middleware should run before next() resolves')
        resolve(val)
      }
    ])({ ctx: { index: 0 } })
  })

  it('next should return a promise for the current resolved value', () => {
    let val = 'value'
    return run([
      run([
        async ({ next }) => {
          let value = await next()
          assert.strictEqual(value, val, 'the resolved value of next() should be the resolve value')
        }
      ]),
      ({ resolve }) => resolve(val)
    ])()
  })

  it('next is idempotent', () => {
    let count = 0
    return run([
      async ({ next }) => {
        let p1 = next()
        let p2 = next()
        assert.strictEqual(p2, p1, 'each next() call must return the same promise')
      },
      () => {
        assert.strictEqual(++count, 1, 'next middleware must only run once')
      }
    ])()
  })

  it('resolve should return a promise for the final resolved value', async () => {
    let val1 = 'initial'
    let val2 = 'final'
    await run([
      run([
        async ({ next, resolve }) => {
          let value = await next()
          assert.strictEqual(value, val1, 'the resolved value of next() should be the resolve value')
          resolve(val2)
        }
      ]),
      async ({ resolve }) => {
        let value = await resolve(val1)
        assert.strictEqual(value, val2, 'the resolved value of resolve() should be the final value')
      }
    ])()
    await run([
      async ({ next, resolve }) => {
        let value = await next()
        assert.strictEqual(value, val1, 'the resolved value of next() should be the resolve value')
        value = await resolve(val2)
        assert.strictEqual(value, val2, 'the resolved value of resolve() should be the final value')
      },
      run([
        async ({ resolve }) => {
          let value = await resolve(val1)
          assert.strictEqual(value, val2, 'the resolved value of resolve() should be the final value')
        }
      ])
    ])()
  })

  it('resolve preempts next, so the next middleware cannot run', () => run([
    async ({ resolve, next }) => {
      resolve('v')
      let value = await next()
      assert.strictEqual(value, 'v', 'next promise still resolves to current value')
    },
    () => {
      assert.fail('resolve must stop the next middleware from running even after explicit next')
    }
  ])())

  it('resolve is idempotent, and only the first call can set the value', () => {
    return run(
      async ({ resolve }) => {
        let p1 = resolve('one')
        let p2 = resolve('two')
        let p3 = resolve()
        assert.strictEqual(p2, p1, 'each resolve() call must return the same promise')
        assert.strictEqual(p3, p1, 'each resolve() call must return the same promise')
      }
    )().then(value => {
      assert.strictEqual(value, 'one', 'only the first resolved value in a middleware can be used')
    })
  })

  it('all middleware get added context', () => {
    let shared
    return run([
      ({ context }) => {
        shared = context
      },
      async ({ context, next }) => {
        assert.strictEqual(context, shared, 'each middleware should recieve the additional context')
        await next()
        assert.strictEqual(context.added, 'added', 'context mutations should be visible after next')
      },
      run([
        ({ context }) => assert.strictEqual(context, shared, 'nested middleware should recieve the same context'),
        ({ context }) => { context.added = 'added' }
      ]),
      ({ context }) => assert.strictEqual(context, shared, 'later middleware should recieve the same context')
    ])()
  })

  it('context can be passed in and shared with all middleware', () => {
    let shared = {}
    return run([
      async ({ context, next }) => {
        assert.strictEqual(context, shared, 'each middleware should recieve the additional context')
        await next()
        assert.strictEqual(context.added, 'added', 'context mutations should be visible after next')
      },
      run([
        ({ context }) => assert.strictEqual(context, shared, 'nested middleware should recieve the same context'),
        ({ context }) => { context.added = 'added' }
      ]),
      ({ context }) => assert.strictEqual(context, shared, 'later middleware should recieve the same context')
    ])({ context: shared })
  })

  it('a thrown error makes the returned promise reject', async () => {
    try {
      await run([
        () => { throw new Error('test') }
      ])().then(
        () => assert.fail('thrown error must not cause the promise to resolve'),
        err => assert.strictEqual(err.message, 'test', 'thrown error must be passed to catch')
      )
    } catch (err) {
      assert.fail('an error in a middleware must be caught by the run() promise')
    }
  })

  it('a thrown error in nested run makes the returned promise reject', async () => {
    try {
      await run([
        run([
          () => { throw new Error('nested') }
        ])
      ])().then(
        () => assert.fail('thrown error must not cause the parent promise to resolve'),
        err => assert.strictEqual(err.message, 'nested', 'thrown error must be passed to the parent catch')
      )
    } catch (err) {
      assert.fail('an error in a middleware must be caught by the top run() promise')
    }
  })
})
