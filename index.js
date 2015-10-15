module.exports = function run (middleware) {
  return function (context, onComplete, onStop) {
    var index = 0

    var isDone = false
    function stop () {
      if (!isDone) {
        isDone = true
        if (onStop) onStop()
      }
    }

    function loop () {
      if (isDone || index >= middleware.length) {
        return onComplete && onComplete()
      }

      var nextCalled = false
      var nextResult
      function next () {
        if (!nextCalled) {
          nextCalled = true
          nextResult = loop()
        }
        return nextResult
      }

      var current = middleware[index++]
      var result = current(context, next, stop)
      return Promise.resolve(result).then(next)
    }

    return new Promise(function (resolve) { resolve(loop()) })
  }
}
