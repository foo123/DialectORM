def getStorage(DialectNoSql):
    import json
    import redis

    class RedisStorage(DialectNoSql.INoSql):

        def __init__(self, opts=dict()):
            options = {
                'host': '127.0.0.1',
                'port': 6379,
                'namespace': ''
            }
            options.update(opts)
            self.client = redis.Redis(host=options['host'], port=options['port'])
            self.keyPrefix = str(options['namespace'])

        def vendor(self):
            return 'redis'

        def supportsPartialUpdates(self):
            return False

        def supportsConditionalQueries(self):
            return False

        def insert(self, collection, key, data):
            self.client.set(self.getKeyName(collection, key), json.dumps(data))
            return 1

        def update(self, collection, key, data):
            return self.insert(collection, key, data)

        def delete(self, collection, key):
            self.client.unlink(self.getKeyName(collection, key))
            return 1

        def find(self, collection, key):
            data = self.client.get(self.getKeyName(collection, key))
            return None if not data else json.loads(data.decode('utf-8'))

        def findAll(self, collection, conditions):
            return None

        def getKeyName(self, collection, key = None):
            return self.keyPrefix + str(collection) + ':' + ('' if not key else (':'.join(map(str, key.values())) if isinstance(key, dict) else str(key)))

    return RedisStorage
