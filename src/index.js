import YError from 'yerror';
import initDebug from 'debug';
import regExptpl from 'regexp-tpl';

const debug = initDebug('siso');

const PARAMETER_NODES = Symbol('PARAMETER_NODES');
const PARAMETER_KEY_PREFIX = '__//--##,,';
const BASE_10 = 10;

/* Architecture Note #1: Design Choices

I could have created a higher order function but I find
 out easier to add routes with a method instead of
 building an object to bind with a function, so `Siso` is
 a JavaScript class. Also abstracting routes index format
 gives field for a few optimizations.

You may wonder why there is no mention of HTTP methods.
 The fact is that this router is made to be generic and
 usable either in backend, frontend or whatever needing
 to deal with paths in some way. If you are to use `Siso`
 for routing in an HTTP server, you should create a `Siso`
 instance for each HTTP method you plan to support.

 `Siso` allows to organize the data in an optimized for
 search way. There are then some tradeoffs you should be
 aware of:

* fixed length: you cannot register paths with an
 undefined length. Things like `register(['v0', '*'])`
 where `*` means any number of nodes is not allowed.
* one parameter per node: if you want to create a route
 like `/coords/$lat-$lng` you'll have no way of retrieving
`lat` and `lng` values separately from `Siso`. You will just
 retrieve a string you'll have to parse by yourself. The
 reason behind that is to KISS. This is an edge case in APIs
 so i do not want it to slow down the router matching system.

*/

export default class Siso {
  /**
   * Create a new Siso instance
   * @return {Siso}     The Siso instance
   * @example
   *
   * import Siso from 'siso';
   *
   * const siso = new Siso();
   */
  constructor() {
    this._nodesLengthMap = new Map();
    this._parameters = new Map();
  }

  /**
   * Register a value for a pattern path
   * @param  {Array}  pathPatternNodes    The various nodes of the path pattern
   * @param  {any}    value               The value registered for the given path pattern
   * @return {void}
   * @example
   *
   * import Siso from 'siso';
   *
   * const siso = new Siso();
   *
   * // Path pattern nodes may be simple strings
   * siso.register(['v1', 'users'], 'user.list');
   *
   * // Or parameters with a name and its corresponding node pattern
   * siso.register([
   *   'v1',
   *   'users',
   *   { name: 'id', pattern: /[a-f0-9]{24}/, type: 'string' },
   * ], 'user.details');
   */
  register(pathPatternNodes, value) {
    /* Architecture Note #2: Indexing with Maps in Maps

    To optimize the search, the basic workflow is:
    - find the root map with the given nodes lengths
    - recursively find in the child maps for each nodes
    */
    const nodesLength = pathPatternNodes.length;
    let currentMap = this._nodesLengthMap.get(nodesLength);

    if ('undefined' === typeof value) {
      throw new YError('E_BAD_VALUE', value);
    }

    /* Architecture Note #2.1: Indexing by Nodes Length

    Routers nodes are indexed by their number of nodes
     for better performances. It saves as much string
     comparison/regexp matching as the distribution of the
     paths lengths.
    */
    if (!currentMap) {
      currentMap = new Map();
      this._nodesLengthMap.set(nodesLength, currentMap);
      debug('Created a new length based key', nodesLength);
    }

    debug('Registering a new path pattern:', pathPatternNodes, value);

    /* Architecture Note #2.2: Indexing each Nodes

    A node can be a string, if so, we just use it as a key.
     Otherwise, it is a parameter with some regular expressions
     to match it, if so, there are some additionnal work.

    To ensure parameters unicity we maintain a map of every
     parameters in the `_parameters` property. Also since
     parameters needs some regular expression mathing work,
     we cannot just retrieve it by key. They are then put in
     a set with the `PARAMETER_NODES` special property.
    */
    pathPatternNodes.forEach((pathPatternNode, index) => {
      const isLastNode = index + 1 === nodesLength;
      let nextMap;

      if ('string' === typeof pathPatternNode) {
        debug('Registering a text node:', pathPatternNode);
        nextMap = this._registerTextNode(
          currentMap,
          isLastNode,
          pathPatternNode,
          value,
        );
      } else {
        debug('Registering a parameter node:', pathPatternNode);
        nextMap = this._registerParameterNode(
          currentMap,
          isLastNode,
          pathPatternNode,
          value,
        );
      }

      if (!isLastNode) {
        currentMap = nextMap;
      }
    });
  }

  // disabling the '_registerTextNode' eslint rule for consistency with _registerParameterNode
  _registerTextNode(currentMap, isLastNode, pathPatternNode, value) {
    // eslint-disable-line
    let nextMap;

    if (!isLastNode) {
      nextMap = currentMap.get(pathPatternNode) || new Map();
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode.name);
      }
    } else if (currentMap.get(pathPatternNode)) {
      throw new YError('E_NODE_OVERRIDE', pathPatternNode);
    }
    currentMap.set(pathPatternNode, isLastNode ? value : nextMap);
    return nextMap;
  }

  _registerParameterNode(currentMap, isLastNode, pathPatternNode, value) {
    let nextMap;
    let paramsSet;

    /* Architecture Note #2.3: Enum or pattern

    Declaring an `enum` or a `pattern` property is mandatory
     to properly registering a node.

    I choosen to allow no implicit wildcard an instead require
     to do it explicitly since it is an unfrequent pattern
     while designing REST APIs. Mot of the time you know what
     your node will contain and filtering it is the best option.
    */
    if (pathPatternNode.enum && pathPatternNode.pattern) {
      throw new YError('E_BAD_PARAMETER', pathPatternNode.name);
    }
    if (pathPatternNode.enum) {
      pathPatternNode = Object.assign({}, pathPatternNode, {
        pattern: regExptpl(
          [
            {
              enum: pathPatternNode.enum.map((v) => v.toString()),
            },
          ],
          '{enum.#}',
        ),
      });
    }

    if ('string' === typeof pathPatternNode.pattern) {
      pathPatternNode = Object.assign({}, pathPatternNode, {
        pattern: new RegExp(pathPatternNode.pattern),
      });
    }

    if (
      this._parameters.get(pathPatternNode.name) &&
      this._parameters.get(pathPatternNode.name).pattern.toString() !==
        pathPatternNode.pattern.toString()
    ) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }
    if (!isLastNode) {
      nextMap =
        currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name) ||
        new Map();
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode.name);
      }
    } else if (currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name)) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }
    paramsSet = currentMap.get(PARAMETER_NODES) || new Set();
    paramsSet.add(pathPatternNode);
    currentMap.set(PARAMETER_NODES, paramsSet);
    this._parameters.set(pathPatternNode.name, pathPatternNode);
    currentMap.set(
      PARAMETER_KEY_PREFIX + pathPatternNode.name,
      isLastNode ? value : nextMap,
    );
    return nextMap;
  }

  /**
   * Find the value for the given path
   * @param  {Array}  pathNodes    The path nodes for which to look for a value
   * @return {void}
   * @example
   *
   * import Siso from 'siso';
   *
   * const siso = new Siso();
   *
   * siso.register([
   *   'v1',
   *   'users',
   *   { name: 'userId', pattern: /[a-f0-9]{24}/, type: 'string' },
   * ], 'anotherValue');
   *
   * siso.find('v1', 'users', 'abbacacaabbacacaabbacaca');
   * // ['anotherValue', { userId: 'abbacacaabbacacaabbacaca' }]
   */
  find(pathNodes) {
    /* Architecture Note #3: Search workflow

    To optimize nodes search, the basic workflow is:
    - find a map with nodes lengths

    */
    const nodesLength = pathNodes.length;
    const result = [this._nodesLengthMap.get(nodesLength), {}];

    debug('Testing a new path:', pathNodes);

    if ('undefined' === typeof result[0]) {
      debug('No path pattern of this length:', nodesLength);
      return result;
    }

    return pathNodes.reduce(([currentMap, parameters], pathNode) => {
      let candidateValue;

      debug('Testing node:', pathNode);
      if ('undefined' === typeof currentMap) {
        debug('No map found', pathNode);
        return [currentMap, parameters];
      }

      candidateValue = currentMap.get(pathNode);
      if (candidateValue) {
        debug('Value found on a node basis:', pathNode);
        return [candidateValue, parameters];
      }
      debug('No value found on the node basis:', pathNode);
      (currentMap.get(PARAMETER_NODES) || []).forEach((parameter) => {
        debug('Testing node against parameter:', pathNode, parameter);
        if (parameter.pattern.test(pathNode)) {
          candidateValue = currentMap.get(
            PARAMETER_KEY_PREFIX + parameter.name,
          );
          parameters = _assignParameterPart(parameter, parameters, pathNode);
        }
      });
      if (candidateValue) {
        debug('Value found on a paramater basis:', pathNode);
      }
      return [candidateValue, parameters];
    }, result);
  }
}

function _assignParameterPart(paramDefinition, parameters, pathNode) {
  // Supporting only a subset of JSON schema core
  // http://json-schema.org/latest/json-schema-core.html#rfc.section.4.2
  const value =
    'string' === paramDefinition.type
      ? pathNode
      : 'boolean' === paramDefinition.type
      ? _parseBoolean(pathNode)
      : 'number' === paramDefinition.type
      ? _parseReentrantNumber(pathNode)
      : (() => {
          throw new YError(
            'E_UNSUPPORTED_TYPE',
            paramDefinition.name,
            paramDefinition.type,
          );
        })();
  parameters[paramDefinition.name] = value;
  return parameters;
}

function _parseReentrantNumber(str) {
  const value = parseFloat(str, BASE_10);

  if (value.toString(BASE_10) !== str) {
    throw new YError('E_NON_REENTRANT_NUMBER', str, value.toString(BASE_10));
  }

  return value;
}

function _parseBoolean(str) {
  if ('true' === str) {
    return true;
  } else if ('false' === str) {
    return false;
  }
  throw new YError('E_BAD_BOOLEAN', str);
}
