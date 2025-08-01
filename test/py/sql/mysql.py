def getDB(DialectORM):
    import asyncio
    import re
    import mysql.connector
    from mysql.connector.aio import connect as async_connect
    notSelectRE = re.compile(r'^(insert|delete|update|replace|drop|create|alter)\s+', re.I)
    insertReplaceRE = re.compile(r'^(insert|replace)\s+', re.I)

    class MysqlDb(DialectORM.IDb):

        def __init__(self, conf=dict(), vendor=''):
            self.dbh = None
            self.conf = {}
            self.vendorName = ''
            self.last_query = None
            self.last_result = None
            self.num_rows = 0
            self.insert_id = '0'
            self.conf = conf
            self.vendorName = str(vendor)
            self.is_async = False

        def __del__(self):
            if self.dbh:
                if hasattr(self,'async_disconnect') and self.is_async: asyncio.run(self.async_disconnect())
                if hasattr(self,'disconnect') and not self.is_async: self.disconnect()
            self.dbh = None

        def vendor(self):
            return self.vendorName

        #def escapeWillQuote(self):
        #    return False
        #
        #def escape(self, s):
        #    cursor = self.dbh.cursor()
        #    se = cursor._connection.converter.escape(str(s))
        #    cursor.close()
        #    return se

        def connect(self, cfg=dict()):
            # Must have a db and user
            conf = {
                'host' : 'localhost',
                'db' : '',
                'user' : '',
                'password' : ''
            }
            conf.update(cfg)

            if not conf['db'] or not conf['user']:
                raise Exception('DB: No db or user')

            self.dbh = None
            self.dbh = mysql.connector.connect(host=conf['host'],database=conf['db'],user=conf['user'],password=conf['password'],use_pure=True)
            self.is_async = False

            return self

        async def async_connect(self, cfg=dict()):
            # Must have a db and user
            conf = {
                'host' : 'localhost',
                'db' : '',
                'user' : '',
                'password' : ''
            }
            conf.update(cfg)

            if not conf['db'] or not conf['user']:
                raise Exception('DB: No db or user')

            self.dbh = None
            self.dbh = await async_connect(host=conf['host'],database=conf['db'],user=conf['user'],password=conf['password'],use_pure=True)
            self.is_async = True

            return self

        def disconnect(self):
            if self.dbh and self.dbh.is_connected():
                self.dbh.close()

            self.dbh = None
            return self

        async def async_disconnect(self):
            if self.dbh and self.dbh.is_connected():
                await self.dbh.close()

            self.dbh = None
            return self

        def query(self, sql):
            # If there is no existing database connection then try to connect
            if not self.dbh: self.connect(self.conf)

            sql = str(sql).strip()

            # initialise return
            self.last_query = sql
            self.num_rows = 0
            self.insert_id = '0'
            self.last_result = []

            # Query was an insert, delete, update, replace
            if notSelectRE.match(sql):

                # Perform the query and log number of affected rows
                cursor = self.dbh.cursor(dictionary=True)
                cursor.execute(sql)


                # Take note of the insert_id
                if insertReplaceRE.match(sql):
                    self.insert_id = str(cursor.lastrowid)

                self.dbh.commit()

                self.num_rows = cursor.rowcount

                cursor.close()
                return {'affectedRows': self.num_rows, 'insertId': self.insert_id}

            # Query was an select
            else:
                # Perform the query and log number of affected rows
                cursor = self.dbh.cursor(dictionary=True)
                cursor.execute(sql)

                # Store Query Results
                self.last_result = cursor.fetchall()

                self.num_rows = cursor.rowcount

                cursor.close()
                return self.last_result


        def get(self, sql):
            return self.query(sql)

        async def async_query(self, sql):
            # If there is no existing database connection then try to connect
            if not self.dbh: await self.async_connect(self.conf)

            sql = str(sql).strip()

            # initialise return
            self.last_query = sql
            self.num_rows = 0
            self.insert_id = '0'
            self.last_result = []

            # Query was an insert, delete, update, replace
            if notSelectRE.match(sql):

                # Perform the query and log number of affected rows
                cursor = await self.dbh.cursor(dictionary=True)
                await cursor.execute(sql)


                # Take note of the insert_id
                if insertReplaceRE.match(sql):
                    self.insert_id = str(cursor.lastrowid)

                await self.dbh.commit()

                self.num_rows = cursor.rowcount

                await cursor.close()
                return {'affectedRows': self.num_rows, 'insertId': self.insert_id}

            # Query was an select
            else:
                # Perform the query and log number of affected rows
                cursor = await self.dbh.cursor(dictionary=True)
                await cursor.execute(sql)

                # Store Query Results
                self.last_result = await cursor.fetchall()

                self.num_rows = cursor.rowcount

                await cursor.close()
                return self.last_result


        async def async_get(self, sql):
            return await self.async_query(sql)

    return MysqlDb
