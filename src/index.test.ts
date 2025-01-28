import { describe, test, expect } from '@jest/globals';
import { Siso } from './index.js';
import { YError } from 'yerror';

describe('siso', () => {
  describe('constructor', () => {
    test('should work', () => {
      const siso = new Siso();

      expect(typeof siso.register).toEqual('function');
      expect(typeof siso.find).toEqual('function');
    });
  });

  describe('register', () => {
    test('should work with no node', () => {
      const siso = new Siso();

      siso.register([], 'no.node');
    });

    test('should work with string nodes', () => {
      const siso = new Siso();

      siso.register(['v1'], 'v1');

      siso.register(['v1', 'users'], 'user.list');

      siso.register(['v1', 'users', '1'], 'user.1');
    });

    test('should work with parameter nodes', () => {
      const siso = new Siso();

      siso.register(['v1', 'users'], 'user.list');

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'id',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'user.detail',
      );
    });

    test('should fail with no value', () => {
      const siso = new Siso();

      try {
        siso.register(['v1', 'users'], undefined);
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_BAD_VALUE (): E_BAD_VALUE]`,
        );
      }
    });

    test('should fail when registering a param with different patterns', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'user.detail.pictures',
      );

      try {
        siso.register(
          [
            'v1',
            'users',
            {
              name: 'userId',
              type: 'number',
              pattern: '[0-9]{3}',
            },
            'thumbnail',
          ],
          'user.detail.pictures.thumbnail',
        );
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_PARAM_OVERRIDE (userId): E_PARAM_OVERRIDE]`,
        );
      }
    });

    test('should fail when registering pattern that override a value', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
          'pictures',
        ],
        'user.detail.pictures',
      );

      try {
        siso.register(
          [
            'v1',
            'users',
            {
              name: 'userId',
              type: 'string',
              pattern: '[a-f0-9]{24}',
            },
            'pictures',
          ],
          'user.detail.pictures2',
        );
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_NODE_OVERRIDE (pictures): E_NODE_OVERRIDE]`,
        );
      }
    });

    test('should fail when registering pattern that override a value', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'user.detail.pictures',
      );

      try {
        siso.register(
          [
            'v1',
            'users',
            {
              name: 'userId',
              type: 'number',
              pattern: '[0-9]{2}',
            },
          ],
          'user.detail.pictures2',
        );
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toMatchInlineSnapshot(
          `[YError: E_PARAM_OVERRIDE (userId): E_PARAM_OVERRIDE]`,
        );
      }
    });
  });

  describe('find', () => {
    describe('should work with nothing registered', () => {
      const siso = new Siso();

      test('should fail with one node', () => {
        expect(siso.find(['v1'])).toEqual([undefined, {}]);
      });

      test('should fail with several nodes', () => {
        expect(siso.find(['v1', 'users', '1'])).toEqual([undefined, {}]);
      });
    });

    describe('should work with one string', () => {
      const siso = new Siso();

      siso.register(['v1'], 'v1_value');

      siso.register(['v2'], 'v2_value');

      test('should work with the first registered node', () => {
        expect(siso.find(['v1'])).toEqual(['v1_value', {}]);
      });

      test('should work with the second registered node', () => {
        expect(siso.find(['v2'])).toEqual(['v2_value', {}]);
      });

      test('should fail with non registered content', () => {
        expect(siso.find(['v3'])).toEqual([undefined, {}]);
      });
    });

    describe('should work with several strings', () => {
      const siso = new Siso();

      siso.register(['v1', 'users'], 'user.list');

      siso.register(['v1', 'organizations'], 'organization.list');

      test('should work with the first registered node', () => {
        expect(siso.find(['v1', 'users'])).toEqual(['user.list', {}]);
      });

      test('should work with the second registered node', () => {
        expect(siso.find(['v1', 'organizations'])).toEqual([
          'organization.list',
          {},
        ]);
      });

      test('should fail with non registered content', () => {
        expect(siso.find(['v2', 'organizations'])).toEqual([undefined, {}]);
      });
    });

    describe('should work with only one param node', () => {
      const siso = new Siso();

      siso.register(
        [
          {
            name: 'id',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'id_value',
      );

      siso.register(
        [
          {
            name: 'type',
            type: 'string',
            pattern: 'lol|test',
          },
        ],
        'type_value',
      );

      test('should work with the first registered nodes', () => {
        expect(siso.find(['abbacacaabbacacaabbacaca'])).toEqual([
          'id_value',
          { id: 'abbacacaabbacacaabbacaca' },
        ]);
      });

      test('should work with the second registered nodes', () => {
        expect(siso.find(['lol'])).toEqual(['type_value', { type: 'lol' }]);
      });

      test('should work with the second registered nodes', () => {
        expect(siso.find(['test'])).toEqual(['type_value', { type: 'test' }]);
      });

      test('should fail with no match', () => {
        expect(siso.find(['whatdoyouwant'])).toEqual([undefined, {}]);
      });
    });

    describe('should work with one param at the begining', () => {
      const siso = new Siso();

      siso.register(
        [
          {
            name: 'id',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
          'id_test',
        ],
        'id_value',
      );

      siso.register(
        [
          {
            name: 'type',
            type: 'string',
            pattern: 'lol|test',
          },
          'type_test',
        ],
        'type_value',
      );

      test('should should work with the first registered nodes', () => {
        expect(siso.find(['abbacacaabbacacaabbacaca', 'id_test'])).toEqual([
          'id_value',
          { id: 'abbacacaabbacacaabbacaca' },
        ]);
      });

      test('should work with the second registered nodes', () => {
        expect(siso.find(['abbacacaabbacacaabbacaca', 'id_test'])).toEqual([
          'id_value',
          { id: 'abbacacaabbacacaabbacaca' },
        ]);
      });

      test('should fail with unregistered pathes ', () => {
        expect(siso.find(['whatdoyouwant'])).toEqual([undefined, {}]);
      });

      test('should fail with unregistered pathes', () => {
        expect(siso.find(['what', 'do', 'you', 'want'])).toEqual([
          undefined,
          {},
        ]);
      });

      test('should fail with unregistered pathes', () => {
        expect(
          siso.find([
            'abbacacaabbacacaabbacaca',
            'abbacacaabbacacaabbacaca',
            'abbacacaabbacacaabbacaca',
          ]),
        ).toEqual([undefined, {}]);
      });

      test('should fail with pathes begining with a registered', () => {
        expect(
          siso.find(['abbacacaabbacacaabbacaca', 'id_test', 'test']),
        ).toEqual([undefined, {}]);
      });
    });

    test('should work with one params at the end', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'user.detail',
      );

      siso.register(
        [
          'v1',
          'organizations',
          {
            name: 'organizationId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'organization.detail',
      );

      expect(siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca'])).toEqual([
        'user.detail',
        { userId: 'abbacacaabbacacaabbacaca' },
      ]);
    });

    test('should work with params in the middle', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
          'pictures',
        ],
        'user.detail.pictures',
      );

      siso.register(
        [
          'v1',
          'organizations',
          {
            name: 'organizationId',
            type: 'string',
            pattern: '[a-f0-9]{24}',
          },
        ],
        'organization.detail',
      );

      expect(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca', 'pictures']),
      ).toEqual([
        'user.detail.pictures',
        { userId: 'abbacacaabbacacaabbacaca' },
      ]);
    });

    test('should work with several params', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '^[a-f0-9]{24}$',
          },
          'pictures',
          {
            name: 'pictureNumber',
            type: 'string',
            pattern: '^[0-9]{1}$',
          },
        ],
        'user.detail.pictures.num',
      );

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId2',
            type: 'string',
            pattern: '[a-f0-9]{26}',
          },
          'pictures',
          {
            name: 'pictureNumber2',
            type: 'string',
            pattern: '[0-9]{2}',
          },
        ],
        'user2.detail.pictures.num',
      );

      expect(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca', 'pictures', '1']),
      ).toEqual([
        'user.detail.pictures.num',
        { userId: 'abbacacaabbacacaabbacaca', pictureNumber: '1' },
      ]);

      expect(
        siso.find([
          'v1',
          'users',
          'abbacacaabbacacaabbacacaaa',
          'pictures',
          '11',
        ]),
      ).toEqual([
        'user2.detail.pictures.num',
        { userId2: 'abbacacaabbacacaabbacacaaa', pictureNumber2: '11' },
      ]);
    });

    test('should work when registering a node that has value and subnodes', () => {
      const siso = new Siso();

      siso.register(['v1', 'users'], 'user.list');

      siso.register(['v1', 'users', 'pictures'], 'user.list.pictures');

      expect(siso.find(['v1', 'users'])).toEqual(['user.list', {}]);

      expect(siso.find(['v1', 'users', 'pictures'])).toEqual([
        'user.list.pictures',
        {},
      ]);
    });

    test('should work when registering a param that has value and subnodes', () => {
      const siso = new Siso();

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[0-9]+',
          },
        ],
        'user.detail',
      );

      siso.register(
        [
          'v1',
          'users',
          {
            name: 'userId',
            type: 'string',
            pattern: '[0-9]+',
          },
          'pictures',
        ],
        'user.detail.pictures',
      );

      expect(siso.find(['v1', 'users', '1'])).toEqual([
        'user.detail',
        { userId: '1' },
      ]);

      expect(siso.find(['v1', 'users', '1', 'pictures'])).toEqual([
        'user.detail.pictures',
        { userId: '1' },
      ]);
    });

    describe('should work with number param', () => {
      const siso = new Siso();

      siso.register(
        [
          'users',
          {
            name: 'id',
            type: 'number',
            pattern: '^[0-9]+$',
          },
        ],
        'id_value',
      );

      test('should work with the good type in output', () => {
        expect(siso.find(['users', '15'])).toEqual(['id_value', { id: 15 }]);
      });

      test('should fail with a bad type in input', () => {
        expect(siso.find(['users', '15.67'])).toEqual([undefined, {}]);
      });
    });

    test('should work with boolean param', () => {
      const siso = new Siso();

      siso.register(
        [
          'lamp',
          {
            name: 'isOn',
            type: 'boolean',
            pattern: 'false|true',
          },
        ],
        'id_value',
      );

      expect(siso.find(['lamp', 'false'])).toEqual([
        'id_value',
        { isOn: false },
      ]);

      expect(siso.find(['lamp', 'true'])).toEqual(['id_value', { isOn: true }]);
    });

    test('should work with enum param', () => {
      const siso = new Siso();

      siso.register(
        [
          'lamp',
          {
            name: 'isOn',
            type: 'boolean',
            enum: [false, true],
          },
        ],
        'id_value',
      );

      expect(siso.find(['lamp', 'false'])).toEqual([
        'id_value',
        { isOn: false },
      ]);

      expect(siso.find(['lamp', 'true'])).toEqual(['id_value', { isOn: true }]);
    });
  });
});
