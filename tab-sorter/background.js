var extensionID = chrome.i18n.getMessage('@@extension_id');

console.log('Background event page starting...');
console.log('Extension ID =', extensionID);

var shuffle = false;
var moveDelay = 10;  // milliseconds

// trimPrefix trims the given prefix from the given string.
function trimPrefix(s, prefix) {
  if (s.startsWith(prefix)) {
    return s.slice(prefix.length);
  }
  return s;
}

// lexHost returns a string for sorting hostnames lexicographically.
// The TLD is stripped and the host pieces are reversed.
function lexHost(url) {
  var u = new URL(url);
  var parts = u.host.split('.');
  parts.reverse();
  if (parts.length > 1) {
    parts = parts.slice(1);
  }
  return parts.join('.');
}

// lexScheme returns a string for sorting schemes lexicographically.
function lexScheme(url) {
  var u = new URL(url);
  switch (u.protocol) {
    // Sort HTTP together
    case 'http:':
    case 'https:':
      return 'http:';

    // Sort local things late
    case 'chrome:':
    case 'file:':
      return '~' + u.protocol;
  }
  return u.protocol;
}

// lexTab returns a string for sorting tabs lexicographically.
function lexTab(tab) {
  var pieces = [];

  if (shuffle) {
    pieces.push(Math.random());
  }

  // Pinning
  if (tab.pinned) {
    pieces.push('pin:0(yes):' + tab.index);
  } else {
    pieces.push('pin:1(no)');
  }

  // Scheme
  pieces.push(lexScheme(tab.url));

  // Host
  pieces.push(lexHost(tab.url));

  // Title
  pieces.push(tab.title.toLowerCase());

  return pieces.join(' ! ');
}

// extractDomain extracts all tabs with the active tab's domain into
// a new window and then sorts them.
function extractDomain() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var tab = tabs[0];
    if (!tab) return;
    var target = lexHost(tab.url);

    // Create a window with the tab in it.
    var cq = {
      'tabId': tab.id,
      'focused': true,
    };
    chrome.windows.create(cq, function(win) {
      // Move all other windows with the same target into the window.
      var tq = {
        'windowType': 'normal',
      };
      chrome.tabs.query(tq, function(tabs) {
        for (const tab of tabs) {
          var host = lexHost(tab.url);
          if (host != target) {
            continue;
          }
          chrome.tabs.move(tab.id, {
            'windowId': win.id,
            'index': -1,
          });
        }

        // Sort the tabs in the new window.
        var wq = {
          'windowTypes': ['normal'],
          'populate': true,
        };
        setTimeout(function() {
          chrome.windows.get(win.id, wq, sortWindow);
        }, moveDelay);
      });
    });
  });
}

function logWindow(windowId) {
  var q = {
    'windowId': windowId,
  };
  chrome.tabs.query(q, function(tabs) {
    console.log('Tabs (after reposition):');
    tabs.forEach(function(tab, i) {
      console.log(i, lexTab(tab));
    });
  });
}

function moveNextTab(win, tabs, i, inserted) {
  if (i >= tabs.length) {
    console.log('Finished sorting window', win.id, '; tabs are now:');
    logWindow(win.id);
    return;
  }

  var tab = tabs[i];
  if (tab.pinned) {
    console.log('Pinned', tab.id, 'at', tab.index, 'to', i, lexTab(tab));
    setTimeout(moveNextTab, 0, win, tabs, i + 1, inserted);
    return;
  }
  if (i == tab.index + inserted) {
    // Nothing to do
    console.log(
        'No action for', tab.id, 'at', tab.index, '+', inserted, lexTab(tab));
    setTimeout(moveNextTab, 0, win, tabs, i + 1, inserted);
    return;
  }

  console.log('Moving', tab.id, 'from', tab.index, 'to', i, lexTab(tab));
  chrome.tabs.move(tab.id, {'index': i}, function() {
    setTimeout(moveNextTab, moveDelay, win, tabs, i + 1, inserted + 1);
  });
}

function sortWindow(win) {
  console.log('Sorting window:', win.id);

  // Sort tabs within the window
  var tabs = win.tabs;

  console.log('Tabs (before sorting):');
  tabs.forEach(function(tab, i) {
    console.log(i, lexTab(tab));
  });
  tabs.sort(function(a, b) {
    return lexTab(a).localeCompare(lexTab(b));
  });
  setTimeout(moveNextTab, 0, win, tabs, 0, 0);
}

// sortByMode sorts the tabs.  The mode is one of the following:
//   'all'    -
//   'window' -
//   'domain' -
function sortByMode(mode) {
  var q = {
    'windowTypes': ['normal'],
    'populate': true,
  };

  console.log('Sorting tabs:', mode);
  switch (mode) {
    case 'all':
      chrome.windows.getAll(q, function(windows) {
        windows.forEach(sortWindow);
      });
      break;
    case 'window':
      chrome.windows.getLastFocused(q, sortWindow);
      break;
    case 'domain':
      extractDomain();
      return;
  }
}

// handleMessage handles an incoming message from the app.
function handleMessage(message, sender, respond) {
  var action = message.action;
  var args = message.args;

  console.log(action, '(', args, ')');
  switch (action) {
    case 'sort':
      sortByMode(...args);
      break;
    default:
      console.log('Unhandled message:', message);
      break;
  }
  respond({});
}

chrome.runtime.onMessage.addListener(handleMessage);
