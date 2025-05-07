document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('sortByTitle').addEventListener('click', function() {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      const sortedTabs = tabs.sort((a, b) => a.title.localeCompare(b.title));
      for (let i = 0; i < sortedTabs.length; i++) {
        chrome.tabs.move(sortedTabs[i].id, {index: i});
      }
    });
  });

  document.getElementById('sortByDomain').addEventListener('click', function() {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      const sortedTabs = tabs.sort((a, b) => {
        const urlA = new URL(a.url).hostname;
        const urlB = new URL(b.url).hostname;
        return urlA.localeCompare(urlB);
      });
      for (let i = 0; i < sortedTabs.length; i++) {
        chrome.tabs.move(sortedTabs[i].id, {index: i});
      }
    });
  });

  document.getElementById('groupByDomain').addEventListener('click', function() {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      // 도메인별로 탭을 그룹화
      const tabsByDomain = {};
      tabs.forEach(tab => {
        try {
          const hostname = new URL(tab.url).hostname;
          if (!tabsByDomain[hostname]) {
            tabsByDomain[hostname] = [];
          }
          tabsByDomain[hostname].push(tab);
        } catch (e) {
          console.error('Invalid URL:', tab.url);
        }
      });

      // 2개 이상의 탭이 있는 도메인에 대해서만 새 창 생성
      Object.entries(tabsByDomain).forEach(([domain, domainTabs]) => {
        if (domainTabs.length >= 2) {
          // 새 창 생성
          chrome.windows.create({
            focused: true,
            tabId: domainTabs[0].id
          }, (newWindow) => {
            // 나머지 탭들을 새 창으로 이동
            for (let i = 1; i < domainTabs.length; i++) {
              chrome.tabs.move(domainTabs[i].id, {
                windowId: newWindow.id,
                index: -1
              });
            }
          });
        }
      });
    });
  });
}); 