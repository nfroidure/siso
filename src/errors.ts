/**
 * Global Error Registry for Siso
 */
declare module 'yerror' {
  interface YErrorRegistry {
    /**
     * Thrown when attempting to register a route with an undefined or invalid value.
     * The value parameter should be the invalid value that was provided.
     */
    E_BAD_VALUE: [value: unknown];

    /**
     * Thrown when attempting to override an existing route value with a different value.
     */
    E_VALUE_OVERRIDE: [nodeName: string, existingValue?: unknown];

    /**
     * Thrown when attempting to register a route that would override an existing static node.
     * The nodeName parameter is the name of the conflicting node.
     */
    E_NODE_OVERRIDE: [nodeName: string];

    /**
     * Thrown when attempting to register a dynamic parameter with the same name but different validation rules,
     * or when trying to override a dynamic leaf node with the same parameter name.
     * The paramName parameter is the name of the conflicting parameter.
     */
    E_PARAM_OVERRIDE: [paramName: string];

    /**
     * Thrown when encountering an unsupported parameter type during route matching.
     * The pattern parameter contains the invalid dynamic node configuration.
     */
    E_UNSUPPORTED_TYPE: [pattern: string, node: string];

    /**
     * Thrown when a number string cannot be parsed back to the same string (non-reentrant).
     * @param originalString The original string.
     * @param parsedValue The parsed and stringified version.
     */
    E_NON_REENTRANT_NUMBER: [originalString: string, parsedValue: string];

    /**
     * Thrown when a boolean value is not 'true' or 'false'.
     * @param invalidValue The invalid boolean string.
     */
    E_BAD_BOOLEAN: [invalidValue: string];
  }
}
