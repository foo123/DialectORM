let DialectORM = require('../../src/js/DialectORM.js');
let Dialect = require('./Dialect.js');
let MysqlDb = require('./MysqlDb.js')(DialectORM);

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
class PostMeta extends DialectORM
{
    static table = 'postmeta';
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
    'meta' : ['hasOne', PostMeta, ['post_id']],
    'comments' : ['hasMany', Comment, ['post_id']],
    'authors' : ['belongsToMany', User, ['user_id'], ['post_id'], 'user_post']
};
PostMeta.relationships = {
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

    /*let post = new Post({'content':'yet another js post..'});
    post.setComments([new Comment({'content':'yet still another js comment..'})]);
    post.setComments([new Comment({'content':'yet one more js comment..'})], {'merge':true});
    post.setAuthors([new User({'name':'yet another js user'}), await User.fetchByPk(5)]);
    post.setMeta(new PostMeta({'status':'approved','type':'article'}));
    await post.save({'withRelated':true});*/

    /*let post2 = new Post({'content':'js post to delete..'});
    await post2.save();*/

    print('Posts:');
    output(await Post.fetchAll({'withRelated' : ['meta', 'comments', 'authors']}));

    //await post2.del();

    print('Posts:');
    output(await Post.fetchAll({
        'withRelated' : ['meta', 'comments', 'authors'],
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