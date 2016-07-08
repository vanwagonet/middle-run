# Changelog

## 2.0.1

* **Polish**
  * avoid creating a new array, when one was already passed in
  * use mocha and babel 6 for testing

## 2.0.0

no changes since rc1

## 2.0.0-rc1

* **Breaking Change**
  * middleware recieve a single argument object with `context`, `next`, and `resolve` as properties

* **New Feature**
  * `resolve` provides a way to set a final value for the middleware series
  * `resolve` allows an async function to pass control back upstream before returning or resolving

## 1.0.0

no changes since rc2

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
