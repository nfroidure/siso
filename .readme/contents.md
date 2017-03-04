`siso` stands for "Shit In Shit Out". It is a module intended to build routers
 without embedding a framework and falling into the gorilla banana problem ;).
 It appears it also match the French "ciseau" word pronunciation which means
 "chisel".

The parameters definition somewhat matches the Swagger one so that you will
 be able to use Siso with your swagger definition easily.

## Usage
The `siso` concept is pretty simple. You associate paths patterns to values,
 then you pass a path in and get values and parameters out. And that's it, fair
 enough ;).

`siso` does not decide which separator is used for your paths so that you can
 use it for any routing concern.

```js
import Siso from siso;

const siso = new Siso();

// Associate the '/v1/users' path to the 'user.list' value
siso.register([
  'v1',
  'users',
], 'user.list');

// Associate the '/v1/users/:id' path to the 'user.detail' value
siso.register([
  'v1',
  'users',
  {
    name: 'id',
    type: 'number',
    pattern: /^[0-9]+$/,
  },
], 'user.detail');

// Find a value for /v1/users/12
siso.find(['v1', 'users', '12']);
// Returns: ['user.detail', {id: 12}]
```

Note that you can provide any value for a given path. It may be a function, an
 array, an object or a string depending of your needs.

Despite its simplicity, `siso` is very opinionated since it won't allow you to define
 several values for the same path pattern and will throw if such situation happens.

It is very different from the kind of routing systems you probably used before.
Frameworks like Express would allow registering several middlewares for the same
path, for instance.

My opinion is that it is a bad thing. Every route should have a single handler
 and higher order functions should be used instead. That way, you have the
 overhaul workflow of each route in their own controllers. No magic, no need to
 guess what happens before/after the route handler.
 [Read my blog post on this concern](http://insertafter.com/en/blog/no_more_middlewares.html).
