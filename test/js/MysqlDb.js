"use strict";

module.exports = function( DialectORM ) {

var mysql = null;

// requires mysql2 node module
// https://github.com/sidorares/node-mysql2
try {
    mysql = require('mysql2');
} catch(e) {
    mysql = null;
}

var SELECT_RE = /^\(?select\s+/i;

class MysqlDb extends DialectORM.IDb
{
    conf = null;
    _vendor = '';
    dbh = null;
    num_rows = 0;
    insert_id = '0';
    last_query = null;
    last_result = null;

    constructor(conf, vendor='')
    {
        super();
        if ( !mysql ) throw new Error('mysql2 module is not installed!');
        this.conf = conf || null;
        this._vendor = String(vendor).trim();
        if (this.conf) this.connect();
    }

    dispose()
    {
        this.disconnect();
        this.dbh = null;
        this.conf = null;
        return this;
    }

    connect( )
    {
        if (!this.dbh && this.conf)
        {
            this.dbh = mysql.connect({
                host: this.conf.host || 'localhost',
                port: this.conf.port || 3306,
                user: this.conf.user,
                password: this.conf.password || '',
                database: this.conf.database,
                charset: this.conf.charset || 'UTF8_GENERAL_CI'
            });
        }
        return this;
    }

    disconnect()
    {
        if (this.dbh) this.dbh.close();
        this.dbh = null;
        return this;
    }

    vendor()
    {
        return this._vendor;
    }

    query(sql)
    {
        var self = this;
        return new Promise((resolve, reject) => {
            sql = String(sql).trim();
            self.last_query = sql;
            self.connect().dbh.query(sql, (err, result, fields) => {
                self.num_rows = 0;
                self.insert_id = '0';
                self.last_result = [];
                if ( err )
                {
                    reject(err);
                    return;
                }
                if ( SELECT_RE.test(sql) )
                {
                    self.last_result = result;
                    self.num_rows = result.length;
                    resolve(result);
                }
                else
                {
                    resolve({'affectedRows' : self.num_rows = (result.affectedRows || 0), 'insertId' : self.insert_id = String(result.insertId || 0)});
                }
            });
        });
    }

    get(sql)
    {
        return this.query(sql);
    }

    escape(v)
    {
        return this.connect().dbh.escape(String(v));
    }

    escapeWillQuote()
    {
        return true;
    }
}

return MysqlDb;
};
