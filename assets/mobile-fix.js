(function(){var p=function(e){e.preventDefault()};
document.addEventListener("gesturestart",p);document.addEventListener("gesturechange",p);
document.addEventListener("touchmove",function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});
var l=0;document.addEventListener("touchend",function(e){var n=Date.now();if(n-l<300&&!e.target.closest("input,textarea,select"))e.preventDefault();l=n},{passive:false});})();
