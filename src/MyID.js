var id = null;

var util = require('./util');
var fs = null;

(function() {

	/**
	 * Look, if we have the ID from the last session
	 */

	if (typeof window === 'undefined') {
		// node
		var fs = require('fs');
		try {
			id = fs.readFileSync('./MY_ID', 'utf-8') || null;
		} catch (e) {
			id = null;
		}

	} else {
		// browser
		id = window.localStorage.getItem('myID') || null;
	}

	/**
	 * If not, create one
	 */

	if (id === null) {
		id = util.getRandomID();
	}

	/**
	 * And save it
	 */

	if (typeof window === 'undefined') {
		fs.writeFileSync('./MY_ID', id, 'utf-8');
	} else {
		window.localStorage.setItem('myID', id);
	}

})();

module.exports = id;