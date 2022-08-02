# DialectORM

Tiny, fast, super-simple but versatile **Object-Relational-Mapper (ORM)** **with Relationships** and **Object-NoSql-Mapper** for **PHP**, **Python**, **JavaScript**


![DialectORM](/dialectorm.jpg)

**see also:**

* [ModelView](https://github.com/foo123/modelview.js) a simple, fast, powerful and flexible MVVM framework for JavaScript
* [tico](https://github.com/foo123/tico) a tiny, super-simple MVC framework for PHP
* [LoginManager](https://github.com/foo123/LoginManager) a simple, barebones agnostic login manager for PHP, JavaScript, Python
* [SimpleCaptcha](https://github.com/foo123/simple-captcha) a simple, image-based, mathematical captcha with increasing levels of difficulty for PHP, JavaScript, Python
* [Dromeo](https://github.com/foo123/Dromeo) a flexible, and powerful agnostic router for PHP, JavaScript, Python
* [PublishSubscribe](https://github.com/foo123/PublishSubscribe) a simple and flexible publish-subscribe pattern implementation for PHP, JavaScript, Python
* [Importer](https://github.com/foo123/Importer) simple class &amp; dependency manager and loader for PHP, JavaScript, Python
* [Contemplate](https://github.com/foo123/Contemplate) a fast and versatile isomorphic template engine for PHP, JavaScript, Python
* [HtmlWidget](https://github.com/foo123/HtmlWidget) html widgets, made as simple as possible, both client and server, both desktop and mobile, can be used as (template) plugins and/or standalone for PHP, JavaScript, Python (can be used as [plugins for Contemplate](https://github.com/foo123/Contemplate/blob/master/src/js/plugins/plugins.txt))
* [Paginator](https://github.com/foo123/Paginator)  simple and flexible pagination controls generator for PHP, JavaScript, Python
* [Formal](https://github.com/foo123/Formal) a simple and versatile (Form) Data validation framework based on Rules for PHP, JavaScript, Python
* [Dialect](https://github.com/foo123/Dialect) a cross-vendor &amp; cross-platform SQL Query Builder, based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [DialectORM](https://github.com/foo123/DialectORM) an Object-Relational-Mapper (ORM) and Object-Document-Mapper (ODM), based on [Dialect](https://github.com/foo123/Dialect), for PHP, JavaScript, Python
* [Unicache](https://github.com/foo123/Unicache) a simple and flexible agnostic caching framework, supporting various platforms, for PHP, JavaScript, Python
* [Xpresion](https://github.com/foo123/Xpresion) a simple and flexible eXpression parser engine (with custom functions and variables support), based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [Regex Analyzer/Composer](https://github.com/foo123/RegexAnalyzer) Regular Expression Analyzer and Composer for PHP, JavaScript, Python



**Dependencies:**

* [Dialect](https://github.com/foo123/Dialect)
* **PHP: 5.3+**
* **Python: 3+**
* **JavaScript: ES7+**

**Supports:**

* **Relational Datastores**: MySql, MariaDB, Postgresql, Sql Server, Sqlite, easily extended to other Relational Stores via adding Dialect configuration
* **NoSql / Key-Value DataStores**: Redis, Mongodb (example in progress), easily extended to other NoSql Stores via providing adapter


**example (see `/test` folder)**

```php
define('DIR', dirname(__FILE__));
include(DIR.'/../../src/php/DialectORM.php');
include(DIR.'/PDODb.php');

DialectORM::dependencies([
    'Dialect' => DIR.'/Dialect.php',
]);
DialectORM::DBHandler(new PDODb([
    'dsn' => 'mysql:host=localhost;dbname=dialectorm',
    'user' => 'dialectorm',
    'password' => 'dialectorm'
], 'mysql'));

class Post extends DialectORM
{
    public static $table = 'posts';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'content'];
    public static $relationships = [
        'meta' => ['hasOne', 'PostMeta', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
        'comments' => ['hasMany', 'Comment', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
        'authors' => ['belongsToMany', 'User', 'user_id', 'post_id', 'user_post'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeContent($x)
    {
        return (string)$x;
    }

    public function validateContent($x)
    {
        return 0 < strlen($x);
    }
}

class PostMeta extends DialectORM
{
    public static $table = 'postmeta';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'status', 'type', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', 'post_id'] // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typePostId($x)
    {
        return (int)$x;
    }

    public function typeStatus($x)
    {
        return strtolower((string)$x);
    }

    public function typeType($x)
    {
        return strtolower((string)$x);
    }

    public function validateStatus($x)
    {
        return in_array($x, ['approved', 'published', 'suspended']);
    }

    public function validateType($x)
    {
        return in_array($x, ['article', 'tutorial', 'general']);
    }
}

class Comment extends DialectORM
{
    public static $table = 'comments';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'content', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', 'post_id'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeContent($x)
    {
        return (string)$x;
    }

    public function typePostId($x)
    {
        return (int)$x;
    }

    public function validateContent($x)
    {
        return 0 < strlen($x);
    }
}

class User extends DialectORM
{
    public static $table = 'users';
    public static $pk = 'id'; // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    public static $fields = ['id', 'name'];
    public static $relationships = [
        'posts' => ['belongsToMany', 'Post', 'post_id', 'user_id', 'user_post'], // primary and/or foreign keys can also be composite keys, define with an array of keys eg ['k1', 'k2']
    ];

    public function typeId($x)
    {
        return (int)$x;
    }

    public function typeName($x)
    {
        return (string)$x;
    }

    public function validateName($x)
    {
        return 0 < strlen($x);
    }
}

$post = new Post(['content'=>'another post..']);
// alternative
//$post = new Post(); $post->setContent('another post..');

$post->setComments([new Comment(['content'=>'another comment..'])]);
$post->setComments([new Comment(['content'=>'still another comment..'])], ['merge'=>true]);

$post->setAuthors([new User(['name'=>'bar'])], ['merge'=>true]);

// alternative
//$user = new User(['name'=>'bar']);
//$user->save();
//$post->assocAuthors([$user]);

// to simply dissociate from a many-to-many relationship
//$post->dissocAuthors([$user]);

$post->save(['withRelated'=>['comments','authors']]);

//$post->delete(['withRelated'=>true]);

$count = Post::count(['conditions'=>[/*..*/]]);
$posts = Post::fetchAll(['withRelated'=>['comments','authors']]); // eager load of relationships, no N+1 problem

//foreach(Post::fetchAll() as $post) $post->getComments(); // lazy load of relationships, N+1 problem
```