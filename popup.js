document.getElementById("show-orgs").addEventListener("click", function(){
	console.log('you clicked me');
	window.open(chrome.runtime.getURL('options.html'));
});
