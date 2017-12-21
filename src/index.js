/*
	meSpeak  v.1.9.6
	based on speak.js, https://github.com/kripken/speak.js
	eSpeak and other code here are under the GNU GPL.
	meSpeak (Modular eSpeak) is a mod of 'speak.js' by N.Landsteiner (2011-2014), www.masswerk.at
	adding support for Webkit/Safari and external voice-modules
	v.1.1 and later default to play via the Web Audio API and uses the HTMLAudioElement as a second option.
	official project page: http://www.masswerk.at/mespeak
*/
"use strict";

var ESpeak = require("./ESpeak.js")

/* meScript.js essential changes start here */

var eSpeakDir = '/espeak',
	eSpeakDataDir = '/espeak/espeak-data',
	eSpeakVoicesDir = '/espeak/espeak-data/voices',
	eSpeak = new ESpeak(),
	fileRegistry = [],
	fsErrorDetected = false,
	configDataLoaded = false,
	unloading = false,
	speakQueue = [],
	voicesLoaded = {},
	defaultVoice = '',
	AudioAPI = null,
	canPlay = false,
	playbackVolume = 1,
	masterGain = null,
	audioContext = null,
	audioPool = {},
	webSoundPool = {},
	isChrome = ((typeof navigator !== 'undefined') && navigator.userAgent && navigator.userAgent.indexOf('Chrome') !== -1),
	chromeVersion = (isChrome) ? parseInt(navigator.userAgent.replace(/^.*?\bChrome\/([0-9]+).*$/, '$1'), 10) : 0;

function fsCreateDataFile(path, fname, data, doNotRegister) {
	if (!eSpeak.FS.findObject(path)) eSpeak.FS.createPath('/', path.substring(1), true, true);
	eSpeak.FS.createDataFile(path, fname, data, true, false);
	if (!doNotRegister) fileRegistry.push({
		path: path,
		fname: fname
	});
}

// work around a emscripten FS-bug causing the engine to stop at some iteration (80th call)
// simply create a new instance and reload any files
function recoverFromFSError(message) {
	console.log('meSpeak -- recovering from error:', message);
	// save any loaded files from broken instance
	var files = [],
		f, i, l = fileRegistry.length;
	for (i = 0; i < l; i++) {
		f = fileRegistry[i];
		files.push(eSpeak.FS.findObject(f.path + '/' + f.fname).contents);
	}
	// reboot to a new instance and insert any loaded files
	eSpeak = new ESpeak();
	setUpVFS();
	for (i = 0; i < l; i++) {
		f = fileRegistry[i];
		fsCreateDataFile(f.path, f.fname, files[i], true);
	}
	fsErrorDetected = true;
}

// basic FS setup, for config data see setConfigData(), for voices see setVoiceData()
function setUpVFS() {
	var optionFiles = {
		'croak': 'language variant\nname croak\ngender male 70\npitch 85 117\nflutter 20\nformant 0 100 80 110\n',
		'f1': 'language variant\nname female1\ngender female 70\npitch 140 200\nflutter 8\nroughness 4\nformant 0 115 80 150\nformant 1 120 80 180\nformant 2 100 70 150 150\nformant 3 115 70 150\nformant 4 110 80 150\nformant 5 110 90 150\nformant 6 105 80 150\nformant 7 110 70 150\nformant 8 110 70 150\nstressAdd -10 -10 -20 -20 0 0 40 60\n',
		'f2': 'language variant\nname female2\ngender female\npitch 142 220\nroughness 3\nformant 0 105 80 150\nformant 1 110 80 160\nformant 2 110 70 150\nformant 3 110 70 150\nformant 4 115 80 150\nformant 5 115 80 150\nformant 6 110 70 150\nformant 7 110 70 150\nformant 8 110 70 150\nstressAdd 0 0 -10 -10 0 0 10 40\nbreath 0 2 3 3 3 3 3 2\necho 140 10\nconsonants 125 125\n',
		'f3': 'language variant\nname female3\ngender female\npitch 140 240\nformant 0 105 80 150\nformant 1 120 75 150 -50\nformant 2 135 70 150 -250\nformant 3 125 80 150\nformant 4 125 80 150\nformant 5 125 80 150\nformant 6 120 70 150\nformant 7 110 70 150\nformant 8 110 70 150\nstressAmp 18 18 20 20 20 20 20 20\n//breath 0 2 4 4 4 4 4 4\nbreath 0 2 3 3 3 3 3 2\necho 120 10\nroughness 4\n',
		'f4': 'language variant\nname female4\ngender female\necho 130 15\npitch 142 200\nformant 0 120 80 150\nformant 1 115 80 160 -20\nformant 2 130 75 150 -200\nformant 3 123 75 150\nformant 4 125 80 150\nformant 5 125 80 150\nformant 6 110 80 150\nformant 7 110 75 150\nformant 8 110 75 150\nstressAdd -20 -20 -20 -20 0 0 20 120\nstressAmp 18 16 20 20 20 20 20 20\n',
		'f5': 'language variant\nname female5\ngender female\npitch 160 228\nroughness 0\nformant 0 105 80 150\nformant 1 110 80 160\nformant 2 110 70 150\nformant 3 110 70 150\nformant 4 115 80 200\nformant 5 115 80 100\nformant 6 110 70 150\nformant 7 110 70 100\nformant 8 110 70 150\nstressAdd 0 0 -10 -10 0 0 10 40\nbreath 0 4 6   6 6   6 0 10\necho 140 10\nvoicing 75\nconsonants 150 150\nbreathw 150 150 200 200 400 400\n',
		'klatt': 'language variant\nname klatt\nklatt 1\n',
		'klatt2': 'language variant\nname klatt2\nklatt 2\n',
		'klatt3': 'language variant\nname klatt3\nklatt 3\n',
		'm1': 'language variant\nname male1\ngender male 70\npitch 75 109\nflutter 5\nroughness 4\nconsonants 80 100\nformant 0 98 100 100\nformant 1 97 100 100\nformant 2 97 95 100\nformant 3 97 95 100\nformant 4 97 85 100\nformant 5 105 80 100\nformant 6 95 80 100\nformant 7 100 100 100\nformant 8 100 100 100\n//stressAdd -10 -10 -20 -20 0 0 40 70\n',
		'm2': 'language variant\nname male2\ngender male\npitch 88 115\necho 130 15\nformant 0 100 80 120\nformant 1 90 85 120\nformant 2 110 85 120\nformant 3 105 90 120\nformant 4 100 90 120\nformant 5 100 90 120\nformant 6 100 90 120\nformant 7 100 90 120\nformant 8 100 90 120\n',
		'm3': 'language variant\nname male3\ngender male\npitch 80 122\nformant 0 100 100 100\nformant 1 96 97 100\nformant 2 96 97 100\nformant 3 96 103 100\nformant 4 95 103 100\nformant 5 95 103 100\nformant 6 100 100 100\nformant 7 100 100 100\nformant 8 100 100 100\nstressAdd 10 10 0 0 0 0 -30 -30\n',
		'm4': 'language variant\nname male4\ngender male\npitch 70 110\nformant 0 103 100 100\nformant 1 103 100 100\nformant 2 103 100 100\nformant 3 103 100 100\nformant 4 106 100 100\nformant 5 106 100 100\nformant 6 106 100 100\nformant 7 103 100 100\nformant 8 103 100 100\nstressAdd -10 -10 -30 -30 0 0 60 90\n',
		'm5': 'language variant\nname male5\ngender male\nformant 0 100 85 130\nformant 1 90 85 130 40\nformant 2 80 85 130 310\nformant 3 105 85 130\nformant 4 105 85 130\nformant 5 105 85 130\nformant 6 105 85 150\nformant 7 105 85 150\nformant 8 105 85 150\nintonation 2\n',
		'm6': 'language variant\nname male6\ngender male\npitch 82 117\nformant 0 100 90 120\nformant 1 100 90 140\nformant 2 100 70 140\nformant 3 100 75 140\nformant 4 100 80 140\nformant 5 100 80 140\n',
		'm7': 'language variant\nname male7\npitch 75 125\nformant 0 100 125 100\nformant 1 100 90 80\nformant 2 100 70 90\nformant 3 100 60 90\nformant 4 100 60 90\nformant 5 75 50 90\nformant 6 90 50 100\nformant 7 100 50 100\nformant 8 100 50 100\nvoicing 155\n',
		'whisper': 'language variant\nname whisper\npitch 75 125\nformant 0 100 125 100\nformant 1 100 90 80\nformant 2 100 70 90\nformant 3 100 60 90\nformant 4 100 60 90\nformant 5 75 50 90\nformant 6 90 50 100\nformant 7 100 50 100\nformant 8 100 50 100\nvoicing 155\n',
		'whisperf': 'language variant\nname female whisper\ngender female\npitch 160 220\nroughness 3\nformant 0 105 0 150\nformant 1 110 40 160\nformant 2 110 70 150\nformant 3 110 70 150\nformant 4 115 80 150\nformant 5 115 80 150\nformant 6 110 70 150\nformant 7 110 70 150\nformant 8 110 70 150\nstressAdd 0 0 -10 -10 0 0 10 40\n// whisper\nvoicing 20\nbreath 75 75 50 40 15 10\nbreathw 150 150 200 200 400 400\n'
	};
	var dir = eSpeakVoicesDir + '/!v';
	eSpeak.FS.createPath('/', dir.substring(1), true, true);
	eSpeak.FS.root.write = true;
	for (var fn in optionFiles) {
		eSpeak.FS.createDataFile(dir, fn, decodeStringToArray(optionFiles[fn]), true, true);
	}
}
if (eSpeak && eSpeak.FS) setUpVFS();

function setConfigData(data) {
	[
		['config', decodeBase64ToArray(data.config)],
		['phontab', decodeBase64ToArray(data.phontab)],
		['phonindex', decodeBase64ToArray(data.phonindex)],
		['phondata', decodeBase64ToArray(data.phondata)],
		['intonations', decodeBase64ToArray(data.intonations)]
	].forEach(function(pair) {
		var id = pair[0];
		var data = pair[1];
		fsCreateDataFile(eSpeakDataDir, id, data);
	});
	configDataLoaded = true;
	// inspect data for an optional default-voice
	var voice = data.voice;
	if (typeof voice == 'object' && typeof voice.voice_id == 'string' && typeof voice.dict_id == 'string' && typeof voice.dict == 'string' && typeof voice.voice == 'string') {
		setVoiceData(voice);
	}
	executeQueuedCalls();
}

function setVoiceData(data) {
	var parts, path, fname, f;
	if (!voicesLoaded[data.voice_id]) {
		if (data.dict_id && !eSpeak.FS.findObject(eSpeakDataDir + '/' + data.dict_id)) fsCreateDataFile(eSpeakDataDir, data.dict_id, decodeBase64ToArray(data.dict));
		parts = data.voice_id.split('/');
		path = eSpeakVoicesDir;
		if (parts.length > 1) {
			path += '/' + parts.slice(0, parts.length - 1).join('/');
		}
		fname = parts[parts.length - 1];
		if (data.voice_encoding == 'text') {
			fsCreateDataFile(path, fname, decodeStringToArray(data.voice));
		} else {
			fsCreateDataFile(path, fname, decodeBase64ToArray(data.voice));
		}
		if (data.files && Array.isArray(data.files)) {
			for (var i = 0, l = data.files.length; i < l; i++) {
				f = data.files[i];
				if (typeof f == 'object' && typeof f.path == 'string' && f.path.length && typeof f.data == 'string' && f.data.length) {
					parts = f.path.split('/');
					if (parts.length > 1) {
						path = eSpeakDataDir + '/' + parts.slice(0, parts.length - 1).join('/');
					} else {
						path = eSpeakDataDir;
					}
					fname = parts[parts.length - 1];
					if (f.encoding == 'text') {
						fsCreateDataFile(path, fname, decodeStringToArray(f.data));
					} else {
						fsCreateDataFile(path, fname, decodeBase64ToArray(f.data));
					}
				}
			}
		}
		voicesLoaded[data.voice_id] = true;
	}
	setDefaultVoice(data.voice_id);
	executeQueuedCalls();
}

function decodeBase64ToArray(str) {
	function f(c) {
		if (c == 43) {
			return 62; // "+"
		} else if (c == 47) {
			return 63; // "/"
		} else if (c == 61) {
			return 64; // "="
		} else if (c <= 57) {
			return c + 4; // "0".."9"
		} else if (c <= 90) {
			return c - 65; // "A".."Z"
		} else {
			return c - 71; // "a".."z"
		}
	}
	var h1, h2, h3, h4, out = [],
		i = 0,
		l = str.length;
	while (i < l) {
		h1 = f(str.charCodeAt(i++));
		h2 = f(str.charCodeAt(i++));
		h3 = f(str.charCodeAt(i++));
		h4 = f(str.charCodeAt(i++));
		out.push((h1 << 2) | (h2 >> 4));
		if (h3 != 64) out.push(((h2 & 15) << 4) | (h3 >> 2));
		if (h4 != 64) out.push(((h3 & 3) << 6) | h4);
	}
	return out;
}

function encode64(data) {
	var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var PAD = '=';
	var ret = '';
	var leftchar = 0;
	var leftbits = 0;
	for (var i = 0, l = data.length; i < l; i++) {
		leftchar = (leftchar << 8) | data[i];
		leftbits += 8;
		while (leftbits >= 6) {
			var curr = (leftchar >> (leftbits - 6)) & 0x3f;
			leftbits -= 6;
			ret += BASE[curr];
		}
	}
	if (leftbits == 2) {
		ret += BASE[(leftchar & 3) << 4];
		ret += PAD + PAD;
	} else if (leftbits == 4) {
		ret += BASE[(leftchar & 0xf) << 2];
		ret += PAD;
	}
	return ret;
}

function decodeStringToArray(str) {
	var out = [],
		l = str.length,
		i;
	for (i = 0; i < l; i++) out.push(str.charCodeAt(i));
	return out;
}

function executeQueuedCalls() {
	// execute any defered calls to speak()
	if (configDataLoaded && defaultVoice) {
		for (var i = 0, l = speakQueue.length; i < l; i++) {
			var args = speakQueue[i];
			if (args[3].multipart) {
				speakMultipart(args[0], args[1], args[2], args[3]);
			} else {
				speak(args[0], args[1], args[2], args[3]);
			}
		}
		speakQueue.length = 0;
	}
}

function resetQueue() {
	// public
	speakQueue.length = 0;
}

function speak(text, args, callback, _id) {
	// public
	// returns:
	// with option "rawdata": stream-object in specified format (or null on failure)
	// default: returns numeric 32bit id (or 0 on failure)
	if (typeof args !== 'object') args = {};
	if (!canPlay && !args.rawdata) {
		console.warn('meSpeak: Can\'t play; No audio support.');
		return 0;
	}
	if (!_id || !isValidJobId(_id)) _id = getJobId();
	if (!configDataLoaded || !defaultVoice) {
		console.warn(((!configDataLoaded) ? 'No config-data loaded' : 'No voice module loaded') + ', deferring call.');
		if (args.rawdata) {
			return null;
		} else {
			speakQueue.push([text, args, callback, _id]);
			return _id.number;
		}
	}
	if (args && args.voice && !voicesLoaded[args.voice]) {
		console.warn('Voice ' + args.voice + ' not available. Using default voice: ' + defaultVoice);
	}
	var varg = (args.voice) ? String(args.voice) : (args.v) ? String(args.v) : defaultVoice;
	if (varg.indexOf('mb/mb-') == 0) varg = varg.substring(3);
	if (args.variant) varg += '+' + String(args.variant).replace(/\+/g, '');
	var argstack = [
		'-w', 'wav.wav',
		'-a', args.amplitude !== undefined ? String(args.amplitude) : args.a !== undefined ? String(args.a) : '100',
		'-g', args.wordgap !== undefined ? String(args.wordgap) : args.g !== undefined ? String(args.g) : '0',
		'-p', args.pitch !== undefined ? String(args.pitch) : args.p !== undefined ? String(args.p) : '50',
		'-s', args.speed !== undefined ? String(args.speed) : args.s !== undefined ? String(args.s) : '175',
		'-b', args.utf16 ? '4' : args.b !== undefined ? String(args.b) : '1',
		'-v', varg
	];
	var a = args.linebreak || args.l;
	if (a) argstack.push('-l', String(a));
	a = args.capitals || args.k;
	if (a) argstack.push('-k', String(a));
	a = args.nostop || args.z;
	if (a) argstack.push('-z');
	if (args.punct !== undefined) {
		if (typeof args.punct == 'string') {
			if (args.punct.length) {
				argstack.push('--punct="' + String(args.punct).replace(/([\\"'])/g, '\\$1') + '"');
			} else {
				argstack.push('--punct');
			}
		} else if (args.punct) {
			argstack.push('--punct');
		}
	}
	a = args.ssml || args.m || args.markup;
	if (a) argstack.push('-m');
	argstack.push('--path=' + eSpeakDir, String(text));
	if (args.log && self.console) console.log('executing espeak ' + argstack.join(' '));
	eSpeak.Module.arguments = argstack;

	if (typeof callback != 'function') callback = undefined;
	if (!callback && typeof args.callback == 'function') callback = args.callback;

	fsErrorDetected = false;
	eSpeak.run();
	if (fsErrorDetected) {
		// eSpeak breaks sometimes on flushing streams, approx. every 80th call
		fsErrorDetected = false;
		eSpeak.Module.arguments = argstack;
		eSpeak.run();
	}

	var outfile = eSpeak.FS.root.contents['wav.wav'].contents,
		wav = unsignedStream(outfile);
	outfile.length = 0;
	argstack = null;

	return (args.rawdata) ? exportStream(wav, args.rawdata) : playSound(wav, args.volume, callback, _id);
}

function exportStream(stream, format) {
	// private
	switch (String(format).toLowerCase()) {
		case 'array':
			return stream;
		case 'base64':
			return encode64(stream);
		case 'buffer':
			return new Buffer(stream);
		case 'data-url':
		case 'data-uri':
		case 'dataurl':
		case 'datauri':
		case 'mime':
			return 'data:audio/x-wav;base64,' + encode64(stream);
		default:
			var buffer = new ArrayBuffer(stream.length);
			new Uint8Array(buffer).set(stream);
			return buffer;
	}
}

function speakMultipart(parts, args, callback, _id) {
	// public
	// returns:
	// with option "rawdata": stream-object in specified format (or null on failure)
	// default: returns numeric 32bit id (or 0 on failure)
	if (typeof args !== 'object') args = {};
	if (!canPlay && !args.rawdata) {
		console.warn('meSpeak: Can\'t play; No audio support.');
		return 0;
	}
	var failed = false;
	if (typeof callback != 'function') callback = undefined;
	if (!callback && typeof args.callback == 'function') callback = args.callback;
	if (Object.prototype.toString.call(parts) != '[object Array]' || !parts.length) {
		console.warn('meSpeak.speakMultipart: First argument must be an array of objects.');
		failed = true;
	}
	if (!failed) {
		for (var i = 0, l = parts.length; i < l; i++) {
			if (typeof parts[i] != 'object') {
				console.warn('meSpeak.speakMultipart: First argument must be an array of objects (part #' + i + ').');
				failed = true;
				break;
			}
		}
	}
	if (failed) {
		if (args.rawdata) {
			return null;
		} else {
			if (callback) callback(false);
			return 0;
		}
	}
	if (!_id || !isValidJobId(_id)) _id = getJobId();
	if (!configDataLoaded || !defaultVoice) {
		console.warn(((!configDataLoaded) ? 'No config-data loaded' : 'No voice module loaded') + ', deferring call.');
		if (args.rawdata) {
			return null;
		} else {
			_id.multipart = true;
			speakQueue.push([parts, args, callback, _id]);
			return _id.number;
		}
	}
	// everything ok, now actually do it
	var wav, sampleLength;
	// loop over the parts
	for (var i = 0, l = parts.length; i < l; i++) {
		var n, part = parts[i],
			opts = {};
		for (n in args) opts[n] = args[n];
		for (n in part) opts[n] = part[n];
		opts.rawdata = 'array';
		opts.callback = undefined;
		var buffer = meSpeak.speak(part.text, opts);
		if (!buffer) {
			if (args.rawdata) {
				return null;
			} else {
				if (callback) callback(false);
				return 0;
			}
		}
		if (i == 0) {
			// first: store it and extract the sample length
			wav = buffer;
			sampleLength = readBytes(buffer, 40, 4);
		} else {
			// extract the sample length and add it
			sampleLength += readBytes(buffer, 40, 4);
			// strip header and append samples
			wav = wav.concat(buffer.slice(44));
		}
		buffer = null;
	}
	// fix up the sample length (pos 4 and pos 40 in header)
	writeBytes(wav, 4, 4, sampleLength);
	writeBytes(wav, 40, 4, sampleLength);
	// export/play it
	return (args.rawdata) ? exportStream(wav, args.rawdata) : playSound(wav, args.volume, callback, _id);
}

function writeBytes(f, p, n, value) {
	// private: write bytes to a file, least significant first
	while (n) {
		f[p++] = value & 0xff;
		value = value >> 8;
		n--;
	}
}

function readBytes(f, p, n) {
	// private: read bytes from a file, least significant first
	var value = 0,
		shft = 0;
	while (n) {
		value |= f[p++] << shft;
		shft += 8;
		n--;
	}
	return value;
}

function unsignedStream(wav) {
	// private
	var i, l = wav.length,
		v, out = new Array(l);
	for (i = 0; i < l; i++) {
		v = wav[i];
		out[i] = (v >= 0) ? v : 256 + v;
	}
	return out;
}

function getJobId() {
	// private
	var n, s;
	while (!n || audioPool[s] || webSoundPool[s]) {
		n = Math.floor(Math.random() * Math.pow(2, 32));
		s = n.toString(16);
	}
	return {
		number: n,
		string: s
	}
}

function isValidJobId(id) {
	// private
	return !(Object.prototype.toString.call(id) !== '[object Object]' || Object.prototype.toString.call(id.number) !== '[object Number]' || Object.prototype.toString.call(id.string) !== '[object String]' || !id.number || id.string !== id.number.toString(16));
}

function playSound(stream, relVolume, callback, _id) {
	// public (play): play a wav-stream or an ArrayBuffer generated using option 'rawdata'
	// returns numeric 32bit id (or 0 on failure)
	if (callback && (typeof callback != 'function')) callback = undefined;
	if (!_id || !isValidJobId(_id)) _id = getJobId();
	var streamType = Object.prototype.toString.call(stream);
	if (!(streamType == '[object Array]' || streamType == '[object ArrayBuffer]' || streamType == '[object String]')) {
		console.warn('meSpeak: Can\'t play, not an Array, or ArrayBuffer, or base64-String: ' + streamType);
		if (callback) callback(false);
		return 0;
	}
	if (relVolume !== undefined) {
		relVolume = parseFloat(relVolume);
		if (isNaN(relVolume) || relVolume < 0 || relVolume > 1) relVolume = undefined;
	}
	if (AudioAPI) {
		if (streamType == '[object String]') {
			if (stream.indexOf('data:audio/x-wav;base64,', 0) == 0) stream = stream.substring(24);
			stream = stream.replace(/=+$/, '');
			if (stream.match(/[^A-Za-z0-9\+\/]/)) {
				console.warn('meSpeak: Can\'t play, not a proper base64-String.');
				if (callback) callback(false);
				return 0;
			}
			stream = decodeBase64ToArray(stream);
			if (!stream.length) {
				console.warn('meSpeak: Can\'t play, empty sound data.');
				if (callback) callback(false);
				return 0;
			}
			streamType = '[object Array]';
		}
		var buffer;
		if (streamType == '[object Array]') {
			var buffer = new ArrayBuffer(stream.length);
			new Uint8Array(buffer).set(stream);
		} else {
			buffer = stream;
		}
		return playWebSound(buffer, relVolume, callback, _id);
	} else if (canPlay) {
		var isDataUrl = false;
		if (streamType == '[object String]') {
			if (stream.indexOf('data:audio/x-wav;base64,', 0) < 0) {
				if (stream.match(/[^A-Za-z0-9\+\/]/)) {
					console.warn('meSpeak: Can\'t play, not a proper base64-String.');
					if (callback) callback(false);
					return 0;
				}
				stream = 'data:audio/x-wav;base64,' + stream;
			}
			isDataUrl = true;
		} else if (streamType == '[object ArrayBuffer]') {
			stream = new Uint8Array(stream);
		}
		return (new AudioPlayback(stream, relVolume, isDataUrl, callback, _id).started) ? _id.number : 0;
	} else {
		console.warn('meSpeak: Can\'t play; No audio support.');
		if (callback) callback(false);
		return 0;
	}
}

// public meSpeak.stop()
// takes IDs returned by meSpeak.speak() and/or meSpeak.play as arguments
// if called whitout an argument, all sounds will be stopped.
// returns the number of sounds stopped
function stopSound() {
	var id, i, k, kl, l, item, n, stopped = 0;
	if (arguments.length > 0) {
		// stop specific sounds (by numeric 32bit id)
		for (i = 0, l = arguments.length; i < l; i++) {
			n = parseInt(arguments[i]);
			if (n && !isNaN(n)) {
				id = n.toString(16);
				if (audioPool[id]) {
					audioPool[id].stop();
					stopped++;
				} else if (webSoundPool[id]) {
					stopWebSound(webSoundPool[id]);
					stopped++;
				} else {
					for (k = 0, kl = speakQueue.length; k < kl; k++) {
						item = speakQueue[i];
						if (item[3].string === id) {
							if (!unloading && typeof item[2] == 'function') item[2](false);
							speakQueue.splice(k, 1);
							stopped++;
							break;
						}
					}
				}
			}
		}
	} else {
		// stop all sounds
		for (id in audioPool) {
			audioPool[id].stop();
			stopped++;
		}
		for (id in webSoundPool) {
			stopWebSound(webSoundPool[id]);
			stopped++;
		}
		for (i = 0, l = speakQueue.length; i < l; i++) {
			item = speakQueue[i];
			if (!unloading && typeof item[2] == 'function') item[2](false);
			stopped++;
		}
		speakQueue.length = 0;
	}
	return stopped;
}

function setVolume(vol) {
	// public, sets master volume (no arguments) or rel volume for provided ids
	var id, i, l, n, v;
	v = parseFloat(vol);
	if (!isNaN(v) && v >= 0 && v <= 1 && v != playbackVolume) {
		if (arguments.length == 1) playbackVolume = v;
		if (AudioAPI) {
			if (arguments.length > 1) {
				for (i = 0, l = arguments.length; i < l; i++) {
					n = parseInt(arguments[i]);
					if (n && !isNaN(n)) {
						id = n.toString(16);
						if (webSoundPool[id]) setWebSoundVolume(webSoundPool[id], v);
					}
				}
			} else if (masterGain) {
				masterGain.gain.value = playbackVolume;
			}
		} else if (canPlay) {
			if (arguments.length > 1) {
				for (i = 0, l = arguments.length; i < l; i++) {
					n = parseInt(arguments[i]);
					if (n && !isNaN(n)) {
						id = n.toString(16);
						if (audioPool[id]) audioPool[id].setVolume(v);
					}
				}
			} else {
				for (id in audioPool) audioPool[id].adjustVolume();
			}
		}
	}
	return vol;
}

function getVolume() {
	// public, getter for master volume (no argument) or rel volume for first id provided
	if (arguments.length) {
		var n = parseInt(arguments[0]);
		if (n && !isNaN(n)) {
			var id = n.toString(16);
			if (webSoundPool[id]) return webSoundPool[id].relVolume;
			if (audioPool[id]) return audioPool[id].relVolume;
		}
		return undefined;
	} else {
		return playbackVolume;
	}
}

function resolveAudioApi() {
	if (typeof window !== 'undefined' && self.AudioContext) {
		AudioAPI = self.AudioContext;
		canPlay = true;
		return;
	} else {
		if (typeof window !== 'undefined') {
			var vendors = ['webkit', 'moz', 'o', 'ms'];
			for (var i = 0; i < vendors.length; i++) {
				var api = window[vendors[i] + 'AudioContext'];
				if (api) {
					AudioAPI = api;
					canPlay = true;
					return;
				}
			}
		}
	}
	if (!AudioAPI) {
		if (typeof window === 'undefined') {
			canPlay = true;
			console.warn('meSpeak: Not in browser Only able to do raw');
			return;
		}
		var audioElement = document.createElement('audio');
		if (audioElement && audioElement.canPlayType && (audioElement.canPlayType('audio/wav') || audioElement.canPlayType('audio/x-wav'))) {
			canPlay = true;
		} else {
			canPlay = false;
			console.warn('meSpeak: Muted. No support for HTMLAudioElement with MIME "audio/x-wav" dected.');
		}
	}
}
resolveAudioApi();

function canPlaybackWav() {
	// public (canPlay)
	return canPlay;
}

// Controller for HTMLAudioElements (collected in pool to provide access to volume of playing instances)
// (external dependencies: var playbackVolume; input: stream Array (uint8), relVolume: Number 0..1, callback: function)
// provides external method adjustVolume()
function AudioPlayback(stream, relVolume, isDataUrl, callback, id) {
	this.relVolume = relVolume;
	this.audio = null;
	this.id = id.string;
	this.callback = (typeof callback == 'function') ? callback : undefined;
	this.playing = false;
	this.started = false;
	this.play(stream, isDataUrl);
}
AudioPlayback.prototype = {
	play: function(stream, isDataUrl) {
		try {
			audioPool[this.id] = this;
			this.audio = document.createElement('audio');
			this.adjustVolume();
			var that = this;
			this.audio.addEventListener('ended', function() {
				that.remove();
			}, false);
			this.audio.addEventListener('canplaythrough', function() {
				that.audio.play();
				that.playing = true;
			}, false);
			if (isDataUrl) {
				this.audio.src = stream;
			} else {
				this.audio.src = 'data:audio/x-wav;base64,' + encode64(stream);
			}
			this.audio.load();
			this.started = true;
		} catch (e) {
			console.warn('meSpeak: HTMLAudioElement Exception: ' + e.message);
			this.started = false;
			this.remove();
		}
	},
	adjustVolume: function() {
		this.audio.volume = (this.relVolume !== undefined) ? this.relVolume * playbackVolume : playbackVolume;
	},
	setVolume: function(v) {
		this.relVolume = v;
		this.adjustVolume();
	},
	remove: function(stopped) {
		if (this.id) delete audioPool[this.id];
		if (this.callback) {
			var f = this.callback;
			this.callback = undefined;
			if (!unloading) f(!stopped);
		}
	},
	stop: function() {
		try {
			if (this.playing) this.audio.pause();
		} catch (e) {}
		this.remove(true);
	}
};

// play a sound via Web Audio API
// (external dependencies: vars masterGain, playbackVolume; input: stream ArrayBuffer (Uint8Array), relVolume: Number 0..1, callback: function)
function playWebSound(stream, volume, callback, id) {
	try {
		var source, gainNode, timer, relVolume;
		if (!audioContext) audioContext = new AudioAPI();
		if (!masterGain) {
			masterGain = (audioContext.createGain) ? audioContext.createGain() : audioContext.createGainNode();
			masterGain.connect(audioContext.destination);
			masterGain.gain.value = playbackVolume;
		}
		source = audioContext.createBufferSource();
		relVolume = parseFloat(volume);
		if (relVolume === undefined || isNaN(relVolume) || relVolume < 0 || relVolume > 1) relVolume = 1;
		gainNode = (audioContext.createGain) ? audioContext.createGain() : audioContext.createGainNode();
		gainNode.connect(masterGain);
		gainNode.gain.value = relVolume;
		source.connect(gainNode);
		audioContext.decodeAudioData(stream, function(audioData) {
				var f = function() {
					webSoundEndHandler(source, gainNode, callback, true, id.string);
				};
				if (!isChrome && source.onended !== undefined) {
					source.onended = f;
				} else {
					var duration = audioData.duration;
					setTimeout(f, duration ? Math.ceil(duration * 1000) : 10);
				}
				source.buffer = audioData;
				if (chromeVersion >= 32 && source.start) source.start(0);
			},
			function(err) {
				console.log('meSpeak: Web Audio Decoding Error: ' + ((typeof err == 'object') ? err.message : err));
				if (timer) clearTimeout(timer);
				if (source) source.disconnect();
				if (gainNode) gainNode.disconnect();
				if (webSoundPool[id.string]) delete webSoundPool[id.string];
				if (!unloading && typeof callback == 'function') callback(false);
				return 0;
			});
		webSoundPool[id.string] = {
			'source': source,
			'gainNode': gainNode,
			'callback': callback,
			'id': id.string,
			'relVolume': relVolume
		};
		if (chromeVersion < 32) {
			if (source.start) {
				source.start(0);
			} else {
				source.noteOn(0);
			}
		}
		return id.number;
	} catch (e) {
		console.warn('meSpeak: Web Audio Exception: ' + e.message);
		if (timer) clearTimeout(timer);
		webSoundEndHandler(source, gainNode, callback, false, id.string);
		return 0;
	}
}

function webSoundEndHandler(source, gainNode, callback, success, id) {
	if (!unloading && typeof callback == 'function') callback(success);
	// finnaly clean up with a bit of delay (work around a Chrome duration bug/issue)
	var f = function() {
		if (source) {
			if (source.onended !== undefined) source.onended = undefined;
			source.disconnect();
		}
		if (gainNode) gainNode.disconnect();
		if (id && webSoundPool[id]) delete webSoundPool[id];
	};
	if (!success) {
		f();
	} else {
		setTimeout(f, 500);
	}
}

function stopWebSound(obj) {
	// private
	try {
		if (obj.source.stop) {
			obj.source.stop(0);
		} else {
			obj.sourcesource.noteOff(0);
		}
	} catch (e) {}
	webSoundEndHandler(obj.source, obj.gainNode, obj.callback, false, obj.id);
}

function setWebSoundVolume(obj, v) {
	// private
	obj.gainNode.gain.value = v;
	obj.relVolume = v;
}

function setDefaultVoice(voice) {
	// public
	if (voice && voicesLoaded[voice]) defaultVoice = voice;
}

function getDefaultVoice() {
	// public
	return defaultVoice;
}

function loadVoice(url, callback) {
	// public
	if (typeof url !== 'string') {
		setVoiceData(url);
		if (callback) callback(false, url.voice_id);
	} else if (url) new HttpRequest(url, voiceRequestCallback, callback);
}

function loadConfig(url) {
	// public
	if (typeof url === 'object') setConfigData(url);
	else if (url) new HttpRequest(url, configDataRequestCallback, null);
}

function isVoiceLoaded(voice) {
	// public
	return (voicesLoaded[voice]) ? true : false;
}

function isConfigLoaded() {
	// public
	return (configDataLoaded) ? true : false;
}

var HttpRequest
if (typeof window === "undefined") {
	HttpRequest = function(url, loadCallback, userCallback) {
		var error = new Error("meSpeak: URLs not supported in Node.js");
		if(userCallback)userCallback(error,null);
		else throw error;
	}
} else {
	HttpRequest = function(url, loadCallback, userCallback) {
		// userCallback is an optional callback-handler.
		var req = this.request = new XMLHttpRequest();
		this.handler = loadCallback;
		this.url = url;
		this.localmode = Boolean(window.location.href.search(/^file:/i) == 0);
		this.userCallback = userCallback;
		var objref = this;
		try {
			req.open('GET', url);
			req.onreadystatechange = function() {
				objref.handler();
			};
			req.send('');
		} catch (e) {
			if (window.console) console.warn('Failed to load resource from ' + url + ': Network error.');
			if (typeof userCallback == 'function') userCallback(false, 'network error');
			this.request = this.handler = this.userCallback = null;
		}
	}
}

function voiceRequestCallback() {
	var req = this.request;
	if (req.readyState == 4) {
		if (this.localmode || req.status == 200) {
			var data = JSON.parse(req.responseText);
			if (typeof data == 'object' && typeof data.voice_id == 'string' && typeof data.voice == 'string' && (
				((!data.dict_id && !data.dict_id) || (typeof data.dict_id == 'string' && typeof data.dict == 'string')) || (!data.files || (typeof data.files == 'object' && Array.isArray(data.files)))
			)) {
				setVoiceData(data);
				if (typeof this.userCallback == 'function') this.userCallback(true, data.voice_id);
			} else {
				console.warn('Failed to load voice from ' + this.url + ': Not a voice module.');
				if (typeof this.userCallback == 'function') this.userCallback(false, 'data error');
			}
		} else {
			console.warn('Failed to load voice from ' + this.url + ': Received status ' + req.status + '.');
			if (typeof this.userCallback == 'function') this.userCallback(false, 'file error');
		}
		this.request = this.handler = this.userCallback = null;
	}
}

function configDataRequestCallback() {
	var req = this.request;
	if (req.readyState == 4) {
		if (this.localmode || req.status == 200) {
			var data = JSON.parse(req.responseText);
			if (typeof data == 'object' && typeof data.config == 'string' && typeof data.phontab == 'string' && typeof data.phonindex == 'string' && typeof data.phondata == 'string' && typeof data.intonations == 'string') {
				setConfigData(data);
			} else {
				console.warn('Failed to load config-data from ' + this.url + ': No valid data.');
			}
		} else {
			console.warn('Failed to load config-data from ' + this.url + ': Received status ' + req.status + '.');
		}
		this.request = this.handler = this.userCallback = null;
	}
}

function unloadHandler(event) {
	unloading = true;
	stopSound();
	audioPool = {};
	webSoundPool = {};
}

if (typeof window !== 'undefined') window.addEventListener('unload', unloadHandler, false);

// public interface
module.exports = {
	speak: speak,
	speakMultipart: speakMultipart,
	loadConfig: loadConfig,
	loadVoice: loadVoice,
	setDefaultVoice: setDefaultVoice,
	getDefaultVoice: getDefaultVoice,
	setVolume: setVolume,
	getVolume: getVolume,
	play: playSound,
	isConfigLoaded: isConfigLoaded,
	isVoiceLoaded: isVoiceLoaded,
	resetQueue: resetQueue,
	canPlay: canPlaybackWav,
	stop: stopSound
}
