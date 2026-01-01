// Protection script to disable right-click and common developer tool shortcuts

// Disable right-click context menu
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
}, false);

// Disable common keyboard shortcuts for developer tools
document.addEventListener('keydown', function(e) {
    // Disable F12
    if (e.keyCode === 123) {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
        return false;
    }
    
    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
        return false;
    }

    // Disable Ctrl+Shift+C (Element Selector)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
        e.preventDefault();
        return false;
    }
}, false);

// Anti-debugging trick: debugger statement
// This will pause execution if DevTools is open
/*
setInterval(function() {
    debugger;
}, 1000);
*/

console.log("%cتنبيه: هذا الموقع محمي!", "color: red; font-size: 20px; font-weight: bold;");
console.log("محاولة الوصول إلى الكود المصدري قد تعرضك للمساءلة.");
