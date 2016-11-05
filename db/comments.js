var pg = require('pg');
var Pool = require('pg').Pool;
var CONNECTION = 'postgres://admin:rQUNyC8W9YT7ZZBW@localhost:5432/markable';
var Promise = require("bluebird");

var client = new pg.Client(CONNECTION);

var CONFIG = {
  host: 'localhost',
  user: 'postgres',
  password: 'markable123',
  database: 'markable'
};

var pool = new Pool(CONFIG);

var cleanText = function (text) {
  return '\'' + text + '\'';
}


var updateComment = function(markupid, authorid, comment, callback) {
  pool.query({
    text: 'UPDATE comment c SET c.comment = ' + cleanText(comment) + ' \
    WHERE c.markupid = ' + markupid + ' AND c.authorid = ' + authorid + ';'
  }, function(err, rows) {
    //if error send callback
    if(err) {
      callback(err, null);
    } else {
      callback(null, rows.rows)
    }
  });
};

var createComment = function(markupid, authorid, comment, callback) {
  pool.query({
    text: 'INSERT INTO comments(markupid, authorid, comment) \
      VALUES($1, $2, $3)',
      values: [markupid, authorid, cleanText(comment)]
  }, function(err, rows) {
    //if error send callback
    if(err) {
      callback(err, null);
    } else {
      callback(null, rows.rows)
    }
  });
};

var getUserFromName = function(username, callback) {
  console.log('in get username!!!!!!!!!');
  pool.query({
    text: 'SELECT * FROM users u WHERE u.username = \'' + username + '\' ;'
  }, function(err, rows) {
    if(err) {
      callback(err, null);
    } else if (rows.rowCount === 1) {
      callback(null, rows.rows[0]);
    } else {
      callback('User ' + username + ' not found!', null);
    }
  });
};

var checkCommentExists = function(markupid, authorid, callback) {
  pool.query({
      text: 'SELECT * FROM comments c WHERE c.markupid = \'' + markupid + '\' \
      AND c.authorid = \'' + authorid +'\' ;'
    }, function(err, rows) {
    if(err) {
      callback(err, null);
    } else if (rows.rowCount) {
      //comment exists
      callback(null, true);
    } else {
      //no comment
      callback(null, false);
    }
  });
};


var getCommmentsByMarkup = function(markupid, callback) {
    pool.query({
      text: 'SELECT * FROM comments WHERE markupid = ' + markupid + ';'
    }, function(err, rows) {
    if(err) {
      callback(err, null);
    } else if (rows.rowCount) {
      //comments exists
      callback(null, rows.rows);
    } else {
      //no comments
      callback(null, []);
    }
  });

}

var checkGroupMarkupExists = function(markupid, groupid, callback) {
    pool.query({
      text: 'SELECT * FROM markupsgroups WHERE markupid = ' + markupid + ' \
      AND groupid = ' + groupid +' ;'
    }, function(err, rows) {
    if(err) {
      callback(err, null);
    } else if (rows.rowCount) {
      //entry exists
      callback(null, true);
    } else {
      //no entry
      callback(null, false);
    }
  });
}



exports.setComment = function(markupid, username, comment, callback) {
  console.log('in set comment', comment);
  //first get userid
  getUserFromName(username, function(err, user) {
    if(err) {
      callback(err, null);
    } else {
      const authorid = user.id;
      console.log('Set comment for user ' + username + ' markupid ' + markupid);
      checkCommentExists(markupid, authorid, function(err, exists) {
        console.log('check comment exists', exists);
        //if exists, update
        if (exists) {
          updateComment(markupid, authorid, comment, callback);
        } else {
          createComment(markupid, authorid, comment, callback);
        }
      });
    }
  });
};



exports.getComments = function(markupid, groupids, callback) {
  console.log('in databse stuff', markupid, groupids);
  //first grab comments
  getCommmentsByMarkup(markupid, function(err, comments) {
    console.log('getcommentsbymarkup', err, comments);
    if(err) {
      //found error
      callback(err, null);
    } else if (!comments || comments.length === 0) {
      //if no comments found, send empty array back
      callback(null, []);
    } else {
      var foundAny = false;
      var counter = 0;
      if (groupids) {
        groupids.forEach((groupid) => {
          console.log(comments, 'comments', groupid, 'GROUPID----- RIGHT HERE FRANK');

          //now check if the markup is part of any of the groups we are using
          checkGroupMarkupExists(markupid, parseInt(groupid), (err, exists) => {
            //no error callback because we can check other groups
            if (!err && exists && !foundAny) {
              console.log('anything!!!!!!!!!!@#$%^&*', comments[0]);
              callback(null, comments);
              foundAny = true;
            }
            counter ++;
            if(counter === groupids.length && !foundAny) {
              callback(null, []);
            }
          });
        });
      }
    }
  });
};

