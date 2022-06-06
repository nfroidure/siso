# API
<a name="Siso"></a>

## Siso
Siso

**Kind**: global class  

* [Siso](#Siso)
    * [new Siso()](#new_Siso_new)
    * [.register(pathPatternNodes, value)](#Siso+register) ⇒ <code>void</code>
    * [.find(pathNodes)](#Siso+find) ⇒ <code>void</code>

<a name="new_Siso_new"></a>

### new Siso()
Create a new Siso instance

**Returns**: [<code>Siso</code>](#Siso) - The Siso instance  
**Example**  
```js
import { Siso } from 'siso';

const siso = new Siso();
```
<a name="Siso+register"></a>

### siso.register(pathPatternNodes, value) ⇒ <code>void</code>
Register a value for a pattern path

**Kind**: instance method of [<code>Siso</code>](#Siso)  

| Param | Type | Description |
| --- | --- | --- |
| pathPatternNodes | <code>Array</code> | The various nodes of the path pattern |
| value | <code>any</code> | The value registered for the given path pattern |

**Example**  
```js
import { Siso } from 'siso';

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
<a name="Siso+find"></a>

### siso.find(pathNodes) ⇒ <code>void</code>
Find the value for the given path

**Kind**: instance method of [<code>Siso</code>](#Siso)  

| Param | Type | Description |
| --- | --- | --- |
| pathNodes | <code>Array</code> | The path nodes for which to look for a value |

**Example**  
```js
import { Siso } from 'siso';

const siso = new Siso();

siso.register([
  'v1',
  'users',
  { name: 'userId', pattern: /[a-f0-9]{24}/, type: 'string' },
], 'anotherValue');

siso.find('v1', 'users', 'abbacacaabbacacaabbacaca');
// ['anotherValue', { userId: 'abbacacaabbacacaabbacaca' }]
```
