var pg = require('pg');
var Pool = require('pg').Pool;
var Promise = require('es6-promise').Promise;
var groups = require('./groups');

var CONFIG = {
  host: 'localhost',
  user: 'postgres',
  password: 'markable123',
  database: 'markable'
};

var pool = new Pool(CONFIG);

exports.create = function(url, title, username, anchor, text, comment, callback) {

  console.log('~~~ Creating private markup:', text, 'for username:', username, 'on site:', url, title, 'with the following comment:', comment, '~~~');

  var authorID;
  var siteID;

  pool.query({
    // find user ID
    text: 'SELECT * FROM users \
      WHERE username = \'' + username + '\';'
  },

  function(err, rows) {
    if (err) {
      callback(err, null);
    } else {
      if (rows.rowCount === 0) {
        callback('user does not exist', null);
      } else {
        authorID = rows.rows[0].id;

        pool.query({
          // find site with same URL and title
          text: 'SELECT * FROM sites \
            WHERE url = \'' + url + '\' \
            AND title = \'' + title + '\';'
        },

        function(err2, rows2) {
          if (err2) {
            callback(err2, null);
          } else {
            if (rows2.rowCount > 0) {
              siteID = rows2.rows[0].id;

              pool.query({
                // insert into markups
                text: 'INSERT INTO markups(siteid, authorid, anchor, text, comment) \
                  VALUES($1, $2, $3, $4, $5) \
                  RETURNING *',
                values: [siteID, authorID, anchor, text, comment]
              },

              function(err3, rows3) {
                if (err3) {
                  callback(err3, null);
                } else {
                  console.log('ROWS 3', rows3);
                  callback(null, rows3.rows[0]);
                }
              });

            } else {

              pool.query({
                // insert site into the sites table
                text: 'INSERT INTO sites(url, title) \
                  VALUES($1, $2) \
                  RETURNING *',
                values: [url, title]
              },

              function(err4, rows4) {
                if (err4) {
                  callback(err4, null);
                } else {

                  siteID = rows4.rows[0].id;

                  pool.query({
                    // insert into markups
                    text: 'INSERT INTO markups(siteid, authorid, anchor, text, comment) \
                      VALUES($1, $2, $3, $4, $5) \
                      RETURNING *',
                    values: [siteID, authorID, anchor, text, comment]
                  },

                  function(err5, rows5) {
                    err5 ? callback(err5, null) : callback(null, rows5.rows[0]);
                  });
                }
              })
            }
          }
        });
      }
    }
  });
};


exports.lookupMarkupById = function(markupid, callback) {
   pool.query({
    // find user ID
    text: 'SELECT * FROM markups \
      WHERE id = ' + markupid + ';'
  }, function(err, rows) {
    if(err) {
      callback(err, null);
    } else if (rows.rowCount === 0 ) {
      callback('Cannot find markup ' + markupid);
    } else {
      callback(null, rows.rows[0]);
    }
  });
};


var creatMarkupGroup = function(markupid, groupid, callback) {
  pool.query({
    // insert shared markup into markupsgroups
    text: 'INSERT INTO markupsgroups(markupid, groupid) \
      VALUES($1, $2) \
      RETURNING *',
      values: [markupid, groupid]
  },
  function(err, rows) {
    err ? callback(err, null) : callback(null, rows.rows[0]);
  });
};

exports.share = function(markupid, groupid, callback) {
  exports.lookupMarkupById(markupid, function(err, markup) {
    if(err) {
      callback(err, null);
    } else {
      groups.getGroupById(groupid, function(err, group) {
        if(err) {
          callback(err, null);
        } else {
          creatMarkupGroup(markupid, groupid, function (err, markupgroup) {
            if (err) {
              callback(err, null);
            } else {
              callback(null, markup);
            }
          });
        }
      });
    }
  });
};


exports.deleteMarkup = function(markupid, callback) {
  //first delete all the markupgroup entries
  pool.query({
    text: 'DELETE FROM markups WHERE id = ' + markupid + ';'
  },
  function(err, success) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, true);
    }
  });
}
