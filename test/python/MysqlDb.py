def getDB(DialectORM):
    import re
    import mysql.connector

    notSelectRE = re.compile(r'^(insert|delete|update|replace|drop|create|alter)\s+', re.I)
    insertReplaceRE = re.compile(r'^(insert|replace)\s+', re.I)

    class MysqlDb(DialectORM.IDb):

        def __init__(self, conf=dict(), vendor=''):
            self.dbh = None
            self.conf = {}
            self._vendor = ''
            self.last_query = None
            self.last_result = None
            self.num_rows = 0
            self.insert_id = '0'
            self.conf = conf
            self._vendor = str(vendor)
            if conf: self.connect(conf)

        def __del__(self):
            if self.dbh and hasattr(self, 'disconnect'):
                self.disconnect()
            self.dbh = None

        def vendor(self):
            return self._vendor

        def escapeWillQuote(self):
            return False

        def escape(self, s):
            if not self.dbh:
                self.connect(self.conf)
            cursor = self.dbh.cursor()
            se = cursor._connection.converter.escape(str(s))
            cursor.close()
            return se

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
            self.dbh = mysql.connector.connect(host=conf['host'],database=conf['db'],user=conf['user'],password=conf['password'])

            return self

        def disconnect(self):
            if self.dbh and self.dbh.is_connected():
                self.dbh.close()

            self.dbh = None
            return self

        def query(self, query):
            query = str(query).strip()

            # initialise return
            self.last_query = query
            self.num_rows = 0
            self.insert_id = '0'
            self.last_result = []

            # If there is no existing database connection then try to connect
            if not self.dbh:
                self.connect(self.conf)

            # Query was an insert, delete, update, replace
            if notSelectRE.match(query):

                # Perform the query and log number of affected rows
                cursor = self.dbh.cursor(dictionary=True)
                cursor.execute(query)

                # Take note of the insert_id
                if insertReplaceRE.match(query):
                    self.insert_id = str(cursor.lastrowid)


                self.dbh.commit()

                self.num_rows = cursor.rowcount

                cursor.close()
                return {'affectedRows' : self.num_rows, 'insertId' : self.insert_id}

            # Query was an select
            else:
                # Perform the query and log number of affected rows
                cursor = self.dbh.cursor(dictionary=True)
                cursor.execute(query)

                is_insert = False

                # Store Query Results
                self.last_result = cursor.fetchall()

                self.num_rows = cursor.rowcount

                cursor.close()
                return self.last_result


        def get(self, query):
            return self.query(query)

    return MysqlDb
