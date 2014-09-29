var mespeak = require("../mespeak.full.js")
mespeak.loadConfig(require("../mespeak_config.json"));
mespeak.loadVoice(require("../voices/en/en-us.json"))
var data = mespeak.speak("hello", {
	rawdata: true
});

console.log(data);
