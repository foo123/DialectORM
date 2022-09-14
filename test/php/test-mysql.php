<?php

define('DIR', dirname(__FILE__));
include(DIR . '/../../src/php/DialectORM.php');
include(DIR . '/sql/pdo-mysql.php');

DialectORM::dependencies([
    'Dialect' => DIR . '/../../../Dialect/src/php/Dialect.php',
]);
DialectORM::DBHandler(new PDODb([
    'dsn' => 'mysql:host=localhost;dbname=dialectorm',
    'user' => 'dialectorm',
    'password' => 'dialectorm'
], 'mysql'));

class Post extends DialectORM
{
    public static $table = 'posts';
    public static $pk = ['id'];
    public static $fields = ['id', 'content'];
    public static $relationships = [
        'meta' => ['hasOne', 'PostMeta', ['post_id']],
        'comments' => ['hasMany', 'Comment', ['post_id']],
        'authors' => ['belongsToMany', 'User', ['user_id'], ['post_id'], 'user_post'],
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
    public static $pk = ['id'];
    public static $fields = ['id', 'status', 'type', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', ['post_id']]
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
    public static $pk = ['id'];
    public static $fields = ['id', 'content', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', ['post_id']],
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
    public static $pk = ['id'];
    public static $fields = ['id', 'name'];
    public static $relationships = [
        'posts' => ['belongsToMany', 'Post', ['post_id'], ['user_id'], 'user_post'],
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

function output($data)
{
    if (is_array($data))
    {
        echo json_encode(array_map(function($d){return $d->toArray(true);}, $data), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    elseif ($data instanceof DialectORM)
    {
        echo json_encode($data->toArray(true), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    else
    {
        echo ((string)$data) . PHP_EOL;
    }
}

function test()
{
    output('Posts: ' . (string)Post::count());
    output('Users: ' . (string)User::count());

    /*$post = new Post(['content'=>'yet another php post..']);
    $post->setComments([new Comment(['content'=>'yet still another php comment..'])]);
    $post->setComments([new Comment(['content'=>'yet one more php comment..'])], ['merge'=>true]);
    $post->setAuthors([new User(['name'=>'yet another php user']), User::fetchByPk(3)]);
    $post->setMeta(new PostMeta(['status'=>'approved','type'=>'article']));
    $post->save(['withRelated'=>true]);*/

    /*$post2 = new Post(['content'=>'php post to delete..']);
    $post2->save();*/

    print('Posts:');
    output(Post::fetchAll(['withRelated' => ['meta', 'comments', 'authors']]));

    //$post2->delete();

    print('Posts:');
    output(Post::fetchAll([
        'withRelated' => ['meta', 'comments', 'authors'],
        'related' => [
            'authors' => ['conditions'=>['clause'=>['or'=>[
                ['name'=>['like'=>'user']],
                ['name'=>['like'=>'foo']],
                ['name'=>['like'=>'bar']]
            ]]]],
            'comments' => ['limit'=>1] // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        ]
    ]));
}

test();