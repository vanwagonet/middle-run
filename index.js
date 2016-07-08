'use strict'

module.exports = function run (middleware) {
  if (!Array.isArray(middleware)) {
    middleware = [ middleware ]
  }

  return function (parent) {
    var index = 0
    var isResolved = false
    var value

    var context = parent && parent.context || {}
    var parentKeys = parent ? Object.keys(parent) : []
    var parentKeysLength = parentKeys.length

    function loop () {
      if (isResolved) {
        return value // always resolve `next()` to `value`
      } else if (index >= middleware.length) {
        return parent && parent.next && parent.next() // chain parent
      }

      var args = { context: context }
      for (var i = 0; i < parentKeysLength; ++i) {
        args[parentKeys[i]] = parent[parentKeys[i]]
      }

      var nextCalled = false
      var nextResult
      args.next = function next () {
        if (!nextCalled) {
          nextCalled = true
          nextResult = loop()
        }
        return nextResult
      }

      var stepResolve
      var stepPromise = new Promise(function (resolve) {
        stepResolve = resolve
      })
      args.resolve = function resolve (val) {
        isResolved = true
        if (stepResolve) {
          if (arguments.length >= 1) value = val
          stepResolve()
          stepResolve = null
        }
        return finalPromise
      }

      var current = middleware[index++]
      var result = current(args)
      return Promise.race([ result, stepPromise ]).then(args.next)
    }

    var loopPromise = Promise.resolve().then(loop)
    var finalPromise = loopPromise.then(function () {
      var shouldResolveParent = isResolved && parent && parent.resolve
      return shouldResolveParent ? parent.resolve(value) : value
    })
    return loopPromise
  }
}
