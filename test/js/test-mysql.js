"use strict";
const DialectORM = require('../../src/js/DialectORM.js');
const Dialect = require('../../../Dialect/src/js/Dialect.js');
const MysqlDb = require('./sql/mysql.js')(DialectORM);

DialectORM.dependencies({
    'Dialect' : Dialect // provide actual class, i.e Dialect or path of module
});
DialectORM.DBHandler(new MysqlDb({
    'database' : 'dialectorm',
    'user' : 'dialectorm',
    'password' : 'dialectorm'
}, 'mysql'));

class Post extends DialectORM
{
    static table = 'posts';
    static pk = ['id'];
    static fields = ['id', 'content'];
    static extra_fields = ['postmeta', 'post_id', 'id', 'key', 'value'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeContent(x)
    {
        return String(x);
    }

    validateContent(x)
    {
        return 0 < x.length;
    }
}
class PostStatus extends DialectORM
{
    static table = 'poststatus';
    static pk = ['id'];
    static fields = ['id', 'status', 'type', 'post_id'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typePostId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeStatus(x)
    {
        return String(x).toLowerCase();
    }

    typeType(x)
    {
        return String(x).toLowerCase();
    }

    validateStatus(x)
    {
        return -1 !== ['approved', 'published', 'suspended'].indexOf(x);
    }

    validateType(x)
    {
        return -1 !== ['article', 'tutorial', 'general'].indexOf(x);
    }
}
class Comment extends DialectORM
{
    static table = 'comments';
    static pk = ['id'];
    static fields = ['id', 'content', 'post_id'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeContent(x)
    {
        return String(x);
    }

    typePostId(x)
    {
        return parseInt(x, 10) || 0;
    }

    validateContent(x)
    {
        return 0 < x.length;
    }
}
class User extends DialectORM
{
    static table = 'users';
    static pk = ['id'];
    static fields = ['id', 'name'];
    static relationships = {};

    typeId(x)
    {
        return parseInt(x, 10) || 0;
    }

    typeName(x)
    {
        return String(x);
    }

    validateName(x)
    {
        return 0 < x.length;
    }
}
Post.relationships = {
    'status' : ['hasOne', PostStatus, ['post_id']],
    'comments' : ['hasMany', Comment, ['post_id']],
    'authors' : ['belongsToMany', User, ['user_id'], ['post_id'], 'user_post']
};
PostStatus.relationships = {
    'post' : ['belongsTo', Post, ['post_id']]
};
Comment.relationships = {
    'post' : ['belongsTo', Post, ['post_id']]
};
User.relationships = {
    'posts' : ['belongsToMany', Post, ['post_id'], ['user_id'], 'user_post']
};

function print(x)
{
    console.log(x);
}
function output(data)
{
    if (Array.isArray(data))
        print(JSON.stringify(data.map(d => d.toObj(true)), null, 4));
    else if (data instanceof DialectORM)
        print(JSON.stringify(data.toObj(true), null, 4));
    else
        print(String(data));
}

async function test()
{
    output('Posts: ' + String(await Post.count()));
    output('Users: ' + String(await User.count()));

    let post = await Post.fetchAll({'conditions' : {'content' : 'a js post..'},'single' : true});
    if (!post)
    {
        post = new Post({'content':'a js post..'});
        post.setCustomField2('custom value 2');
        post.setComments([new Comment({'content':'a js comment..'})]);
        post.setComments([new Comment({'content':'one more js comment..'})], {'merge':true});
        post.setAuthors([new User({'name':'a js user'})]);
        post.setStatus(new PostStatus({'status':'approved','type':'article'}));
        await post.save({'withRelated':true});
    }
    output(post);

    print('Posts:');
    output(await Post.fetchAll({'withRelated' : ['status', 'comments', 'authors']}));

    print('Posts:');
    output(await Post.fetchAll({
        'conditions' : {'custom_field2' : 'custom value 2'},
        'withRelated' : ['status', 'comments', 'authors'],
        'related' : {
            'authors' : {'conditions':{'clause':{'or':[
                {'name':{'like':'user'}},
                {'name':{'like':'foo'}},
                {'name':{'like':'bar'}}
            ]}}},
            'comments' : {'limit':1} // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        }
    }));
}

test().then(() => process.exit()).catch(e => {print(e); process.exit();});