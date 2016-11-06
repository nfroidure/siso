import Siso from './index';
import assert from 'assert';

describe('siso', () => {
  describe('constructor', () => {
    it('should work', () => {
      const siso = new Siso();

      assert.equal(typeof siso.register, 'function');
      assert.equal(typeof siso.find, 'function');
    });
  });

  describe('register', () => {
    it('should work with no node', () => {
      const siso = new Siso();

      siso.register([], 'no.node');
    });

    it('should work with string nodes', () => {
      const siso = new Siso();

      siso.register([
        'v1',
      ], 'v1');

      siso.register([
        'v1',
        'users',
      ], 'user.list');

      siso.register([
        'v1',
        'users',
        '1',
      ], 'user.1');
    });

    it('should work with parameter nodes', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
      ], 'user.list');

      siso.register([
        'v1',
        'users',
        {
          name: 'id',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'user.detail');
    });

    it('should fail with no value', () => {
      const siso = new Siso();

      assert.throws(() => {
        siso.register([
          'v1',
          'users',
        ]);
      }, /E_BAD_VALUE/);
    });

    it('should fail when registering a param with different patterns', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'user.detail.pictures');

      assert.throws(() => {
        siso.register([
          'v1',
          'users',
          {
            name: 'userId',
            pattern: /[0-9]{3}/,
          },
          'thumbnail',
        ], 'user.detail.pictures.thumbnail');
      }, /E_PARAM_OVERRIDE/);
    });

    it('should fail when registering pattern that override a value', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[a-f0-9]{24}/,
        },
        'pictures',
      ], 'user.detail.pictures');

      assert.throws(() => {
        siso.register([
          'v1',
          'users',
          {
            name: 'userId',
            pattern: /[a-f0-9]{24}/,
          },
          'pictures',
        ], 'user.detail.pictures2');
      }, /E_NODE_OVERRIDE/);
    });

    it('should fail when registering pattern that override a value', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'user.detail.pictures');

      assert.throws(() => {
        siso.register([
          'v1',
          'users',
          {
            name: 'userId',
            pattern: /[0-9]{2}/,
          },
        ], 'user.detail.pictures2');
      }, /E_PARAM_OVERRIDE/);
    });
  });

  describe('find', () => {
    it('should work with nothing registered', () => {
      const siso = new Siso();

      assert.deepEqual(
        siso.find('v1'),
        [{}.undef, {}],
        'Fail with one node'
      );

      assert.deepEqual(
        siso.find('v1', 'users', '1'),
        [{}.undef, {}],
        'Fail with several nodes'
      );
    });

    it('should work with one string', () => {
      const siso = new Siso();

      siso.register([
        'v1',
      ], 'v1_value');

      siso.register([
        'v2',
      ], 'v2_value');

      assert.deepEqual(
        siso.find(['v1']),
        ['v1_value', {}],
        'Work with the first registered node'
      );

      assert.deepEqual(
        siso.find(['v2']),
        ['v2_value', {}],
        'Work with the second registered node'
      );

      assert.deepEqual(
        siso.find(['v3']),
        [{}.undef, {}],
        'Fail with non registered content'
      );
    });

    it('should work with several strings', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
      ], 'user.list');

      siso.register([
        'v1',
        'organizations',
      ], 'organization.list');

      assert.deepEqual(
        siso.find(['v1', 'users']),
        ['user.list', {}],
        'Work with the first registered node'
      );

      assert.deepEqual(
        siso.find(['v1', 'organizations']),
        ['organization.list', {}],
        'Work with the second registered node'
      );

      assert.deepEqual(
        siso.find(['v2', 'organizations']),
        [{}.undef, {}],
        'Fail with non registered content'
      );
    });

    it('should work with only one param node', () => {
      const siso = new Siso();

      siso.register([
        {
          name: 'id',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'id_value');

      siso.register([
        {
          name: 'type',
          pattern: /lol|test/,
        },
      ], 'type_value');

      assert.deepEqual(
        siso.find(['abbacacaabbacacaabbacaca']),
        ['id_value', { id: 'abbacacaabbacacaabbacaca' }],
        'Work with the first registered nodes'
      );
      assert.deepEqual(
        siso.find(['lol']),
        ['type_value', { type: 'lol' }],
        'Work with the second registered nodes'
      );
      assert.deepEqual(
        siso.find(['test']),
        ['type_value', { type: 'test' }],
        'Work with the second registered nodes'
      );
      assert.deepEqual(
        siso.find(['whatdoyouwant']),
        [{}.undef, {}],
        'Fail with no match'
      );
    });

    it('should work with one param at the begining', () => {
      const siso = new Siso();

      siso.register([
        {
          name: 'id',
          pattern: /[a-f0-9]{24}/,
        },
        'id_test',
      ], 'id_value');

      siso.register([
        {
          name: 'type',
          pattern: /lol|test/,
        },
        'type_test',
      ], 'type_value');

      assert.deepEqual(
        siso.find(['abbacacaabbacacaabbacaca', 'id_test']),
        ['id_value', { id: 'abbacacaabbacacaabbacaca' }],
        'Should work with the first registered nodes'
      );

      assert.deepEqual(
        siso.find(['abbacacaabbacacaabbacaca', 'id_test']),
        ['id_value', { id: 'abbacacaabbacacaabbacaca' }],
        'Should work with the second registered nodes'
      );

      assert.deepEqual(
        siso.find(['whatdoyouwant']),
        [{}.undef, {}],
        'Should fail with unregistered pathes'
      );

      assert.deepEqual(
        siso.find(['what', 'do', 'you', 'want']),
        [{}.undef, {}],
        'Should fail with unregistered pathes'
      );

      assert.deepEqual(
        siso.find([
          'abbacacaabbacacaabbacaca',
          'abbacacaabbacacaabbacaca',
          'abbacacaabbacacaabbacaca',
        ]),
        [{}.undef, {}],
        'Should fail with unregistered pathes'
      );

      assert.deepEqual(
        siso.find(['abbacacaabbacacaabbacaca', 'id_test', 'test']),
        [{}.undef, {}],
        'Should fail with pathes begining with a registered'
      );
    });

    it('should work with one params at the end', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'user.detail');

      siso.register([
        'v1',
        'organizations',
        {
          name: 'organizationId',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'organization.detail');

      assert.deepEqual(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca']),
        ['user.detail', { userId: 'abbacacaabbacacaabbacaca' }]
      );
    });

    it('should work with params in the middle', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[a-f0-9]{24}/,
        },
        'pictures',
      ], 'user.detail.pictures');

      siso.register([
        'v1',
        'organizations',
        {
          name: 'organizationId',
          pattern: /[a-f0-9]{24}/,
        },
      ], 'organization.detail');

      assert.deepEqual(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca', 'pictures']),
        ['user.detail.pictures', { userId: 'abbacacaabbacacaabbacaca' }]
      );
    });

    it('should work with several params', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /^[a-f0-9]{24}$/,
        },
        'pictures',
        {
          name: 'pictureNumber',
          pattern: /^[0-9]{1}$/,
        },
      ], 'user.detail.pictures.num');

      siso.register([
        'v1',
        'users',
        {
          name: 'userId2',
          pattern: /[a-f0-9]{26}/,
        },
        'pictures',
        {
          name: 'pictureNumber2',
          pattern: /[0-9]{2}/,
        },
      ], 'user2.detail.pictures.num');

      assert.deepEqual(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacaca', 'pictures', '1']),
        [
          'user.detail.pictures.num',
          { userId: 'abbacacaabbacacaabbacaca', pictureNumber: '1' },
        ]
      );

      assert.deepEqual(
        siso.find(['v1', 'users', 'abbacacaabbacacaabbacacaaa', 'pictures', '11']),
        [
          'user2.detail.pictures.num',
          { userId2: 'abbacacaabbacacaabbacacaaa', pictureNumber2: '11' },
        ]
      );
    });

    it('should work when registering a node that has value and subnodes', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
      ], 'user.list');

      siso.register([
        'v1',
        'users',
        'pictures',
      ], 'user.list.pictures');

      assert.deepEqual(
        siso.find(['v1', 'users']),
        ['user.list', {}]
      );

      assert.deepEqual(
        siso.find(['v1', 'users', 'pictures']),
        ['user.list.pictures', {}]
      );
    });

    it('should work when registering a param that has value and subnodes', () => {
      const siso = new Siso();

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[0-9]+/,
        },
      ], 'user.detail');

      siso.register([
        'v1',
        'users',
        {
          name: 'userId',
          pattern: /[0-9]+/,
        },
        'pictures',
      ], 'user.detail.pictures');

      assert.deepEqual(
        siso.find(['v1', 'users', '1']),
        ['user.detail', { userId: 1 }]
      );

      assert.deepEqual(
        siso.find(['v1', 'users', '1', 'pictures']),
        ['user.detail.pictures', { userId: 1 }]
      );
    });
  });
});
