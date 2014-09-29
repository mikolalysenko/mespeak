var mespeak = require("../");
var fs = require("fs");

mespeak.loadConfig(require("../src/mespeak_config.json"));
mespeak.loadVoice(require("../voices/en/en-us.json"))

var data = mespeak.speak("hello", {
	rawdata: true
});

fs.writeFileSync("test.wav",data);
