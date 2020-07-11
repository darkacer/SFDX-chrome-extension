const idToOrgKey = new Map();
const idToOrgURL = new Map();

var token = '';
var orgURL ='';
var purpose = '';
const serviceData = '/services/data'
const version = '/v46.0/';
var objectList;
var settings = {
	"async": true,
	"crossDomain": true,
	"url": "https://" + orgURL + serviceData + version + purpose,
	"method": "GET",
	"headers": {
		"authorization": "Bearer " + token
	}
}

function loadOrgs() {
	var count = 0;
	chrome.cookies.getAll({"name":"sid"}, function(sidcook) {
		$('#table').empty();
		$('#table').append('<table id="tablefriendsname" border=1></table>');
		sidcook.forEach(elem => {
			var domain = elem.domain;
			if(new RegExp(".*salesforce\.com").test(domain)) {
				console.log(elem);
				$("#tablefriendsname").append("<tr><td>" + elem.domain + "</td></tr>");
				idToOrgKey.set(count, elem.value);
				idToOrgURL.set(count, elem.domain);
				count++;
			}
		});
		loadEventHandlers();
	});
}
loadOrgs();

function loadEventHandlers() {

	addAutoComplete();

	var rowId;
	var table = document.getElementById('table');
	var cells = table.getElementsByTagName('td');	
	for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        cell.onclick = function () {
            // Get the row id where the cell exists
			rowId = this.parentNode.rowIndex;
			token = idToOrgKey.get(rowId);
			orgURL = idToOrgURL.get(rowId);
			console.log(token, orgURL);
			$('#panel').show();
			$('#orgName').text(orgURL);
            var rowsNotSelected = table.getElementsByTagName('tr');
            for (var row = 0; row < rowsNotSelected.length; row++) {
                rowsNotSelected[row].style.backgroundColor = "";
                rowsNotSelected[row].classList.remove('selected');
            }
            var rowSelected = table.getElementsByTagName('tr')[rowId];
            rowSelected.style.backgroundColor = "green";
            rowSelected.className += " selected";
			objectList = undefined;
			$('#selector option[value="--Select One--"]').prop('selected','selected');
			$('.actions').hide();
        }
    }
	$('#clearData').bind('click', function() {
		$("#actualData").empty();
		$("#recordDetialTable").empty();
		$("#objectTable").empty();
	});
	$('select').change(function() {
		$('.actions').show();
		var str = '';
		$('select option').each(function() {
			str += "#"+$(this).text() + ",";
		});		
		str = str.substring(0, str.length - 1);
		$(str).hide();
		str = '';
		$('select option:selected').each(function() {
			str += $(this).text();
		});
		$('#' + str).show();

		//when each id is setup do initial setups
		if(str === 'objectDetails' || str === 'recordDetails'|| str === 'referencedBy') {
			var dataList = $('.datalist');
			dataList.empty();			
			purpose = 'sobjects/';
			settings.url = 'https://' + orgURL + serviceData + version + purpose;
			settings.headers.authorization = 'Bearer ' + token;
			console.log('firing obj request ' + settings);
			if(objectList === undefined) {

				fireRest(JSON.stringify(settings), function(response) {
					//objectList = response.sobjects.map(item => item.name);
					objectList = response.sobjects;
					createDataList1(JSON.stringify(objectList), dataList);
					console.log('im in!')
				});
			} else {
				createDataList1(JSON.stringify(objectList), dataList);
			}
		}
	});
	
	$('#getObjDetails').bind('click', function() {
		var val = $('#selectedObj').val();
		var objName = val.split(/-----\s*/);
		var str = objName[0];
		str = str.substring(0, str.length);
		purpose = 'sobjects/' + str + '/describe/';
		settings.headers.authorization = 'Bearer ' + token;
		settings.url = 'https://' + orgURL + serviceData + version + purpose;
		console.log('you selected obj details')
		
		fireRest(JSON.stringify(settings), function(response) {
			buildTableAtId('objectTable', JSON.stringify(response.fields));
		});
	});
}

function addAutoComplete() {
	var SOQLarray = ['Select', 'From', 'Where', 'project_cloud__project__c', 'limit', 'User', 'Account', 'like'];
		
	function split(val) {
		return val.split(/ \s*/);
	}
	function extractLast(term) {
		return split(term).pop();
	}
	
	$('#query').bind('keydown', function(event) {
		$('.ui-helper-hidden-accessible').empty();
		if (event.keyCode === $.ui.keyCode.TAB && $(this).autocomplete("instance").menu.active) {
			event.preventDefault();
		}		
	})
	.autocomplete({
		minLength: 0,
		source: function( request, response ) {
			response($.ui.autocomplete.filter(
				SOQLarray, extractLast(request.term)
			));
		},
		focus: function() {
			return false;
		},
		select: function( event, ui ) {
			var terms = split(this.value);
			terms.pop();
			terms.push(ui.item.value);
			terms.push("");
			this.value = terms.join(" ");
			return false;
		}
	});
}

$('#sendQuery').bind('click', function() {
	var query = $('#query').val();//.replace(/ /g, "+");
	query = query.replace(/  /g," ");
	query = query.replace(/ /g,"+");
	query = query.replace(/%/g,"%25");

	var purpose = 'query/?q=' + query;	
	//initialize token, orgURL, and purpose
	settings.url = 'https://' + orgURL + serviceData + version + purpose;
	settings.headers.authorization = 'Bearer ' + token;

	fireRest(JSON.stringify(settings), function(response) {
		$('#showData').show();
		$('#actualData').empty();
		response.records.forEach(el => delete el.attributes)
		if (response.records.length > 0) buildTableAtId('actualData', JSON.stringify(response.records));
		else buildTableAtId('actualData', '[{"no data found":"no records here"}]');
		console.log('data is ' + [response.records])
	});
});

$('#getRecDetails').bind('click', function() {
	var recordId = $('#recordId').val();
	var objectAPIName = $('#selectObj').val().split(/-----\s*/)[0];
	var givenId = 'recordDetialTable';
	
	purpose = 'sobjects/' + objectAPIName.substring(0, objectAPIName.length - 1) + '/' + recordId;
	settings.url = 'https://' + orgURL + serviceData + version + purpose;
	settings.headers.authorization = 'Bearer ' + token;

	fireRest(JSON.stringify(settings), function(response) {
		var output = Object.entries(response).map(([key, value]) => ({key,value}));
		buildTableAtId(givenId, JSON.stringify(output));		
	});
});


function createDataList(objectListData, dataList) {
	var objectList = JSON.parse(objectListData);
	objectList.forEach(item => {
		var option = document.createElement('option');						
		if (!new RegExp("__ChangeEvent|__Tag|__History|__Feed").test(item.name)) {
			option.value = item.name + ' ----- ' + item.label + ' object';
			option.text = item.name + ' ----- ' + item.label + ' object';
		}
		dataList.append(option);
		// x.add(option);
	});	
}

function createDataList1(objectListData, dataList) {
	var objectList = JSON.parse(objectListData);
	var options = '';
	
	objectList.forEach(item => {
		// var option = document.createElement('option');						
		if (!new RegExp("__ChangeEvent|__Tag|__History|__Feed").test(item.name)) {
			options += '<option value="'+item.name+'" />';
		}
		//dataList.append(options);
		// x.add(option);
	});	
	//console.log('objelist' + options);
	//dataList.innerHTML = options;
	dataList.append(options)
}


function fireRest(datasettings, callback) {
	var settings = JSON.parse(datasettings);
	if (settings) {
			$.ajax(settings).done(function (response) {
			callback(response);
		});
	}
}

// builds a table under div tag of givenId 
function buildTableAtId(givenId, stringRows) {
	var rows = JSON.parse(stringRows);
	$('#'+givenId).empty();
	var html = '<table border=1>';
	html += '<tr class="colhead">';
	for( var j in rows[0] ) {
		html += '<th>' + j + '</th>';
	}
	html += '</tr>';
	for( var i = 0; i < rows.length; i++) {
		html += '<tr>';
		for( var j in rows[i] ) {
			html += '<td class="ht">' + JSON.stringify(rows[i][j]) +'<span class="tooltip">'+ j+'</span></td>';
		}
		html += '</tr>';
	}
	html += '</table>';
	$('#' + givenId).html(html);
}