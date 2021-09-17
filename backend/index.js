const express = require('express'),
  app = express();
  bodyParser = require('body-parser'),
  mongoose = require('mongoose'),
  cors = require('cors'),
  bcrypt = require('bcryptjs'),
  config = require('./config.json'),
  Post = require('./models/posts.js'),
  User = require('./models/users.js'),
  Comment = require('./models/comments.js'),
  port = 8080,
  ObjectId = mongoose.Types.ObjectId;

// ---------- set up ----------

app.use((req, res, next) => {
  console.log(`${req.method} request ${req.url}`);
  next();
});

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(cors());

app.get('/', (req, res) => res.send('hello from the backend'));

mongoose.connect(`mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASSWORD}@cluster0.${config.MONGO_CLUSTER_NAME}.mongodb.net/ZIP?retryWrites=true&w=majority`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('db connected yeahh');
  })
  .catch(err => {
    console.log(`errorrr oh no DBConnectionError: ${err.message}`);
});

app.listen(port, () => console.log(`Fullstack app is listening on port ${port}`));

// ---------- set up ENDS ----------

// ---------- post things (not HTTP post like post post) ----------

app.post('/postPost', (req, res) => {
  const newPost = new Post({
    _id: new mongoose.Types.ObjectId,
    author: req.body.username,
    title: req.body.title,
    descript: req.body.descript,
    img_url: req.body.image_url,
    stats: {
      likes: [],
      comments: 0
    },
    user_id: req.body.user_id
  });
  newPost.save()
    .then(result => {
      User.updateOne({
          _id: req.body.user_id
        },
        {
          $inc: { 'stats.posts': 1 }
        }
      ).then(result => {
        res.send(result);
      }).catch(err => {
        res.send(err);
      })
    })
    .catch(err => {
      res.send(err);
    });
});

app.get('/allPosts', (req, res) => {
  Post.aggregate([
    { $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'author'
      }
    // },
    // { $lookup: {
    //     from: 'comments',
    //     localField: 'post_id',
    //     foreignField: '_id',
    //     as: 'stats.comments'
    //   }
    }
  ]).then(result => {
    console.log(result);
    res.send(result);
  }).catch(err => {
    console.log(err);
    res.send(err);
  });
});

// app.get('/allPosts', (req, res) => {
//   Post.aggregate([
//     {
//       $lookup: {
//
//       }
//     }
//   ]).then(result => {
//     console.log(result);
//     res.send(result);
//   }).catch(err => {
//     res.send(err);
//   });
// });

app.get('/userPosts/:id', (req, res) => {
  Post.aggregate([
    { $match:
      { user_id: ObjectId(req.params.id) }
    },
    { $lookup:
      {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'author'
      }
    }
  ]).then(result => {
    console.log(result);
    res.send(result);
  }).catch(err => {
    console.log(err);
    res.send(err);
  });
});

app.patch('/editPost/:id', (req, res) => {
  // gotta do the find first so can verify user is editing own project (another secondary check)
  Post.findById(req.body.post_id, (err, post) => {
    if (post['user_id'] == req.body.user_id) {
      const upd8Post = {
        author: req.body.author,
        title: req.body.title,
        descript: req.body.descript,
        img_url: req.body.img_url
        // unsure if stats needs to be in this or can remain unedited from just leaving it out, hope so
      };
      Post.updateOne({
        _id: req.body.post_id
      }, editedPost)
        .then(result => {
          res.send(result);
        }).catch(err => {
          res.send(err);
        });
    } else {
      res.send('project not found');
    }
  });
});

// ---------- post things END ----------

app.get('/userOfPost/:id', (req, res) => {
  User.findOne({
    _id: req.params.id
  }).then(result => {
    res.send(result);
  }).catch(err => {
    res.send(err);
  });
});

// ---------- likes ----------

app.post('/likePost/:id', (req, res) => {
  Post.updateOne({
      _id: req.params.id
    },
    {
      // addToSet > push since add only adds user if user not alr in arr, just a secondary check so user can't like twice
      $addToSet: { 'stats.likes': req.body.user_id }
    }
  ).then(post => {
    User.updateOne({
        // user who gets likes stats +1 isn't the user who liked the post, but the user of the post author (if this doesn't work, follow deleteComment pattern (err, post)). also on beulla's, targets fields like: doc['field'] so that might work? or b synonymous not sure yet
        _id: post.user_id
      },
      {
        $inc: { 'stats.likes': 1 }
      }
    ).then(result => {
      // remember 2 upd8 html content to reflect new like
      res.send(result);
    }).catch(err => {
      res.send(err);
    });
  }).catch(err => {
    res.send(err);
  });
});

app.get('/hasLiked/:id', (req, res) => {
  User.findOne({
    _id: req.params.id
  }, (err, user) => {
    if (err) {
      console.log(err);
    }
    Post.aggregate([
      { $match:
        { $expr:
          { $in: [ user._id, '$stats.likes' ] }
        }
      },
      { $project:
        { _id: 1 }
      }
    ]).then(result => {
       res.send(result);
     }).catch(err => {
       res.send(err);
     });
  });

  // Post.find(
  //   {
  //     'stats.likes':
  //     {
  //       $in: [req.params.user_id, 'stats.likes']
  //     }
  //   }, (err, val) => {
  //     if (err) {
  //       console.log(err);
  //     }
  //     console.log(val);
  //     res.send(val);
  //   }
  // )


  // Post.findOne(
  //   {
  //     _id: req.params.id
  //   },
  //   {
  //     stats:
  //     {
  //       $in:
  //       [
  //         req.params.user_id, '$stats.likes'
  //       ]
  //     }
  //     // 'stats.likes': req.params.user_id
  //   }, (err, val) => {
  //     if (val) {
  //       console.log(val);
  //       res.send(val);
  //     } else {
  //       console.log(err, val);
  //       res.send(val);
  //     }
  //   }
  // )


  // Post.aggregate([
  //   {
  //     $project:
  //     {
  //       _id: req.params.id,
  //       liked:
  //       {
  //         $cond:
  //         {
  //           if: { $in: [ req.params.user_id, '$stats.likes' ] }, then: true, else: false
  //         }
  //       }
  //     }
  //   }
  // ])


  // console.log(req.params);
  // const user = req.params.user_id;
  // Post.find({
  //   _id: req.params._id,
  //   user: { $in: ['stats.likes'] }
  // }, (err, val) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     console.log(val);
  //     res.send(val);
  //   }
  // });
  // Post.aggregate([
  //   { $match:
  //     // {
  //     //
  //     // }
  //     { $expr:
  //       { $in:
  //         [ req.body.user_id, '$stats.likes']
  //       }
  //       // { $and:
  //       //   [ '$_id', req.params.id ]
  //       // }
  //     }
  //   }
  // ])
  // .then(result => {
  //   console.log(result);
  //   res.send(result);
  // }).catch(err => {
  //   res.send(err);
  // });


  // Post.aggregate([
  //   // {
  //   //   $match: {
  //   //     $in: {
  //   //       {
  //   //         'stats.likes': {
  //   //           $all: [ user_id ]
  //   //         }
  //   //       }
  //   //     }
  //   //   }
  //   // }
  //   {
  //     let: {
  //       user_id: 'user_id'
  //     }
  //   }
  // ], (err, val) => {
  //   res.send(val);
  // });
});

app.post('/unlikePost', (req, res) => {
  Post.updateOne({
      _id: req.params.id
    },
    {
      // i do wonder if syntax a bit off here since likes maybe nested nested object? prolly not but if buggy may b this
      $pull: { 'stats.likes': req.body.user_id }
    }
  ).then(post => {
    User.updateOne({
        // user who gets likes stats +1 isn't the user who liked the post, but the user of the post author (if this doesn't work, follow deleteComment pattern (err, post))
        _id: post.user_id
      },
      {
        $inc: { 'stats.likes': -1 }
      }
    ).then(result => {
      // remember 2 upd8 html content to reflect new like
      res.send(result);
    }).catch(err => {
      res.send(err);
    });
  }).catch(err => {
    res.send(err);
  });
});



// ---------- likes END ----------

// ---------- comments ----------

app.post('/createComment', (req, res) => {
  const newComment = new Comment({
    _id: new mongoose.Types.ObjectId,
    author: req.body.author,
    text: req.body.text,
    time: new Date(),
    user_id: req.body.user_id,
    post_id: req.body.post_id
  });
  newComment.save()
    .then(result => {
      Post.updateOne({
          _id: req.body.post_id
        },
        {
          $inc: { 'stats.comments': 1 }
        }
      ).then(result => {
        // assume that'll work -- can just add that (but a post?)
        res.send(newComment);
      }).catch(err => {
        res.send(err);
      });
    }).catch(err => {
      res.send(err);
    });
});

app.get('/seeComments/:id', (req, res) => {
  Comment.find({
    post_id: req.params.id
  }, (err, comments) => {
    if (comments) {
      res.send(comments);
    } else {
      res.send(err);
    }
  });
});

app.delete('/deleteComment/:id', (req, res) => {
  Comment.findOne({
    _id: req.params.id
  }, (err, comment) => {
    if (comment && comment['user_id'] == req.body.user_id) {
      Post.updateOne({
          _id: comment.post_id
        },
        {
          $inc: { 'stats.comments': -1 }
        }
      ).then(result => {
        Comment.deleteOne({
          _id: req.params.id
        }, err => {
          res.send('deleted');
        });
      }).catch(err => {
        res.send(err);
      });
    } else {
      res.send('not found / unauthorised');
    }
  });
});

// ---------- comments END ----------

// ---------- users login etc ----------

app.post('/newUser', (req, res) => {
  User.findOne({
    username: req.body.username,
  }, (err, userExists) => {
    if (userExists) {
      res.send('username already taken. pls use a different username.');
    } else {
      const hash = bcrypt.hashSync(req.body.password);
      const user = new User({
        _id: new mongoose.Types.ObjectId,
        username: req.body.username,
        password: hash,
        email: req.body.email,
        profl_pic: 'null',
        acc_type: 0,
        stats: {
          posts: 0,
          likes: 0
        }
      });
      user.save()
        .then(result => {
          res.send(result);
        }).catch(err => {
          res.send(err);
        });
    }
  })
});

app.post('/loginUser', (req, res) => {
  User.findOne({
    username: req.body.username
  }, (err, userExists) => {
    if (userExists) {
      if (bcrypt.compareSync(req.body.password, userExists.password)) {
        res.send(userExists);
      } else {
        res.send('not authorised');
      }
    } else {
      res.send('user not found. please register :)')
    }
  });
});

// ---------- users END ----------
