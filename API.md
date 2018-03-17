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
