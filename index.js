module.exports = function run (middleware) {
  var context = {}
  var index = 0

  var isDone = false
  function done () { isDone = true }

  function loop () {
    if (isDone || index >= middleware.length) return

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
    var result = current(context, next, done)
    return Promise.resolve(result).then(next)
  }

  return new Promise(function (resolve) { resolve(loop()) })
}
