var pg = require('pg');
var Pool = require('pg').Pool;
var Promise = require('es6-promise').Promise;

var CONFIG = {
  host: 'localhost',
  user: 'postgres',
  password: 'markable123',
  database: 'markable'
};

var pool = new Pool(CONFIG);


exports.getSite = function(url, title, callback) {

  pool.query({
    // check if website already exists
    text: 'SELECT * FROM sites \
      WHERE url = \'' + url + '\' \
      AND title = \'' + title + '\''
  }, function(err, rows) {
    if (err) {
      callback(err, null);
    } else if (rows.rowCount > 1) {
      callback('Found multiple sites of url ' +  url + ' and title ' + title, null);
    } else if (rows.rowCount === 0)  {
      //valid to have no website in certain cases
      callback(null, null);
    } else {
      callback(null, rows.rows[0]);
    }
  });
};


exports.getMarkupsBySite = function(siteid, callback) {
  pool.query({
    text: 'SELECT * FROM markups \
      WHERE siteid = ' + siteid + ';'
    }, function(err, rows) {
      err ? callback(err, null) : callback(err, rows.rows);
    }
  );
};


exports.checkMarkupGroup = function(markupid, groupid, callback) {
    pool.query({
    text: 'SELECT * FROM markupsgroups \
      WHERE markupid = ' + markupid + ' AND \
      groupid = ' + groupid + ';'
    }, function(err, rows) {
      err ? callback(err, null) : callback(err, (rows.rowCount > 0));
    }
  );
};

exports.filterMarkup = function(markup, groupids, callback) {
  //iterate through groups
  //send the success  callback if a match is found
  //update the count on the callback
  //send null when count reaches 0 if not found any
  var markupid = markup.id;
  var foundAny = false;
  var num2check = groupid.length;
  groupids.forEach( function(groupid) {
    exports.checkMarkupGroup(markupid, groupid, function(err, exists) {
      //immediate callback on error
      if (err) {
        callback(err, null);
      } else if (exists && !foundAny) {
        callback(null, true);
        foundAny = true
      }
      //decrement
      num2check --;
      //chevked every group, no match
      if (!num2check) {
        callback(null, false)
      }
    });
  });
};

exports.filterMarkups = function(markups, groupids, callback) {
  var markupsLeft = markups.length;
  var filteredMarkups = [];

  //go through each markup
  //check to see if it matches a selected group
  //add it to our array
  //send it off when we've checked every markup
  markups.forEach( function(markup) {
    exports.filterMarkup(markup, groupids, function(err, useMarkup) {
      if (err) {
        callback(err, null);
      } else if(useMarkup) {
        filteredMarkups.push(markup);
      }
      markupsLeft --;
      if (!markupsLeft) {
        callback(null, filteredMarkups);
      }
    });
  });
};


exports.getMarkups = function(url, title, groupids, callback) {
  exports.getSite(url, title, function(err, site) {
    if (err) {
      callback(err, null);
    } else if (!site) {
      //no site, just send back empty array
      callback(null, []);
    } else {
      exports.getMarkupsBySite(site.id, function(err, markups) {
        if (err) {
          callback(err, null);
        } else {
          exports.filterMarkups(markups, groupids, callback);
        }
      });
    }
  });
};






///old
exports.create = function(url, title, callback) {

  pool.query({
    // check if website already exists
    text: 'SELECT * FROM sites \
      WHERE url = \'' + url + '\' \
      AND title = \'' + title + '\''
  },

  function(err, rows) {
    if (rows.rowCount > 0) {
      callback('website already exists', null);
    } else {

      pool.query({
        text: 'INSERT INTO sites(url, title) \
          VALUES($1, $2)',
        values: [url, title]
      },

      function(err2, rows2) {
        err2 ? callback(err2, null) : callback(true, null);
      });
    }
  });
};

exports.share = function(username, groupID, url, title, callback) {

  console.log('/**', username, 'is sharing:', url, '(', title, ') with group:', groupID);

  var siteID;

  pool.query({
    // attempt to find the existing site in the DB
    text: 'SELECT * FROM sites \
      WHERE url = \'' + url + '\' \
      AND title = \'' + title + '\';'
  },

  function(err, rows) {
    if (err) {
      callback(err, null);
    } else {
      if (rows.rowCount > 0) {
        siteID = rows.rows[0].id;

        pool.query({
          text: 'INSERT INTO sitesgroups \
            VALUES ( ' +
              groupID + ', ' +
              siteID + ', ' +
              '( \
              SELECT u.id FROM users u \
              WHERE u.username = \'' + username + '\' \
              ) \
            );'
        },

        function(err2, rows2) {
          err2 ? callback(err3, null) : callback(null, true);
        });
      } else {

        pool.query({
          text: 'INSERT INTO sites(url, title) \
            VALUES($1, $2) \
            RETURNING *',
          values: [url, title]
        },

        function(err3, rows3) {
          if (err3) {
            callback(err3, null);
          } else {

            siteID = rows3.rows[0].id;

            pool.query({
              text: 'INSERT INTO sitesgroups \
                VALUES ( ' +
                  groupID + ', ' +
                  siteID + ', ' +
                  '( \
                  SELECT u.id FROM users u \
                  WHERE u.username = \'' + username + '\' \
                  ) \
                );'
            },

            function(err4, rows4) {
              err4 ? callback(err4, null) : callback(null, true);
            });
          }
        });
      }
    }
  });
};