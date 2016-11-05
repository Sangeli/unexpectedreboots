chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab ) {
  if ( changeInfo.status === 'complete' ) {
    var username = localStorage.getItem('username');
    var destUrl = localStorage.getItem('destUrl');
    //var destUrl = 'http://127.0.0.1:3000';

    console.log('username', username);

    var tabUrl = tab.url;
    var tabTitle = tab.title;
    var tabId = tab.id;

    var userMarkups = [];
    var shareGroups = localStorage.getItem('groupsToShareWith');

    if(shareGroups === null) {
      shareGroups = {};
    } else {
      shareGroups = JSON.parse(shareGroups);
    }

    var groupids = Object.keys(shareGroups);
    console.log(groupids, 'GROUPIDS', username, destUrl, shareGroups, 'USERNAME,DESTURL,SHAREGROUPS', tabUrl, tabTitle);
    $.ajax({
      type: 'POST',
      url: destUrl + '/test/websites/getmarkups',
      data: {groupids: groupids, url: tabUrl, title: tabTitle},
      success: function(response) {
        console.log(response[0], response, 'RESPONSE IN AJAX CALL');
        chrome.tabs.sendMessage(tabId, {selection: response, username: username});
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  var username = localStorage.getItem('username');
  var destUrl = localStorage.getItem('destUrl');
  //var destUrl = 'http://127.0.0.1:3000';

  var shareGroups = localStorage.getItem('groupsToShareWith');

  if (request.text === 'getUsername') {
    sendResponse({username: username, groups: shareGroups, destUrl: destUrl});
  } else if (username) {
    alert('!!');
    var selection = request.selection;
    var url = '';
    var title = '';
    var text = request.text;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      url = tabs[0].url;
      title = tabs[0].title;

    //need url, title, and text
      $.ajax({
        type: "POST",
        url: destUrl + '/api/markups/create',
        data: {
          username: username,
          anchor: selection,
          url: url,
          title: title,
          text: request.text,
          comment: null
        },
        success: function(data) {
          var shareGroups = localStorage.getItem('groupsToShareWith');
          if(shareGroups === null) {
            shareGroups = {};
          } else {
            shareGroups = JSON.parse(shareGroups);
          }
          console.log(data, 'DATA DATA');

          for(groupID in shareGroups) {
            if(shareGroups[groupID] === true) {
              console.log('Sharing with', groupID, 'data', data);
              $.ajax({
                type: 'POST',
                url: destUrl + '/test/markups/share',
                data: {
                  username: username,
                  anchor: selection,
                  url: url,
                  title: title,
                  text: request.text,
                  comment: null,
                  groupID: groupID,
                  markupID: data.id
                },
                success: function() {
                },
                error: function(obj,string,other) {

                }
              });
            }
          }
        }
      });
    });
  }
})







