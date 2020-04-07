/*
 * background.js of tweet_sig_mobile
 *
 * Time-stamp: <2018-07-02T02:20:41Z>
 */

//console.log("background.js: ok");

const INIT_SETTINGS = {
  addCite: true,
  citeOpen: ">",
  citeClose: "< ",
  addTitle: false,
  titleOpen: '/ “',
  titleClose: '” ',
  serviceAlways: false,
  selectedService: "twitter",
  closeTweetTab: true
};

const FB_PAGE_POSTER = "http://jrf.cocolog-nifty.com/archive/tweet_sig/fb_page_poster.html";

var settings;
var tabData = {};
const myStorage = ('sync' in chrome.storage)?
  chrome.storage.sync : chrome.storage.local;

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({tabData: {}});
  tabData = {};
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({tabData: {}});
  tabData = {};
});

if ('onSuspend' in chrome.runtime) {
  chrome.runtime.onSuspend.addListener(() => {
    chrome.storage.local.set({tabData: tabData});
  });
}

const initializing = (async function () {
  let data = await (new Promise ((rs, rj) => {
    myStorage.get(null, x => {
      const e = chrome.runtime.lastError;
      if (e) rj(e);
      else rs(x);
    });
  }));
  if (! ('settings' in data) && myStorage != chrome.storage.local) {
    data = await (new Promise ((rs, rj) => {
      chrome.storage.local.get(null, x => {
	const e = chrome.runtime.lastError;
	if (e) rj(e);
	else rs(x);
      });
    }));
    chrome.storage.local.remove('settings');
  }
  if ('settings' in data) {
    settings = data.settings;
  } else {
    settings = {};
  }
  for (let k in INIT_SETTINGS) {
    if (! (k in settings)) {
      settings[k] = INIT_SETTINGS[k];
    }
  }
  settings.serviceAlways = true;
  settings.selectedService = "twitter";

  data = await (new Promise ((rs, rj) => {
    chrome.storage.local.get('tabData', x => {
      const e = chrome.runtime.lastError;
      if (e) rj(e);
      else rs(x);
    });
  }));
  if ('tabData' in data) {
    tabData = data.tabData;
  } else {
    tabData = {};
  }

  return (new Promise((rs, rj) => {
    myStorage.set({
      settings: settings
    }, x => {
      const e = chrome.runtime.lastError;
      rs();
    });
  }));
})();

chrome.runtime.onMessage.addListener(handleMessage);

chrome.pageAction.onClicked.addListener(tab => {
  initializing.then(() => {
    if (! (tab.id in tabData) || ! ('scriptId' in tabData[tab.id])) return;
    const sid = tabData[tab.id].scriptId;

    chrome.tabs.sendMessage(tab.id, {type: "get-url"}, udata => {
      chrome.tabs.sendMessage(tab.id, {type: "tweet-sig-in", id: sid}, res => {
	if (chrome.runtime.lastError) return;
	if (settings.selectedService == "twitter") {
	  openTwitter(tab.id, res.text, sid, res.mode, udata.url, udata.title);
	} else if (settings.selectedService == "facebook") {
	  openFacebook(tab.id, res.text, sid, res.mode, udata.url, udata.title);
	}
      });
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  initializing.then(() => {
    if (tabId in tabData) {
      delete tabData[tabId];
    }
  });
});

function handleMessage (req, sender, sendResponse) {
  const f = {
    "log": handleLog,
    "click-popup": handleClickPopup,
    "comp": handleComp,
    "comp-error": handleCompError,
    "auth-error": handleAuthError,
    "get-text": handleGetText,
    "show-icon": handleShowIcon,
    "hide-icon": handleHideIcon,
    "get-settings": handleGetSettings,
    "update-settings": handleUpdateSettings
  };

  if (req.type in f) {
    initializing.then(x => { f[req.type](req, sender, sendResponse); });
    return true;
  } else {
//    console.log("background.js: unreacheable code.");
  }
}

function handleClickPopup (req, sender, sendResponse) {
  if (req.id == "twitter") {
    handleOpenTwitter(req, sender, sendResponse);
  } else if (req.id == "facebook") {
    handleOpenFacebook(req, sender, sendResponse);
  }
}

function handleOpenTwitter (req, sender, sendResponse) {
  const tabId = req.tabId;
    
  if (! (tabId in tabData) || ! ('scriptId' in tabData[tabId])) return;
  const sid = tabData[tabId].scriptId;

  chrome.tabs.sendMessage(tabId, {type: "get-url"}, udata => {
    chrome.tabs.sendMessage(tabId, {type: "tweet-sig-in", id: sid}, res => {
      if (chrome.runtime.lastError) return;
      openTwitter(tabId, res.text, sid, res.mode, udata.url, udata.title);
    });
  });
}

function handleOpenFacebook (req, sender, sendResponse) {
  const tabId = req.tabId;

  if (! (tabId in tabData) || ! ('scriptId' in tabData[tabId])) return;
  const sid = tabData[tabId].scriptId;
  
  chrome.tabs.sendMessage(tabId, {type: "get-url"}, udata => {
    chrome.tabs.sendMessage(tabId, {type: "tweet-sig-in", id: sid}, res => {
      if (chrome.runtime.lastError) return;
      openFacebook(tabId, res.text, sid, res.mode, udata.url, udata.title);
    });
  });
}

function openTwitter (dest, origText, sid, mode, url, title) {
  let text = origText;
  if (mode == 'clipboard') {
    if (text && settings.addCite) {
      text = settings.citeOpen + text + settings.citeClose;
    }
    if (text && title && settings.addTitle) {
      text += settings.titleOpen + title + settings.titleClose;
    }
    if (text && url && settings.addCite) {
      text += url;
    }
  }
  let q = "https://twitter.com/intent/tweet?text=";
  q += encodeURIComponent(text);
  chrome.tabs.create({url: q}, newTab => {
    const nid = newTab.id;
    if (! (nid in tabData)) tabData[nid] = {};
    Object.assign(tabData[nid],
		  {dest: dest, destId: sid, mode: mode, text: text});
  });
}

function openFacebook (dest, origText, sid, mode, url, title) {
  let text = origText;
  if (mode == 'clipboard') {
    if (text && settings.addCite) {
      text = settings.citeOpen + text + settings.citeClose;
    }
    if (text && title && settings.addTitle) {
      text += settings.titleOpen + title + settings.titleClose;
    }
    if (text && url && settings.addCite) {
      text += url;
    }
  }
  chrome.tabs.create({url: FB_PAGE_POSTER}, newTab => {
    const nid = newTab.id;
    if (! (nid in tabData)) tabData[nid] = {};
    Object.assign(tabData[nid],
		  {dest: dest, destId: sid, mode: mode, text: text});
  });
}

function handleShowIcon (req, sender, sendResponse) {
  const tid = sender.tab.id;
  chrome.pageAction.show(tid);
  if (settings.serviceAlways) {
    chrome.pageAction.setPopup({tabId: tid, popup: ""});
  } else {
    chrome.pageAction.setPopup({tabId: tid, popup: "/popup.html"});
  }
  if (! (tid in tabData)) tabData[tid] = {};
  if (req.id) {
    Object.assign(tabData[tid], {scriptId: req.id});
  }
}

function handleHideIcon (req, sender, sendResponse) {
  if ('tab' in sender) {
    chrome.pageAction.hide(sender.tab.id);
    if (sender.tab.id in tabData) delete tabData[sender.tab.id].scriptId;
  }
}
  
function handleComp (req, sender, sendResponse) {
  if (! (sender.tab.id in tabData)
      || ! ('dest' in tabData[sender.tab.id])) return;
  const mode = tabData[sender.tab.id].mode;

  if (mode == "tweet-sig-out") {
    handleTweetSigOut(req, sender, sendResponse);
  } else if (mode == "clipboard") {
    handleCopyClipboard(req, sender, sendResponse);
  }
}

function handleTweetSigOut (req, sender, sendResponse) {
  const dest = tabData[sender.tab.id].dest;
  const id = tabData[sender.tab.id].destId;
  delete tabData[sender.tab.id].dest;
  if (! (dest in tabData) || ! ('scriptId' in tabData[dest])) return;
  if (tabData[dest].scriptId != id) return;
  chrome.tabs.sendMessage(dest,
			     {type: "tweet-sig-out", id: id, url: req.url});
  if (settings.closeTweetTab) {
    chrome.tabs.update(dest, {active: true});
    chrome.tabs.remove(sender.tab.id);
  }
}

function handleCopyClipboard (req, sender, sendResponse) {
  const dest = tabData[sender.tab.id].dest;
  delete tabData[sender.tab.id].dest;
  chrome.tabs.sendMessage(sender.tab.id, {
    type: "copy-clipboard", text: req.url
  }, x => {
    if (settings.closeTweetTab) {
      chrome.tabs.update(dest, {active: true});
      chrome.tabs.remove(sender.tab.id);
    }
  });
}

function handleCompError (req, sender, sendResponse) {
  if (sender.tab.id in tabData) {
    sendResponse(true);
    delete tabData[sender.tab.id].dest;
  } else {
    sendResponse(false);
  }
}

function handleAuthError (req, sender, sendResponse) {
  if (! (sender.tab.id in tabData)
      || ! ('dest' in tabData[sender.tab.id])) return;
  const dest = tabData[sender.tab.id].dest;
  delete tabData[sender.tab.id].dest;
  if (settings.closeTweetTab) {
    chrome.tabs.update(dest, {active: true});
    chrome.tabs.remove(sender.tab.id);
  }
}

function handleGetText (req, sender, sendResponse) {
  if (! (sender.tab.id in tabData)
      || ! ('dest' in tabData[sender.tab.id])) {
    sendResponse(null);
    return;
  }
  sendResponse(tabData[sender.tab.id].text);
}

function handleGetSettings (req, sender, sendResponse) {
  sendResponse({settings: settings});
}

function handleUpdateSettings (req, sender, sendResponse) {
  settings = req.settings;
  myStorage.set({
    settings: settings
  }, x => {
    sendResponse();
  });
}

function handleLog (req, sender, sendResponse) {
  console.log(req.text);
}
