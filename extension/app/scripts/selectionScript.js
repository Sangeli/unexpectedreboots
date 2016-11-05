vex.defaultOptions.className = 'vex-theme-os';

var serverUrl;
var globalGroups = [];
var globalGroupIds = [];
var markupIds = [];
var username = undefined;
var groupsSelected = [];
var groupsObj = {};
var commentsObj = {};
var test = null;


/***************************************************
    GET COMMENTS TO BACKGROUND.JS
****************************************************/

var getComments = function (markupid) {
  console.log('this is being logged', markupid);
  if (markupid) {
    $.ajax({
      type: 'POST',
      url: serverUrl + '/test/comments/get',
      data: {markupid: markupid, groupids: groupsSelected},
      success: (data) => {
        if (data.length > 0) {
          commentsObj[data[0].markupid] = data[0].comment;
          console.log(commentsObj[data[0].markupid], 'COMMENTSOBJ! - !', commentsObj);
          // console.log(data, 'inside of get comments selection script!!!');
        }
      },
      error: (f) => {
        console.error(f, 'here');
      }
    })
  }
};


/***************************************************
      GET MARKUPID AND CALL SENDCOMMENT
        WITH MARKUPID AND COMMENT
****************************************************/

var showComments = function (markupid) {
  console.log('markupid on top', markupid);
  if (markupid && commentsObj[markupid]) {
    vex.dialog.alert('Comments: ' + commentsObj[markupid]);
  } else {
    vex.dialog.alert('No Comments To Show');
  }
};


/***************************************************
    GET USERNAME FROM LOCAL STORAGE
    BY REQUESTING IT FROM BACKGROUND.JS
****************************************************/

chrome.runtime.sendMessage({
  text: 'getUsername'
}, function(response) {
  console.log('Got response:', response.username, response.groups, response.destUrl);
  username = response.username;
  serverUrl = response.destUrl;
  if(response.groups === null) groupsObj = {};
  groupsObj = JSON.parse(response.groups);

  for (var key in groupsObj) {
    if(groupsObj[key] === true) groupsSelected.push(key);
  }

  //globalGroups = groupsSelected;
  /*
  $.ajax({
    type: 'GET',
    url: serverUrl + '/test/users/groups',
    data: {username: username},
    success: (data) => {
      console.log(data);
      for(var i = 0; i < data.length; i++) {
        globalGroups.push(data[i].groupname);
        globalGroupIds.push(data[i].groupid);
      }
      markupIds.forEach((id) => getComments(id));
    },
  });
  */
});


/***************************************************
      GET MARKUPID AND CALL SENDCOMMENT
        WITH MARKUPID AND COMMENT
****************************************************/

var addComment = function (markupid) {
  vex.dialog.open({
      message: 'Enter your comment',
      input: [
          '<input name="comment" type="text" autocomplete="off" required />'
      ].join(''),
      buttons: [
          $.extend({}, vex.dialog.buttons.YES, { text: 'Enter' }),
          $.extend({}, vex.dialog.buttons.NO, { text: 'Cancel' })
      ],
      callback: function (data) {
          if (!data) {
              console.log('Cancelled');
          } else {
              // postSelection(test, data.selectGroups, data.comment);
              sendComment(markupid, data.comment);
              console.log('Comment', data.comment);
          }
      }
  });
}

/***************************************************
    SEND COMMENT TO BACKGROUND.JS
****************************************************/

var sendComment = function (markupid, comment) {
  chrome.runtime.sendMessage({
    text: 'getUsername'
  }, function(response) {
    username = response.username;
    serverUrl = response.destUrl;
    $.ajax({
      type: 'POST',
      url: serverUrl + '/test/comments/create',
      data: {username: username, markupid: markupid, comment: comment},
      success: (data) => {
        console.log(data, 'inside of Send Comment');
      },
    })
  });
};


/***************************************************
      ADD MEDIUM-EDITOR TOOLBAR
      TO THIS LIST OF HTML ELEMENTS
****************************************************/

var elements = document.querySelectorAll("p, li, em, span, h1, h2, h3, h4, h5, td, tr, th, tbody");

// var elements = document.getElementsByTagName("*");

/***************************************************
      POST SELECTION AND SEND TO BACKGROUND.JS
****************************************************/

var postSelection = function(targetText, groups, comment) {
  var testExport = editor.exportSelection();
  console.log('Posting selection');
  // console.log(groups, comment);
  chrome.runtime.sendMessage({
    action: 'add',
    selection: JSON.stringify(testExport),
    text: targetText,
    groups: groups,
    comment: comment
  }, function(response) {

  });
};

var removeMarkup = function(markupId) {
  console.log('Stubbed functionality: implement removeMarkup');
  // chrome.runtime.sendMessage({
  //   action: 'remove',
  //   markupId: markupId
  // }, function(response) {

  // });
};


/***************************************************
              MARKUP TOOLBAR
****************************************************/

editor = new MediumEditor(elements, {
  anchorPreview: false,
  placeholder: false,
  disableEditing: true,
  toolbar: {
    buttons: ['sendSelection']
  },
  extensions: {
      'sendSelection': new MediumButton({
        label: 'Share',
        start: '<span style="background-color: powderblue;">',
        end: '</span>',
        action: function(html, mark) {
          postSelection(html);
          return html;
        }
      })
    }
});

editor.subscribe('editableInput', function (event, editable) {
    // Do some work
    console.log(event, 'event');
    console.log(editable,'editable');

});

var colors = {0: '#EDE2AF', 1: '#E2BACB', 2: '#BECFE8', 3: '#F4CCB0', 4: '#BCE0B5'};
var userSet = {};
var numbers = [0,1,2,3,4]


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Note: the selection property comes from the background script
  console.log('!!');
  var allSelections = request.selection;
  allSelections.sort(function(b,a) {
    if(JSON.parse(a.anchor).editableElementIndex === JSON.parse(b.anchor).editableElementIndex) {
      //flip = !flip;
      return JSON.parse(a.anchor).start - JSON.parse(b.anchor).start;
    } else {
      //flip = !flip;
      return JSON.parse(a.anchor).editableElementIndex - JSON.parse(b.anchor).editableElementIndex;
    }
  });
  console.log('allSelections', allSelections);
  var username = request.username;
  for (var i = 0; i < allSelections.length; i++) {
    if (!userSet[allSelections[i].author]) {
      userSet[allSelections[i].author] = numbers.splice(0,1);
    }

    var importedSelection = JSON.parse(allSelections[i].anchor);
    var markupId;
    var author = allSelections[i].author;
    username = allSelections[i].username;


    if (allSelections[i].id) {
      markupId = JSON.parse(allSelections[i].id);
      if (!markupIds.includes(markupId)) {
        markupIds.push(markupId);
      }
    } else {
      console.error('markupId undefined');
    }

    editor.importSelection(importedSelection);
    console.log('importedSelection', importedSelection);

    // <a href="#" class="markable-tooltip" style="background-color: yellow;">' + getCurrentSelection() + '<span> Testing a long tooltip </a>';
    var content = getCurrentSelection();
    console.log('Author', author, 'Username', username);
    var removeHighlight = author === username ? '<button> Remove highlighting </button>' : '';
    var html = '<span class="markable-tooltip"' + 'id="markupid_' + markupId + '"' +
      'style="background-color:' + colors[userSet[allSelections[i].author]] + ';">' +
          content +
          '<span class="markable-tooltip-popup">' +
              allSelections[i].author + '<br>' + moment(allSelections[i].createdat).twitterShort() + ' ago' +
              removeHighlight +
          '</span>' +
      '</span>';
    var sel = window.getSelection();
    var range;

    //Set new Content
    if (sel.getRangeAt && sel.rangeCount) {
      range = window.getSelection().getRangeAt(0);
      range.deleteContents();

      // Create a DocumentFragment to insert and populate it with HTML
      // Need to test for the existence of range.createContextualFragment
      // because it's non-standard and IE 9 does not support it
      if (range.createContextualFragment) {
        fragment = range.createContextualFragment(html);
      } else {
        var div = document.createElement('div');
        div.innerHTML = html;
        fragment = document.createDocumentFragment();
        while ((child = div.firstChild)) {
          fragment.appendChild(child);
        }
      }
      var firstInsertedNode = fragment.firstChild;
      var lastInsertedNode = fragment.lastChild;

      range.insertNode(fragment);
      if (firstInsertedNode) {
        range.setStartBefore(firstInsertedNode);
        range.setEndAfter(lastInsertedNode);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // This one places a listener on the button on the tool tip
    // It removes the highlighting and sends back to the database
    // to delete the markup.
    if (author === username) {
      var wrapper = function(markup, con) {

        $('body').delegate('#markupid_' + markup + ' button', 'click', function(event) {
          $('#markupid_' + markup).css('background-color', 'inherit');
          $('#markupid_' + markup).replaceWith(con);
          removeMarkup(markup, con);
        });


      }(markupId, content);
    }

    var wrapper = function(markupId) {

      $('body').delegate('#buttonid_' + markupId, 'click', function (event) {
        showComments(markupId);
      });

      $('body').delegate('.postComment', 'click', function () {
        addComment(markupId);
      });

      $('#markupid_' + markupId).click(function (event) {
        var $button = $(event.target);
        var currentId = $button[0].id;
        var index = currentId.indexOf('_') + 1;
        currentId = currentId.slice(index);

        if (markupId) {

          vex.dialog.open({
              message: 'Comments',
              input: [
                  '<button class="showComments" id="buttonid_' + currentId +'">',
                  'Show Comments',
                  '</button>',
                  '<button class="postComment">',
                  'Post Comment',
                  '</button>',
              ].join(''),
              callback: function (data) {
                console.log('Data', data)
              }
          });
        }
      });
    }(markupId);
  }
});


var getCurrentSelection = function() {
  var html = '';
  var sel;
  if (typeof window.getSelection != 'undefined') {
    sel = window.getSelection();
    if (sel.rangeCount) {
      var container = document.createElement('div');
      for (var i = 0, len = sel.rangeCount; i < len; ++i) {
        container.appendChild(sel.getRangeAt(i).cloneContents());
      }
      html = container.innerHTML;
    }
  } else if (typeof document.selection != 'undefined') {
    if (document.selection.type == 'Text') {
      html = document.selection.createRange().htmlText;
    }
  }
  return html;
};