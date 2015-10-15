# Changelog

## 1.0.0-rc2

* **Breaking Change**
  * run returns a middleware-like function so they can be composed
  * context is passed into the returned function instead of being created
  * next and stop passed into the returned function are called appropriately

## 1.0.0-rc1

* **New Feature**
  * Promise-based async middleware runner
  * Continues to next middleware when current resolves
  * Explicitly start the next middleware for koa-like true middleware
  * Explicitly stop moving to next middleware when process is complete

