// Comet AI - Content Script (Autonomous Agent)
// This script runs in EVERY webpage and enables AI to interact with the DOM directly
// Based on how real Comet works: Accessibility Tree + DOM manipulation

(function() {
  'use strict';

  // =================================================================
  // CORE: Accessibility Tree Parser (Like Real Comet)
  // =================================================================
  function getAccessibilityTree() {
    const elements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((el, index) => {
      // Get ARIA roles, labels, and states (like Comet does)
      const role = el.getAttribute('role') || el.tagName.toLowerCase();
      const ariaLabel = el.getAttribute('aria-label') || '';
      const label = el.textContent?.trim().substring(0, 50) || '';
      const isClickable = el.tagName === 'BUTTON' || 
                         el.tagName === 'A' || 
                         el.onclick !== null || 
                         el.hasAttribute('tabindex');
      const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      
      if (isClickable || isInput || ariaLabel) {
        elements.push({
          index,
          selector: generateSelector(el),
          role,
          label: label || ariaLabel,
          ariaLabel,
          isClickable,
          isInput,
          type: el.type,
          visible: isVisible(el)
        });
      }
    });
    
    return elements;
  }

  // Generate unique selector for element
  function generateSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c).slice(0, 2).join('.');
      if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
    }
    return getXPath(el);
  }

  function getXPath(el) {
    if (el.id !== '') return `//*[@id="${el.id}"]`;
    if (el === document.body) return '/html/body';
    
    let ix = 0;
    const siblings = el.parentNode?.childNodes || [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === el) {
        return getXPath(el.parentNode) + '/' + el.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === el.tagName) {
        ix++;
      }
    }
  }

  function isVisible(el) {
    return el.offsetParent !== null && 
           window.getComputedStyle(el).display !== 'none' &&
           window.getComputedStyle(el).visibility !== 'hidden';
  }

  // =================================================================
  // AGENT ACTIONS: Direct DOM Manipulation (Like Comet)
  // =================================================================
  
  const AgentActions = {
    // Read entire page content
    readPage() {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText,
        html: document.body.innerHTML.substring(0, 10000), // First 10k chars
        accessibilityTree: getAccessibilityTree()
      };
    },

    // Click element (NO asking user!)
    click(selector) {
      const el = document.querySelector(selector);
      if (!el) return {error: `Element not found: ${selector}`};
      el.click();
      return {success: true, clicked: selector};
    },

    // Type text into input
    type(selector, text) {
      const el = document.querySelector(selector);
      if (!el) return {error: `Element not found: ${selector}`};
      
      // Trigger all events like a real user
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event('input', {bubbles: true}));
      el.dispatchEvent(new Event('change', {bubbles: true}));
      return {success: true, typed: text};
    },

    // Extract content from elements
    extract(selector) {
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).map(el => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        attributes: Array.from(el.attributes).reduce((acc, attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {})
      }));
    },

    // Scroll page
    scroll(direction, amount = 500) {
      const scrollOptions = {behavior: 'smooth'};
      if (direction === 'down') {
        window.scrollBy({top: amount, ...scrollOptions});
      } else if (direction === 'up') {
        window.scrollBy({top: -amount, ...scrollOptions});
      }
      return {success: true, scrolled: direction};
    },

    // Take screenshot of visible area
    async screenshot() {
      // Return viewport dimensions for background script to capture
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY
      };
    },

    // Find elements by text content
    findByText(text) {
      const xpath = `//*[contains(text(), '${text}')]`;
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const elements = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const el = result.snapshotItem(i);
        elements.push({
          selector: generateSelector(el),
          text: el.textContent?.trim(),
          tag: el.tagName
        });
      }
      return elements;
    },

    // Get all links
    getLinks() {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.trim(),
        selector: generateSelector(a)
      }));
    },

    // Get all form fields
    getForms() {
      return Array.from(document.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, textarea, select')).map(field => ({
          name: field.name,
          type: field.type,
          id: field.id,
          selector: generateSelector(field),
          placeholder: field.placeholder
        }))
      }));
    }
  };

  // =================================================================
  // MESSAGE HANDLER: Receive commands from background/sidebar
  // =================================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Comet Content Script] Received:', message);

    const {action, params} = message;
    
    try {
      let result;
      
      switch (action) {
        case 'readPage':
          result = AgentActions.readPage();
          break;
        case 'click':
          result = AgentActions.click(params.selector);
          break;
        case 'type':
          result = AgentActions.type(params.selector, params.text);
          break;
        case 'extract':
          result = AgentActions.extract(params.selector);
          break;
        case 'scroll':
          result = AgentActions.scroll(params.direction, params.amount);
          break;
        case 'screenshot':
          AgentActions.screenshot().then(sendResponse);
          return true; // Async response
        case 'findByText':
          result = AgentActions.findByText(params.text);
          break;
        case 'getLinks':
          result = AgentActions.getLinks();
          break;
        case 'getForms':
          result = AgentActions.getForms();
          break;
        case 'getAccessibilityTree':
          result = getAccessibilityTree();
          break;
        default:
          result = {error: `Unknown action: ${action}`};
      }
      
      sendResponse(result);
    } catch (error) {
      sendResponse({error: error.message});
    }
    
    return true; // Keep message channel open
  });

  // =================================================================
  // AGENT OVERLAY: Show "Stop Comet Assistant" when active
  // =================================================================
  function showAgentOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'comet-agent-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1a2e;
        color: #fff;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #00ff88;
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
        <span>Comet AI Agent Active</span>
        <button id="comet-stop-btn" style="
          background: #ff4444;
          border: none;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Stop</button>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      </style>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('comet-stop-btn')?.addEventListener('click', () => {
      overlay.remove();
      chrome.runtime.sendMessage({action: 'stopAgent'});
    });
  }

  // Initialize
  console.log('[Comet AI] Content script loaded on:', window.location.href);
  
  // Listen for agent activation
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'startAgent') {
      showAgentOverlay();
    }
  });

})();
