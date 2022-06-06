import { YError } from 'yerror';
import initDebug from 'debug';
import regExptpl from 'regexp-tpl';

type SisoValue = unknown;
type SisoParamValue = string | number | boolean;
type SisoPattern = {
  name: string;
  type: 'string' | 'number' | 'boolean';
} & (
  | {
      pattern: string;
    }
  | {
      enum: SisoParamValue[];
    }
);
type SisoNode = string;
type SisoParameter = SisoNode | SisoPattern;
type SisoParametersValues<P extends SisoParamValue> = {
  [name: string]: P;
};
type SisoResult<V extends SisoValue, P extends SisoParamValue> = [
  V | undefined,
  SisoParametersValues<P>,
];
type SisoInternalPattern = SisoPattern & { __computedPattern: RegExp };
type SisoParamSet = Set<SisoInternalPattern>;
type SisoMap<V extends SisoValue> = Map<
  string | typeof PARAMETER_NODES,
  SisoMap<V> | V | SisoParamSet
>;

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

/**
 * Siso
 * @class
 */
class Siso<
  V extends SisoValue = SisoValue,
  P extends SisoParamValue = SisoParamValue,
> {
  private _nodesLengthMap: Map<number, SisoMap<V>>;
  private _parameters: Map<string, SisoInternalPattern>;
  /**
   * Create a new Siso instance
   * @return {Siso}     The Siso instance
   * @example
   *
   * import { Siso } from 'siso';
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
   * import { Siso } from 'siso';
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
  register(pathPatternNodes: SisoParameter[], value: V): void {
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
          currentMap as SisoMap<V>,
          isLastNode,
          pathPatternNode,
          value,
        );
      } else {
        debug('Registering a parameter node:', pathPatternNode);
        nextMap = this._registerParameterNode(
          currentMap as SisoMap<V>,
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

  _registerTextNode(
    currentMap: SisoMap<V>,
    isLastNode: boolean,
    pathPatternNode: SisoNode,
    value: V,
  ): SisoMap<V> | undefined {
    let nextMap: SisoMap<V> | undefined = undefined;

    if (!isLastNode) {
      nextMap = (currentMap.get(pathPatternNode) || new Map()) as SisoMap<V>;
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode, nextMap);
      }
    } else if (currentMap.get(pathPatternNode)) {
      throw new YError('E_NODE_OVERRIDE', pathPatternNode);
    }
    currentMap.set(
      pathPatternNode,
      isLastNode ? value : (nextMap as SisoMap<V>),
    );
    return nextMap;
  }

  _registerParameterNode(
    currentMap: SisoMap<V>,
    isLastNode: boolean,
    pathPatternNode: SisoPattern,
    value: V,
  ): SisoMap<V> | undefined {
    let nextMap: SisoMap<V> | undefined;

    /* Architecture Note #2.3: Enum or pattern

    Declaring an `enum` or a `pattern` property is mandatory
     to properly registering a node.

    I choosen to allow no implicit wildcard an instead require
     to do it explicitly since it is an unfrequent pattern
     while designing REST APIs. Mot of the time you know what
     your node will contain and filtering it is the best option.
    */
    if ('enum' in pathPatternNode && 'pattern' in pathPatternNode) {
      throw new YError(
        'E_BAD_PARAMETER',
        (pathPatternNode as SisoPattern).name,
      );
    }

    const computedPattern =
      'enum' in pathPatternNode
        ? regExptpl(
            [
              {
                enum: pathPatternNode.enum.map((v) => v.toString()),
              },
            ],
            '{enum.#}',
          )
        : new RegExp(pathPatternNode.pattern);

    if (
      this._parameters.has(pathPatternNode.name) &&
      (
        this._parameters.get(pathPatternNode.name) as SisoInternalPattern
      ).__computedPattern.toString() !== computedPattern.toString()
    ) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }

    if (
      isLastNode &&
      currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name)
    ) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }

    if (!isLastNode) {
      nextMap = (currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name) ||
        new Map()) as SisoMap<V>;
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode.name);
      }
    }

    const paramsSet = (currentMap.get(PARAMETER_NODES) ||
      new Set()) as SisoParamSet;
    const internalPatternNode = {
      ...pathPatternNode,
      __computedPattern: computedPattern,
    };

    paramsSet.add(internalPatternNode);
    currentMap.set(PARAMETER_NODES, paramsSet);
    this._parameters.set(pathPatternNode.name, internalPatternNode);
    currentMap.set(
      PARAMETER_KEY_PREFIX + pathPatternNode.name,
      isLastNode ? value : (nextMap as SisoMap<V>),
    );
    return nextMap;
  }

  /**
   * Find the value for the given path
   * @param  {Array}  pathNodes    The path nodes for which to look for a value
   * @return {void}
   * @example
   *
   * import { Siso } from 'siso';
   *
   * const siso = new Siso();
   *
   * siso.register([
   *   'v1',
   *   'users',
   *   { name: 'userId', pattern: /[a-f0-9]{24}/, type: 'string' },
   * ], 'anotherValue');
   *
   * siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca']);
   * // ['anotherValue', { userId: 'abbacacaabbacacaabbacaca' }]
   */
  find(pathNodes: SisoNode[]): SisoResult<V, P> {
    /* Architecture Note #3: Search workflow

    To optimize nodes search, the basic workflow is:
    - find a map with nodes lengths
    - walk through the tree to find a value
    */
    const nodesLength = pathNodes.length;
    const rootMap = this._nodesLengthMap.get(nodesLength);

    debug('Testing a new path:', pathNodes);

    if ('undefined' === typeof rootMap) {
      debug('No path pattern of this length:', nodesLength);
      return [undefined, {}];
    }

    const pathNodesLeft = [...pathNodes];
    let parameters: SisoParametersValues<P> = {};
    let currentMap: SisoMap<V> = rootMap;
    let candidateValue: V | SisoMap<V> | undefined;

    while (pathNodesLeft.length) {
      const pathNode = pathNodesLeft.shift() as string;

      debug('Testing node:', pathNode);

      candidateValue = currentMap.get(pathNode) as V | SisoMap<V> | undefined;

      if (typeof candidateValue !== 'undefined') {
        debug('Value found on a node basis:', pathNode);
      } else {
        debug('No value found on the node basis:', pathNode);
        const patterns = (currentMap.get(PARAMETER_NODES) ||
          []) as SisoInternalPattern[];

        for (const pattern of patterns) {
          debug('Testing node against parameter:', pathNode, pattern);
          if (pattern.__computedPattern.test(pathNode)) {
            candidateValue = currentMap.get(
              PARAMETER_KEY_PREFIX + pattern.name,
            ) as V | SisoMap<V> | undefined;
            parameters = _assignParameterPart<P>(pattern, parameters, pathNode);
          }
        }

        if (typeof candidateValue !== 'undefined') {
          debug('Value found on a paramater basis:', pathNode);
        }
      }

      if ('undefined' === typeof candidateValue) {
        debug('No map found', pathNode);
        return [undefined, parameters];
      }

      if (pathNodesLeft.length) {
        if (candidateValue instanceof Map) {
          currentMap = candidateValue;
        } else {
          debug('Found a value instead of a map:', pathNode);
          return [undefined, parameters];
        }
      }
    }
    if (candidateValue instanceof Map) {
      debug('Found a map instead of a value!', candidateValue);
      return [undefined, parameters];
    } else {
      return [candidateValue, parameters];
    }
  }
}

function _assignParameterPart<P extends SisoParamValue>(
  paramDefinition: SisoPattern,
  parameters: SisoParametersValues<P>,
  pathNode: string,
): SisoParametersValues<P> {
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
  parameters[paramDefinition.name] = value as P;
  return parameters;
}

function _parseReentrantNumber(str: string): number {
  const value = parseFloat(str);

  if (value.toString(BASE_10) !== str) {
    throw new YError('E_NON_REENTRANT_NUMBER', str, value.toString(BASE_10));
  }

  return value;
}

function _parseBoolean(str: string): boolean {
  if ('true' === str) {
    return true;
  } else if ('false' === str) {
    return false;
  }
  throw new YError('E_BAD_BOOLEAN', str);
}

export { Siso };
