import { YError } from 'yerror';
import initDebug from 'debug';

type SisoValue = unknown;
type SisoNodeValue = string | number | boolean;
type SisoDynamicNode =
  | {
      name: string;
      type: 'string';
      validate: (value: string) => boolean;
    }
  | {
      name: string;
      type: 'number';
      validate: (value: number) => boolean;
    }
  | {
      name: string;
      type: 'boolean';
      validate: (value: boolean) => boolean;
    };
type SisoRawNode = string;
type SisoNode = SisoRawNode | SisoDynamicNode;
type SisoNodesValues = {
  [name: string]: SisoNodeValue;
};
type SisoResult<V extends SisoValue> = [V | undefined, SisoNodesValues];
type SisoParamSet = Set<SisoDynamicNode>;
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
 usable either in the backend, frontend or whatever needing
 to deal with paths in some way. If you are to use `Siso`
 for routing in an HTTP server, you should create a `Siso`
 instance for each HTTP method you plan to support.

 `Siso` allows to organize the data in a search optimized
 way. There is then some tradeoffs you should be
 aware of:

- fixed length: you cannot register paths with an
 undefined length. Things like `register(['v0', '*'])`
 where `*` means any number of nodes is not allowed.
- one parameter per dynamic node: if you want to create a route
 like `/coords/$lat-$lng` you'll have no way of retrieving
`lat` and `lng` values separately from `Siso`. You will just
 retrieve a string you'll have to parse by yourself. The
 reason behind that is to KISS. This is an edge case in APIs
 so I do not want it to slow down the router matching system.

*/

/**
 * Siso
 * @class
 */
class Siso<V extends SisoValue = SisoValue> {
  private _pathNodesByLengthMap: Map<number, SisoMap<V>>;
  private _dynamicNodes: Map<string, SisoDynamicNode>;
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
    this._pathNodesByLengthMap = new Map();
    this._dynamicNodes = new Map();
  }

  /**
   * Register a value for given path nodes
   * @param  {Array}  pathNodes    The various nodes of the path
   * @param  {any}    value        The value registered for the given path nodes
   * @return {void}
   * @example
   *
   * import { Siso } from 'siso';
   *
   * const siso = new Siso();
   *
   * // Path nodes may be simple strings
   * siso.register(['v1', 'users'], 'user.list');
   *
   * // Or dynamic nodes with a name and its corresponding validation function
   * siso.register([
   *   'v1',
   *   'users',
   *   { name: 'id', validate: (str) => /[a-f0-9]{24}/.test(str), type: 'string' },
   * ], 'user.details');
   */
  register(pathNodes: SisoNode[], value: V): void {
    /* Architecture Note #2: Indexing with Maps in Maps

    To optimize the search, the basic workflow is:
    - find the root map with the given nodes lengths
    - recursively find in the child maps for each nodes
    */
    const nodesLength = pathNodes.length;
    let currentPathNodesMap = this._pathNodesByLengthMap.get(nodesLength);

    if ('undefined' === typeof value) {
      throw new YError('E_BAD_VALUE', value);
    }

    /* Architecture Note #2.1: Indexing by Nodes Length

    Routers nodes are indexed by their number of nodes
     for better performances. It saves as much string
     comparison/regexp matching as the distribution of the
     paths lengths.
    */
    if (!currentPathNodesMap) {
      currentPathNodesMap = new Map();
      this._pathNodesByLengthMap.set(nodesLength, currentPathNodesMap);
      debug('Created a new length based key', nodesLength);
    }

    debug('Registering a new path pattern:', pathNodes, value);

    /* Architecture Note #2.2: Indexing each Nodes

    A node can be a string, if so, we just use it as a key.
     Otherwise, it is a dynamic node with some validation
     function to match it, if so, there are some additional
     work.

    To ensure parameters unicity we maintain a map of every
     dynamic nodes in the `_dynamicNodes` property. Also since
     dynamic nodes needs some validation function work,
     we cannot just retrieve it by key. They are then put in
     a set with the `PARAMETER_NODES` special property.
    */
    pathNodes.forEach((pathNode, index) => {
      const isLastNode = index + 1 === nodesLength;
      let nextMap;

      if ('string' === typeof pathNode) {
        debug('Registering a text node:', pathNode);
        nextMap = this._registerTextNode(
          currentPathNodesMap as SisoMap<V>,
          isLastNode,
          pathNode,
          value,
        );
      } else {
        debug('Registering a parameter node:', pathNode);
        nextMap = this._registerParameterNode(
          currentPathNodesMap as SisoMap<V>,
          isLastNode,
          pathNode,
          value,
        );
      }

      if (!isLastNode) {
        currentPathNodesMap = nextMap;
      }
    });
  }

  _registerTextNode(
    currentPathNodesMap: SisoMap<V>,
    isLastNode: boolean,
    pathNode: SisoRawNode,
    value: V,
  ): SisoMap<V> | undefined {
    let nextMap: SisoMap<V> | undefined = undefined;

    if (!isLastNode) {
      nextMap = (currentPathNodesMap.get(pathNode) || new Map()) as SisoMap<V>;
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathNode, nextMap);
      }
    } else if (currentPathNodesMap.get(pathNode)) {
      throw new YError('E_NODE_OVERRIDE', pathNode);
    }
    currentPathNodesMap.set(
      pathNode,
      isLastNode ? value : (nextMap as SisoMap<V>),
    );
    return nextMap;
  }

  _registerParameterNode(
    currentPathNodesMap: SisoMap<V>,
    isLastNode: boolean,
    pathNode: SisoDynamicNode,
    value: V,
  ): SisoMap<V> | undefined {
    let nextMap: SisoMap<V> | undefined;

    if (this._dynamicNodes.has(pathNode.name)) {
      const existingPathNode = this._dynamicNodes.get(
        pathNode.name,
      ) as SisoDynamicNode;

      if (existingPathNode.validate !== pathNode.validate) {
        debug(
          'Cannot override a dynamic node with a different validator:',
          existingPathNode,
          pathNode,
        );
        throw new YError('E_PARAM_OVERRIDE', pathNode.name);
      }
    }

    if (
      isLastNode &&
      currentPathNodesMap.get(PARAMETER_KEY_PREFIX + pathNode.name)
    ) {
      debug(
        'Cannot override a dynamic leaf node with the same name:',
        currentPathNodesMap.get(PARAMETER_KEY_PREFIX + pathNode.name),
        pathNode,
      );
      throw new YError('E_PARAM_OVERRIDE', pathNode.name);
    }

    if (!isLastNode) {
      nextMap = (currentPathNodesMap.get(
        PARAMETER_KEY_PREFIX + pathNode.name,
      ) || new Map()) as SisoMap<V>;
      if (!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathNode.name);
      }
    }

    const paramsSet = (currentPathNodesMap.get(PARAMETER_NODES) ||
      new Set()) as SisoParamSet;

    paramsSet.add(pathNode);
    currentPathNodesMap.set(PARAMETER_NODES, paramsSet);
    this._dynamicNodes.set(pathNode.name, pathNode);
    currentPathNodesMap.set(
      PARAMETER_KEY_PREFIX + pathNode.name,
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
  find(pathNodes: SisoRawNode[]): SisoResult<V> {
    /* Architecture Note #3: Search workflow

    To optimize nodes search, the basic workflow is:
    - find a map with nodes lengths
    - walk through the tree to find a value
    */
    const nodesLength = pathNodes.length;
    const rootMap = this._pathNodesByLengthMap.get(nodesLength);

    debug('Testing a new path:', pathNodes);

    if ('undefined' === typeof rootMap) {
      debug('No path pattern of this length:', nodesLength);
      return [undefined, {}];
    }

    const pathNodesLeft = [...pathNodes];
    const nodeValues: SisoNodesValues = {};
    let currentPathNodesMap: SisoMap<V> = rootMap;
    let candidateValue: V | SisoMap<V> | undefined;

    while (pathNodesLeft.length) {
      const pathNode = pathNodesLeft.shift() as string;

      debug('Testing node:', pathNode);

      candidateValue = currentPathNodesMap.get(pathNode) as
        | V
        | SisoMap<V>
        | undefined;

      if (typeof candidateValue !== 'undefined') {
        debug('Value found on a node basis:', pathNode);
      } else {
        debug('No value found on the node basis:', pathNode);
        const patterns = (currentPathNodesMap.get(PARAMETER_NODES) ||
          []) as SisoDynamicNode[];

        for (const pattern of patterns) {
          debug('Testing node against parameter:', pathNode, pattern);

          if (pattern.type === 'string') {
            if (pattern.validate(pathNode)) {
              candidateValue = currentPathNodesMap.get(
                PARAMETER_KEY_PREFIX + pattern.name,
              ) as V | SisoMap<V> | undefined;
              nodeValues[pattern.name] = pathNode;
              break;
            }
          } else if (pattern.type === 'number') {
            const numberValue = parseReentrantNumber(pathNode);

            if (pattern.validate(numberValue)) {
              candidateValue = currentPathNodesMap.get(
                PARAMETER_KEY_PREFIX + pattern.name,
              ) as V | SisoMap<V> | undefined;
              nodeValues[pattern.name] = numberValue;
              break;
            }
          } else if (pattern.type === 'boolean') {
            const booleanValue = parseBoolean(pathNode);

            if (pattern.validate(booleanValue)) {
              candidateValue = currentPathNodesMap.get(
                PARAMETER_KEY_PREFIX + pattern.name,
              ) as V | SisoMap<V> | undefined;
              nodeValues[pattern.name] = booleanValue;
              break;
            }
          } else {
            throw new YError('E_UNSUPPORTED_TYPE', pattern);
          }
        }

        if (typeof candidateValue !== 'undefined') {
          debug('Value found on a paramater basis:', pathNode);
        }
      }

      if ('undefined' === typeof candidateValue) {
        debug('No map found', pathNode);
        return [undefined, nodeValues];
      }

      if (pathNodesLeft.length) {
        if (candidateValue instanceof Map) {
          currentPathNodesMap = candidateValue;
        } else {
          debug('Found a value instead of a map:', pathNode);
          return [undefined, nodeValues];
        }
      }
    }

    if (candidateValue instanceof Map) {
      debug('Found a map instead of a value!', candidateValue);
      return [undefined, nodeValues];
    } else {
      return [candidateValue, nodeValues];
    }
  }
}

function parseReentrantNumber(str: string): number {
  const value = parseFloat(str);

  if (value.toString(BASE_10) !== str) {
    throw new YError('E_NON_REENTRANT_NUMBER', str, value.toString(BASE_10));
  }

  return value;
}

function parseBoolean(str: string): boolean {
  if ('true' === str) {
    return true;
  } else if ('false' === str) {
    return false;
  }
  throw new YError('E_BAD_BOOLEAN', str);
}

export { Siso };
