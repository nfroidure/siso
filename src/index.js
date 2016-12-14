/* eslint node/no-unsupported-features:0 */

import YError from 'yerror';
import initDebug from 'debug';

const debug = initDebug('siso');
const Symbol = require('es6-symbol');

const PARAMETER_NODES = Symbol('PARAMETER_NODES');
const PARAMETER_KEY_PREFIX = '__//--##,,';
const BASE_10 = 10;

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
    const nodesLength = pathPatternNodes.length;
    let currentMap = this._nodesLengthMap.get(nodesLength);

    if('undefined' === typeof value) {
      throw new YError('E_BAD_VALUE', value);
    }

    if(!currentMap) {
      currentMap = new Map();
      this._nodesLengthMap.set(nodesLength, currentMap);
      debug('Created a new length based key', nodesLength);
    }

    debug('Registering a new path pattern:', pathPatternNodes, value);

    pathPatternNodes.forEach((pathPatternNode, index) => {
      const isLastNode = index + 1 === nodesLength;
      let nextMap;

      if('string' === typeof pathPatternNode) {
        debug('Registering a text node:', pathPatternNode);
        nextMap = this._registerTextNode(currentMap, isLastNode, pathPatternNode, value);
      } else {
        debug('Registering a parameter node:', pathPatternNode);
        nextMap = this._registerParameterNode(currentMap, isLastNode, pathPatternNode, value);
      }

      if(!isLastNode) {
        currentMap = nextMap;
      }
    });
  }

  // disabling the '_registerTextNode' eslint rule for consistency with _registerParameterNode
  _registerTextNode(currentMap, isLastNode, pathPatternNode, value) { // eslint-disable-line
    let nextMap;

    if(!isLastNode) {
      nextMap = currentMap.get(pathPatternNode) || new Map();
      if(!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode.name);
      }
    } else if(currentMap.get(pathPatternNode)) {
      throw new YError('E_NODE_OVERRIDE', pathPatternNode);
    }
    currentMap.set(pathPatternNode, isLastNode ? value : nextMap);
    return nextMap;
  }

  _registerParameterNode(currentMap, isLastNode, pathPatternNode, value) {
    let nextMap;
    let paramsSet;

    if(
      this._parameters.get(pathPatternNode.name) &&
      this._parameters.get(pathPatternNode.name).pattern.toString() !==
        pathPatternNode.pattern.toString()
    ) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }
    if(!isLastNode) {
      nextMap = currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name) || new Map();
      if(!(nextMap instanceof Map)) {
        throw new YError('E_VALUE_OVERRIDE', pathPatternNode.name);
      }
    } else if(currentMap.get(PARAMETER_KEY_PREFIX + pathPatternNode.name)) {
      throw new YError('E_PARAM_OVERRIDE', pathPatternNode.name);
    }
    paramsSet = currentMap.get(PARAMETER_NODES) || new Set();
    paramsSet.add(pathPatternNode);
    currentMap.set(PARAMETER_NODES, paramsSet);
    this._parameters.set(pathPatternNode.name, pathPatternNode);
    currentMap.set(PARAMETER_KEY_PREFIX + pathPatternNode.name, isLastNode ? value : nextMap);
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
    const nodesLength = pathNodes.length;
    const result = [this._nodesLengthMap.get(nodesLength), {}];

    debug('Testing a new path:', pathNodes);

    if('undefined' === typeof result[0]) {
      debug('No path pattern of this length:', nodesLength);
      return result;
    }

    return pathNodes.reduce(([currentMap, parameters], pathNode, index) => {
      let candidateValue;

      debug('Testing node:', pathNode);
      if('undefined' === typeof currentMap) {
        debug('No map found', pathNode);
        return [currentMap, parameters];
      }

      candidateValue = currentMap.get(pathNode);
      if(candidateValue) {
        debug('Value found on the node basis:', pathNode);
        return [candidateValue, parameters];
      }
      debug('No value found on the node basis:', pathNode);
      (currentMap.get(PARAMETER_NODES) || []).forEach((parameter) => {
        debug('Testing node against parameter:', pathNode, parameter);
        if(parameter.pattern.test(pathNode)) {
          candidateValue = currentMap.get(PARAMETER_KEY_PREFIX + parameter.name);
          parameters = _assignQueryStringPart(parameter, parameters, pathNode);
        }
      });
      return [candidateValue, parameters];
    }, result);
  }

}

function _assignQueryStringPart(paramDefinition, parameters, pathNode) {
  // Supporting only a subset of JSON schema core
  // http://json-schema.org/latest/json-schema-core.html#rfc.section.4.2
  const value = 'string' === paramDefinition.type ?
    pathNode :
    'boolean' === paramDefinition.type ?
    _parseBoolean(pathNode) :
    'number' === paramDefinition.type ?
    _parseReentrantNumber(pathNode) :
    (() => {
      throw new YError('E_UNSUPPORTED_TYPE', paramDefinition.name, paramDefinition.type);
    })();
  parameters[paramDefinition.name] = value;
  return parameters;
}

function _parseReentrantNumber(str) {
  const value = parseFloat(str, BASE_10);

  if(value.toString(BASE_10) !== str) {
    throw new YError('E_NON_REENTRANT_NUMBER', str, value.toString(BASE_10));
  }

  return value;
}

function _parseBoolean(str) {
  if('true' === str) {
    return true;
  } else if('false' === str) {
    return false;
  }
  throw new YError('E_BAD_BOOLEAN', str);
}
