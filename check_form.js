/*
 * check_form.js of tweet_sig_mobile
 *
 * Time-stamp: <2018-01-23T08:48:51Z>
 */

//console.log("check_form.js: ok");

const scriptId = '' + Math.random();
let selected = '';

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type == 'get-url' && window.parent == window) {
    sendResponse({url: location.href, title: document.title});
    return;
  }
  if (req.id != scriptId) return;
  if (req.type == 'tweet-sig-in') {
    const d = document.getElementById('tweet-sig-in');
    if (selected) {
      sendResponse({text: selected, mode: 'clipboard'});
    } else if (d) {
      if (d.nodeName == 'INPUT') {
	sendResponse({text: d.value, mode: 'tweet-sig-out'});
      } else {
	sendResponse({text: d.textContent, mode: 'tweet-sig-out'});
      }
    } else {
      sendResponse({text: '', mode: 'clipboard'});
    }
  } else if (req.type == 'tweet-sig-out') {
    const d = document.getElementById('tweet-sig-out');
    if (! d) {
      // do nothing.
    } else if (d.nodeName == 'INPUT') {
      d.value = req.url;
    } else {
      d.textContent = req.url;
    }
    if (d) d.dispatchEvent(new Event('change', {bubbles: true}));
  }
});

window.addEventListener("pageshow", e => {
  if (checkIds() || selected) {
    chrome.runtime.sendMessage({type: "show-icon", id: scriptId});
  }
}, false);

window.addEventListener("pagehide", e => {
  selected = '';
  chrome.runtime.sendMessage({type: "hide-icon"});
}, false);

document.addEventListener('selectionchange', () => {
  selected = getSelectionString() || selected;
  if (checkIds() || selected) {
    chrome.runtime.sendMessage({type: "show-icon", id: scriptId});
  }
}, false);

if (checkIds()) {
  chrome.runtime.sendMessage({type: 'show-icon', id: scriptId});
}

function checkIds () {
  return window.parent == window && document.getElementById('tweet-sig-in') && document.getElementById('tweet-sig-out');
}

function getSelectionString () {
  let text = window.getSelection().toString();
  if (text == "") {
    var node = document.activeElement;
    if (node && (node.type == "text" || node.type == "textarea")
	&& 'selectionStart' in node
	&& node.selectionStart != node.selectionEnd) {
      var start = Math.min(node.selectionStart, node.selectionEnd);
      var end = Math.max(node.selectionStart, node.selectionEnd);
      text = node.value.substr(start, end - start);
    }
  }
  return text;
}
