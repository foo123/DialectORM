<?php

define('DIR', dirname(__FILE__));
include(DIR.'/../../src/php/DialectORM.php');
include(DIR.'/PDODb.php');

DialectORM::setDependencies([
    'Dialect' => DIR.'/Dialect.php',
]);
DialectORM::setDB(new PDODb([
    'dsn' => 'mysql:host=localhost;dbname=dialectorm',
    'user' => 'dialectorm',
    'password' => 'dialectorm'
], 'mysql'));

class Post extends DialectORM
{
    public static $table = 'posts';
    public static $pk = 'id';
    public static $fields = ['id', 'content'];
    public static $relationships = [
        'comments' => ['hasMany', 'Comment', 'post_id'],
        'users' => ['belongsToMany', 'User', 'user_id', 'post_id', 'user_post'],
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

class Comment extends DialectORM
{
    public static $table = 'comments';
    public static $pk = 'id';
    public static $fields = ['id', 'content', 'post_id'];
    public static $relationships = [
        'post' => ['belongsTo', 'Post', 'post_id'],
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
    public static $pk = 'id';
    public static $fields = ['id', 'name'];
    public static $relationships = [
        'posts' => ['belongsToMany', 'Post', 'post_id', 'user_id', 'user_post'],
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
    if ( is_array($data) )
    {
        echo json_encode(array_map(function($d){return $d->toArray(true);}, $data), JSON_PRETTY_PRINT) . PHP_EOL;
    }
    elseif( $data instanceof DialectORM )
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

    /*$post = new Post(['content'=>'a php post..']);
    $post->setComments([new Comment(['content'=>'a php comment..'])]);
    $post->setComments([new Comment(['content'=>'another php comment..'])], ['merge'=>true]);
    $post->setUsers([new User(['name'=>'php user'])]);
    $post->save(['withRelated'=>true]);

    $post2 = new Post(['content'=>'php post to delete..']);
    $post2->save();*/

    print('Posts:');
    output(Post::getAll(['withRelated' => ['comments', 'users']]));

    //$post2->delete();

    print('Posts:');
    output(Post::getAll([
        'withRelated' => ['comments', 'users'],
        'related' => [
            'comments' => ['conditions'=>['content'=>['like'=>'php']]] // eager relationship loading with extra conditions, see `Dialect` lib on how to define conditions
        ]
    ]));
}

test();