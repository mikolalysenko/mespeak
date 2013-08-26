var mespeak = require("../mespeak.full.js")
mespeak.loadVoice(require("../voices/en/en-us.json"))
var b = new Buffer(new Uint8Array(mespeak.speak("hello", {rawdata:true})))
process.stdout.write(b)
