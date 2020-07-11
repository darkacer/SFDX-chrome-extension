chrome.commands.onCommand.addListener(function (command) {
    if (command === "save") {
        //alert("save");
		console.log('save button hit')
		window.open(chrome.runtime.getURL('options.html'));
    } else if (command === "random") {
        alert("random");
		console.log('save me');
    }
});