self.window = self;
importScripts('https://unpkg.com/web3@1.3.4/dist/web3.min.js');

var web3 = new Web3();

function uint256(x) {
    return parseInt(x, 16);
}

function findMagicNumber(hash, difficulty, start) {
    const encodePacked = web3.utils.encodePacked;
    const keccak256 = web3.utils.keccak256;
    const exp = 240 - (difficulty * 4);
    const target = (2 ** exp) - 1;
    var nonce = start;
    while (uint256(keccak256(encodePacked(hash, nonce))) >= target) {
        postMessage({value: nonce++, done: false});
    }
    postMessage({value: nonce, done: true});
}

self.addEventListener("message", function(e) {
  var args = e.data;
  findMagicNumber(args.hash, args.difficulty, args.start);
}, false);
