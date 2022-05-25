[//]: # ( )
[//]: # (This file is automatically generated by a `metapak`)
[//]: # (module. Do not change it  except between the)
[//]: # (`content:start/end` flags, your changes would)
[//]: # (be overridden.)
[//]: # ( )
# siso
> siso is a routing utility allowing to map a path to a value

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/nfroidure/siso/blob/master/LICENSE)
[![Build status](https://travis-ci.com/nfroidure/siso.svg?branch=master)](https://travis-ci.com/github/nfroidure/siso)
[![Coverage Status](https://coveralls.io/repos/github/nfroidure/siso/badge.svg?branch=master)](https://coveralls.io/github/nfroidure/siso?branch=master)


[//]: # (::contents:start)

`siso` stands for "Shit In Shit Out". It allows to build
 routers without embedding a framework and falling
 into the gorilla banana problem ;).

It also match the French "ciseau" word pronunciation which
 means "chisel".

The parameters definition somewhat matches the Swagger one
 so that you will be able to use Siso with your swagger
 definition easily.

## Usage
The `siso` concept is pretty simple. You associate paths
 patterns to values, then you pass a path in and get values
 and parameters out. And that's it, fair enough ;).

`siso` does not decide which separator is used for your
 paths so that you can use it for any routing concern.

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

Note that you can provide any value for a given path.
 It may be a function, an array, an object or a string
 depending of your needs.

Despite its simplicity, `siso` is very opinionated since
 it won't allow you to define several values for the
 same path pattern and will throw if such situation happens.

It is very different from the kind of routing systems you
 probably used before. Frameworks like Express would allow
 registering several middlewares for the same path, for
 instance.

My opinion is that it is a bad thing. Every route should
 have a single handler and higher order functions should
 be used instead. That way, you have the overhaul workflow
 of each route in their own controllers. No magic, no need to
 guess what happens before/after the route handler.
 [Read my blog post on this concern](http://insertafter.com/en/blog/no_more_middlewares.html).

`siso` is just a building block, if you need a higher
 level way to deal with routers see
 [swagger-http-router](https://github.com/nfroidure/swagger-http-router).

[//]: # (::contents:end)

# API
## Functions

<dl>
<dt><a href="#register">register(pathPatternNodes, value)</a> ⇒ <code>void</code></dt>
<dd><p>Register a value for a pattern path</p>
</dd>
<dt><a href="#find">find(pathNodes)</a> ⇒ <code>void</code></dt>
<dd><p>Find the value for the given path</p>
</dd>
</dl>

<a name="register"></a>

## register(pathPatternNodes, value) ⇒ <code>void</code>
Register a value for a pattern path

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pathPatternNodes | <code>Array</code> | The various nodes of the path pattern |
| value | <code>any</code> | The value registered for the given path pattern |

**Example**  
```js
import Siso from 'siso';

const siso = new Siso();

// Path pattern nodes may be simple strings
siso.register(['v1', 'users'], 'user.list');

// Or parameters with a name and its corresponding node pattern
siso.register([
  'v1',
  'users',
  { name: 'id', pattern: /[a-f0-9]{24}/, type: 'string' },
], 'user.details');
```
<a name="find"></a>

## find(pathNodes) ⇒ <code>void</code>
Find the value for the given path

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| pathNodes | <code>Array</code> | The path nodes for which to look for a value |

**Example**  
```js
import Siso from 'siso';

const siso = new Siso();

siso.register([
  'v1',
  'users',
  { name: 'userId', pattern: /[a-f0-9]{24}/, type: 'string' },
], 'anotherValue');

siso.find('v1', 'users', 'abbacacaabbacacaabbacaca');
// ['anotherValue', { userId: 'abbacacaabbacacaabbacaca' }]
```

# Authors
- [Nicolas Froidure](http://insertafter.com/en/index.html)

# License
[MIT](https://github.com/nfroidure/siso/blob/master/LICENSE)
