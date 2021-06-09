// Web3Modal Provider
const providerOptions = {
    walletconnect: {
      package: WalletConnectProvider.default,
        options: {
            rpc: {
                56: "https://bsc-dataseed.binance.org/",
                97: "https://data-seed-prebsc-1-s2.binance.org:8545/"
            }
        }
    }
};

// Transaction error
const ERROR = "0xERROR";

const Networks = {
    "mainnet": {
        "id": 56,
        "url": "https://bsc-dataseed.binance.org/"
    },
    "chapel": {
        "id": 97,
        "url": "https://data-seed-prebsc-1-s1.binance.org:8545/"
    }
};

// Icons
const iconCopy = "<i class=\"fas fa-copy ml-2 mr-2\"></i>";
const iconLink = "<i class=\"fa fa-external-link-alt mr-2\"></i>";
const iconWork = "<i class=\"fas fa-sync fa-spin mr-2\"></i>";
const iconMine = "<i class=\"fas fa-cog fa-spin mr-2\"></i>";
const iconDone = "<i class=\"fas fa-check-circle mr-2\" style=\"color:green\"></i>";
const iconWarn = "<i class=\"fas fa-exclamation-triangle mr-2\" style=\"color:red\"></i>";
const iconCSS = "text-decoration: none; color: gray;";

// Network
const targetChainId = 97;
const network = "chapel";
const factoryAddress = "0x9F68386ef0Cb483A72A460d973FE8a9eee2eCA50";
const blocktime = 5;

// Contracts
var factory;
var airdrop;
var erc20token;

// Web3
var web3;
var web3Modal;
var provider;
var chainId;

// Wallet
var walletNetwork;
var isWalletConnected;
var selectedAccount;

// Airdrop
var authorizedTokens;
var airdropData;
const airdropDuration = (3 * 24 * 60 * 60) / blocktime;
const airdropPhases = [
    "Registration",
    "Validation",
    "Claim",
    "Expired"
]
const userPhases = [
    "Unregistred",
    "Registered",
    "Validated",
    "Claimed"
]

// Registration
var magicNumber = null;

// Peer validation
const numPeers = 5;
const lastPeer = numPeers - 1;
var selectedPeer;
var userReview;

// Transactions
var txApproval;

// UI management
var modalStack = [];

// Check if object exists
function exists(obj) {
    return eval("typeof " + obj + " !== 'undefined' && " + obj + "!== null");
};

// Add removal function to String
String.prototype.remove = function (s) {
    return this.replaceAll(s, "");
};

// Deep-copy using JSON
function JSONCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Make it pretty
function JSONPretty(obj) {
    return JSON.stringify(obj, null, 2).replace(
        /\n( *)/g,
        function (match, p1) {
            return '<br>' + '&nbsp;'.repeat(p1.length);
        }
    );
}

// Make it pretty
function prettyArray(a) {
    return String(a).replaceAll(",", ", ");
}

// Show what went wrong
function showError(error) {
    console.log(`Error: ${error}`);
}

function isAddress(str) {
    return str.startsWith("0x");
}

function isAddressField(str) {
    return (isAddress(str) || str == "this");
}

function shortAddress(str) {
    return str.substr(0,6) + "..." + str.substr(-4);
}

function getObj(id) {
    return document.getElementById(id);
}

async function updateNetworkConnection() {
    // Get a Web3 instance for the wallet
    web3 = new Web3(provider);
    console.log("Web3 instance is", web3);

    // Get connected chain id from Ethereum node
    chainId = await web3.eth.getChainId();

    // Load chain information over an HTTP API
    var chainData = evmChains.getChain(chainId);
    walletNetwork = chainData.network.toLowerCase();

    // Get list of accounts of the connected wallet
    var accounts = await web3.eth.getAccounts();
    console.log("Got accounts", accounts);
    web3.eth.defaultAccount = accounts[0];
    selectedAccount = web3.eth.defaultAccount;

    // Check if we're on the right network
    if (!isWalletConnectedToTheRightNetwork()) {
        hideContractInteraction();
        displayWrongNetworkWarning();
        return;
    }

    // Load the factory contract
    factory = await loadContract("factory.json", factoryAddress);

    // Update the webpage
    showContractInteraction();

    // Close any active modals
    closeAllModals();
}

// async function displayBalance() {
//     myBalance = await read("myBalance");
//     myBalance = parseFloat(myBalance / (10**18)).toFixed(3)
//     getObj("balance").style.display = "block";
//     getObj("balance").innerHTML = "Balance: " + myBalance + " KITTY";
//
//     remaining = await read("contractBalance");
//     if (remaining == 0) return;
//
//     remaining = parseFloat(remaining / (10**18)).toFixed(3)
//     getObj("airdrop").style.display = "block";
//     getObj("airdrop").innerHTML = "Airdrop: " + remaining + " tokens left";
// }

function showButton(name) {
    getObj(name).classList.remove("d-none");
    getObj(name).classList.add("d-block");
}

function hideButton(name) {
    getObj(name).classList.remove("d-block");
    getObj(name).classList.add("d-none");
}

function hideContractInteraction() {
    hideButton("claim");
    hideButton("create");
}

function showContractInteraction() {
    showButton("claim");
    showButton("create");
}

function connectWallet() {
  if (isWalletConnected) {
      onDisconnect();
  }
  else {
      onConnect();
  }
}

async function onConnect() {
    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
    } catch (e) {
        console.log("Could not get a wallet connection:", e);
      return;
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        updateNetworkConnection();
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        updateNetworkConnection();
    });

    // // Subscribe to networkId change
    // provider.on("networkChanged", (networkId) => {
    //     updateNetworkConnection();
    // });

    try {
        await updateNetworkConnection();
    }
    catch (e) {
        console.log("Error fetching account details:", e);
        onDisconnect();
    }
    isWalletConnected = true;
    getObj("connect").innerHTML = "Disconnect";
}

async function onDisconnect() {
    isWalletConnected = false;
    getObj("connect").innerHTML = "Connect";
    hideContractInteraction();

    console.log("Killing the wallet connection", provider);

    if(provider && provider.close) {
        await provider.close();
        await web3Modal.clearCachedProvider();
        provider = null;
    }

    selectedAccount = null;
    web3 = null;
}

function getFunction(contract, fnName, isReadOnly, ...args) {
    //var fn = eval(contract + ".methods." + fnName)(...args);
    var fn = contract.methods[fnName](...args);
    if (isReadOnly) return fn.call;
    return fn.send;
}

// Contract Read function
function read(contract, fnName, callback, ...args) {
    return getFunction(contract, fnName, true, ...args)(
        function(error, result) {
            if (error) {
                console.log(error);
                if (callback) callback(ERROR);
            }
            else {
                if (callback) callback(result);
                console.log(result);
            }
        }
    );
}

// Contract Write function
function write(contract, fnName, callback, details, ...args) {
    return getFunction(contract, fnName, false, ...args)(
        details,
        function(error, result) {
            if (error) {
                console.log(error);
                if (callback) callback(ERROR);
            }
            else {
                if (callback) callback(result);
                console.log(result);
            }
        }
    );
}

function parseOutput(obj) {
    var obj;
    if (typeof(obj) == "object") {
        obj = JSONPretty(obj);
    }
    else {
        try {
            // Check if the output is in JSON format
            obj = JSONPretty(JSON.parse(obj));
        }
        catch (e) {
            // It's not JSON
        }
    }
    return obj;
}

function isWalletConnectedToTheRightNetwork() {
    return (Networks[walletNetwork] && chainId == targetChainId && Networks[walletNetwork].id == Networks[network].id);
}

function displayWrongNetworkWarning() {
    showModal("WrongNetwork");
}

function displayNotConnectedError() {
    showModal("NotConnected");
}

async function estimateGas(contract, fnName, ...args) {
    //var fn = eval(contract + ".methods." + fnName)(...args);
    var fn = contract.methods[fnName](...args);
    return parseInt(await fn.estimateGas() * 1.5);
}

async function estimateGasPayable(contract, fnName, amount, ...args) {
    //var fn = eval(contract + ".methods." + fnName)(...args);
    var fn = contract.methods[fnName](...args);
    return parseInt(await fn.estimateGas({value: amount}) * 1.5);
}

async function loadContract(abiURL, address) {
    var abi = await fetch(abiURL).then(response => response.json());
    return new web3.eth.Contract(abi, address);
}

async function getWordList(listIndex) {
    var listIndex = Number(listIndex).toString().padStart(3, '0');
    var wordList = await fetch("words_000.txt")
        .then(response => response.text())
        .then(text => text.split(/[\r\n]+/));
    return wordList;
}

function txLink(txId) {
    return "https://testnet.bscscan.com/tx/" + txId;
}

async function toggleApprove() {
    var btn = getObj("approve");
    var tokenSelection = getObj("tokenSelection");
    var index = tokenSelection.selectedIndex;
    if (tokenSelection[index].text == "BNB") {
        btn.disabled = true;
        btn.hidden = true;
        return;
    }
    btn.hidden = false;
    var params = getAirdropCreationParams();
    erc20token = await loadContract("erc20.json", params.tokenAddress);
    var amount = await read(erc20token, "allowance", null, selectedAccount, factoryAddress);
    if (amount == params.totalAmount) {
        btn.disabled = true;
        btn.textContent = "Approved"
        btn.className = "btn btn-success";
        return;
    }
    btn.disabled = false;
    btn.textContent = "Approve"
    btn.className = "btn btn-danger";
}

function getAirdropCreationParams() {
    var obj;
    var tokenAddress;
    var totalAmount;
    var percentPerClaim;

    // Get token address
    obj = getObj("tokenSelection");
    tokenAddress = obj[obj.selectedIndex].value;

    // Get token amount
    obj = getObj("tokenSupply");
    totalAmount = obj.value || obj.placeholder;

    // Get claim percentage
    obj = getObj("claimSize");
    percentPerClaim = obj.value || obj.placeholder;
    percentPerClaim = parseInt(parseFloat(percentPerClaim) * 100);

    return {
        "tokenAddress": tokenAddress,
        "totalAmount": totalAmount,
        "percentPerClaim": percentPerClaim
    }
}

async function approve() {
    var params = getAirdropCreationParams();
    erc20token = await loadContract("erc20.json", params.tokenAddress);
    var gasAmount = await estimateGas(erc20token, "approve", factoryAddress, params.totalAmount);
    write(
        erc20token, "approve", showTxStatusCreateAirdrop,
        {from: selectedAccount, gas: gasAmount},
        factoryAddress, params.totalAmount
    );
}

function copyButton(data) {
    return "<a href=\"javascript:void(0);\" style=\"" + iconCSS + "\" onclick=\"copyToClipboard('" + data + "');\">" + iconCopy + "</a>";
}

function extLinkButton(url) {
    return "<a href=\"" + url + "\" style=\"" + iconCSS + "\" target=\"_blank\">" + iconLink + "</a>";
}

function copyToClipboard(data) {
    const el = document.createElement('textarea');
    el.value = data;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
};

async function createAirdrop() {
    var gasAmount;
    var params = getAirdropCreationParams();
    subscribeLogEvent(factory, "AirdropCreated");
    if (params.tokenAddress == "BNB") {
        gasAmount = await estimateGasPayable(
            factory, "createAirdrop",
            params.totalAmount,
            params.percentPerClaim, 0, 888
        );
        write(
            factory, "createAirdrop", showTxStatusCreateAirdrop,
            {from: selectedAccount, value: params.totalAmount, gas: gasAmount},
            params.percentPerClaim, 0, 888
        );
        getObj("btnCreateAirdrop").disabled = true;
        return;
    }
    gasAmount = await estimateGas(
        factory, "createAirdrop",
        params.tokenAddress, params.totalAmount,
        params.percentPerClaim, 0, 888
    );
    write(
        factory, "createAirdrop", showTxStatusCreateAirdrop,
        {from: selectedAccount, gas: gasAmount},
        params.tokenAddress, params.totalAmount,
        params.percentPerClaim, 0, 888
    );
    getObj("btnCreateAirdrop").disabled = true;
}

async function showTxStatusCreateAirdrop(txId) {
    showTxStatus(txId, "CreateAirdrop", "toggleApprove()");
}

async function fnAirdropCreated(eventObj) {
    console.log("Airdrop", eventObj);
    airdrop = await loadContract("airdrop.json", eventObj.airdropAddress);
    var deployer = await read(airdrop, "deployer");
    if (selectedAccount != deployer) return;
    var obj = getObj("airdropSuccess");
    obj.innerHTML = "Airdrop contract deployed:<br><strong>" + eventObj.airdropAddress; + "</strong>"
    showModal("AirdropCreated");
}

async function openCreateAirdropModal() {
    if (!isWalletConnected) {
        displayNotConnectedError();
        return;
    }
    if (!isWalletConnectedToTheRightNetwork()) {
        displayWrongNetworkWarning();
        return;
    }
    var authorizedTokens = await read(factory, "getAuthorizedTokens");
    var tokenSelection = getObj("tokenSelection");
    tokenSelection.innerHTML = "<option>BNB</option>";
    for (const t of authorizedTokens) {
        var option = document.createElement("option");
        option.text = t[0];
        option.value = t[1];
        tokenSelection.appendChild(option);
    }
    toggleApprove();
    getObj("btnCreateAirdrop").disabled = false;
    showModal("CreateAirdrop");
}

async function openSelectAirdropModal() {
    if (!isWalletConnected) {
        displayNotConnectedError();
        return;
    }
    if (!isWalletConnectedToTheRightNetwork()) {
        displayWrongNetworkWarning();
        return;
    }
    var airdrops = []; var x; var y; var skip;
    var createdAirdrops =  await factory.getPastEvents("AirdropCreated", { fromBlock: 0, toBlock: 'latest' });
    var finishedAirdrops = await factory.getPastEvents("AirdropEnded", { fromBlock: 0, toBlock: 'latest' });

    for (const created of createdAirdrops) {
        // var currentBlock = await read(factory, "debugBlockNumber");
        // console.log(">>>>", currentBlock - e.blockNumber)
        // if (currentBlock - e.blockNumber >= airdropDuration) continue;
        skip = false;
        x = created.returnValues;
        for (const finished of finishedAirdrops) {
            y = finished.returnValues;
            if (x.airdropAddress == y.airdropAddress) {
                skip = true;
                break;
            }
        }
        if (skip) continue;
        airdrops.push(
            {
                "token": x.tokenAddress,
                "symbol": x.tokenSymbol,
                "address": x.airdropAddress,
                "claim": x.amountPerClaim
            }
        );
    }
    if (airdrops.length == 0) {
        showModal("NoAirdrops");
        return;
    }
    var airdropSelection = getObj("airdropSelection");
    airdropSelection.innerHTML = "";
    for (const a of airdrops) {
        var option = document.createElement("option");
        option.text = `${a.claim} ${a.symbol} @ ${shortAddress(a.address)}`;
        option.value = JSON.stringify(a);
        airdropSelection.appendChild(option);
    }
    showModal("SelectAirdrop");
}

async function updateAirdropPhase(phase=null) {
    obj = getObj("airdropPhase");
    if (!phase) phase = await read(airdrop, "status");
    if (phase >= 3) {
        obj.innerHTML = "💀 Airdrop status: Expired";
        return;
    }
    obj.innerHTML = "🟢 Airdrop status: LIVE!";
}

async function updateUserStatus(phase, user=null, deployer=null) {
    var obj = getObj("userPhase");
    getObj("userPendingValidations").innerHTML = "";
    getObj("divUserPendingValidations").hidden = true;
    if (!user) user = await read(airdrop, "myStatus");
    if (!deployer) deployer = await read(airdrop, "deployer");
    if (phase >= 3 || selectedAccount == deployer) {
        obj.innerHTML = "⛔ You can't interact with this airdrop!";
        return;
    }
    switch (user.status) {
        case "0": // User is unregistered
            obj.innerHTML = phase > 0 ?
                "⛔ You didn't register for this airdrop" : // After registration phase
                "🟢 You may register for this airdrop"; // During registration phase
            break;

        case "1": // User is registered
            obj.innerHTML = phase > 1 ? (
                // Claim phase
                user.didPeerReview ?
                    "⛔ You didn't get validated by your peers!" :
                    "⛔ You didn't do peer review!"

            ) : (
                // Validation phase
                user.didPeerReview ?
                    "✅ You did peer review!" : (
                        phase == 0 ?
                            "✅ You registered for this airdrop" :
                            "🟡 You need to do peer review"
                    )
            );
            break;

        case "2": // User is validated
            obj.innerHTML = phase > 1 ? (
                // Claim phase
                user.didPeerReview ?
                    "🟢 You may claim this airdrop" :
                    "⛔ You didn't do peer review!"

            ) : (
                // Validation phase
                user.didPeerReview ?
                    "🟢 You may claim this airdrop" :
                    "🟡 You need to do peer review"
            );
            break;

        case "3":
            obj.innerHTML = "✅ You already claimed this airdrop";
            break;

        default:
            obj.innerHTML = "User status: " + userPhases[user.status];
            break;
    }
    if (phase >= 1 && user.status == 1 && user.pendingValidations) {
        getObj("userPendingValidations").innerHTML = "🟡 Pending validations: " + user.pendingValidations;
        getObj("divUserPendingValidations").hidden = false;
    }
}

async function updateValidateButtons(user=null) {
    if (!user) user = await read(airdrop, "myStatus");
    var isDisabled = (user.didPeerReview || user.status == 0);
    getObj("btnOpenValidateModal").disabled = isDisabled;
    getObj("btnNextPeer").disabled = isDisabled;
}

async function updateRegisterButtons(user=null, deployer=null) {
    if (!user) user = await read(airdrop, "myStatus");
    if (!deployer) deployer = await read(airdrop, "deployer");
    var isDisabled = (user.status > 0 || selectedAccount == deployer);
    getObj("btnOpenRegisterModal").disabled = isDisabled;
    getObj("btnRegisterSubmit").disabled = isDisabled;
}

async function openAirdropInteractionModal() {
    var obj = getObj("airdropSelection");
    var airdropData = JSON.parse(obj[obj.selectedIndex].value);
    airdrop = await loadContract("airdrop.json", airdropData.address);
    var deployer = await read(airdrop, "deployer");
    // if (selectedAccount == deployer) {
    //     showModal("AdminAirdrop");
    //     return;
    // }
    var status = await read(airdrop, "status");
    var user = await read(airdrop, "myStatus");
    var btnRegister = getObj("btnOpenRegisterModal");
    var btnValidate = getObj("btnOpenValidateModal");
    var btnClaim    = getObj("btnClaim");
    btnRegister.disabled = true; btnRegister.className = "btn btn-default";
    btnValidate.disabled = true; btnValidate.className = "btn btn-default";
    btnClaim.disabled    = true; btnClaim.className    = "btn btn-default";
    switch (status.phase) {
        case "0":
            btnRegister.className = "btn btn-primary";
            await updateRegisterButtons(user=user, deployer=deployer);
            break;

        case "1":
            btnValidate.className = "btn btn-primary";
            await updateValidateButtons(user=user);
            break;

        case "2":
            btnClaim.className = "btn btn-primary"
            btnClaim.disabled = Boolean(selectedAccount == deployer || user.status == "3");
            break;
    }
    await updateAirdropPhase(status.phase);
    await updateUserStatus(status.phase, user=user, deployer=deployer);
    showModal("AirdropInteraction");
}

async function updateRegisterModal() {
    var listIndex = await read(airdrop, "captchaListIndex");
    var wordList = await getWordList(listIndex);
    var indexes = await read(airdrop, "myCapcha");
    var words = [];
    for (var i = 0; i < 3; ++i) {
        words.push(wordList[indexes[i]]);
    }
    var obj = getObj("registrationTask");
    obj.innerHTML = (
        "Please create a sentence using the following words:<br/>"
        + "<strong>" + words[0] + ", " + words[1] + ", " + words[2] + "</strong>"
    );
}

async function openRegisterModal() {
    magicNumber = null;
    updateRegisterModal();
    const msg = iconMine + "Your magic number is being calculated:"
    var hash = await read(airdrop, "myHash");
    var worker = new Worker("worker.js");
    var difficulty = 0;
    //var bits = 256 - (240 - (difficulty * 4));
    worker.postMessage({hash: hash, difficulty: 0, start: 0});
    worker.onmessage = function(event) {
        var guess = event.data;
        if (guess.value % 128 == 0) {
          //var percentage = ((guess.value / (2**bits)) * 100).toFixed(2);
          //percentage = percentage >= 100 ? "(almost there!)" : percentage + "%";
          getObj("registrationMagicNumberProgress").innerHTML = guess.value //percentage;
        }
        if (!guess.done) return;
        worker.terminate();
        magicNumber = guess.value;
        var btn = getObj("btnRegisterSubmit");
        btn.innerHTML = "Submit";
        btn.disabled = false;
        getObj("registrationMagicNumber").innerHTML = "✅ Magic number: " + magicNumber;
        getObj("registrationMagicNumberProgress").innerHTML = "";
    };

    $("#modalRegister").on(
        'hidden.bs.modal', function (e) {
            //clearInterval(guessMagicNumber);
            worker.terminate();
            magicNumber = null;
        }
    );
    getObj("registrationMagicNumber").innerHTML = msg;
    var btn = getObj("btnRegisterSubmit");
    btn.innerHTML = "Please wait...";
    btn.disabled = true;
    showModal("Register");
}

async function updateValidationModal(task, review) {
    var obj;
    var showPeerEvaluation = false;
    for (var i = 0; i < numPeers; ++i) {
        if (!review.didPeerReview) {
            userReview[selectedPeer] = 1;
            continue;
        }
        var emoji = review.validations[i].evaluation ? "🧑" : "🤖";
        obj = getObj("divPeer" + i);
        obj.hidden = false;
        obj.innerHTML = `${review.validations[i].problem}: ${review.validations[i].solution} - ${emoji}`
        showPeerEvaluation = true;
    }
    obj = getObj("myPeer");
    obj.innerHTML = `${task.problem}: ${task.solution}`;
    getObj("btnNextPeer").textContent = (
        selectedPeer == lastPeer ? "Submit" : "Next"
    );
    getObj("btnPeerReviewPASS").disabled = false;
    getObj("btnPeerReviewFAIL").disabled = false;
    getObj("btnNextPeer").hidden = true;
    if (showPeerEvaluation) {
        getObj("divPeerEvaluation").hidden = false;
        getObj("btnPeerSolutionPASS").disabled = true;
        getObj("btnPeerSolutionFAIL").disabled = true;
    }
    else {
        getObj("divPeerEvaluation").hidden = true;
        getObj("btnPeerSolutionPASS").disabled = false;
        getObj("btnPeerSolutionFAIL").disabled = false;
    }
}

async function submitValidation() {
    var gasAmount = await estimateGas(
        airdrop, "validate", userReview
    );
    write(
        airdrop, "validate", showTxStatusValidate,
        {from: selectedAccount, gas: gasAmount},
        userReview
    );
    getObj("btnNextPeer").disabled = true;
}

async function nextPeer() {
    if (selectedPeer == lastPeer) {
        submitValidation();
        return;
    }
    ++selectedPeer;
    var peerData = await getPeerData();
    await updateValidationModal(peerData.task, peerData.review);
}


function evalPeerReview(result) {
    var buttons = ["FAIL", "PASS"];
    getObj("btnPeerReviewPASS").disabled = true;
    getObj("btnPeerReviewFAIL").disabled = true;
    getObj("btnPeerSolutionPASS").disabled = false;
    getObj("btnPeerSolutionFAIL").disabled = false;
    userReview[selectedPeer] = result;
}

function evalPeerSolution(result) {
    var buttons = ["FAIL", "PASS"];
    getObj("btnPeerSolutionPASS").disabled = true;
    getObj("btnPeerSolutionFAIL").disabled = true;
    getObj("btnNextPeer").hidden = false;
    userReview[selectedPeer] = userReview[selectedPeer] * result;
}

async function getPeerData() {
    var validationData = await getPeerAnswersAndValidations();
    return validationData[selectedPeer];
}

async function openValidateModal() {
    selectedPeer = 0;
    userReview = Array(5).fill(0);
    var peerData = await getPeerData();
    updateValidationModal(peerData.task, peerData.review);
    showModal("Validate");
}

async function blocksToRegister() {
    var currentBlockNumber = await read(airdrop, "debugBlockNumber");
    var creationBlockNumber = await read(airdrop, "blockNumber");
    var duration = await read(airdrop, "duration");
    return duration - (currentBlockNumber - creationBlockNumber);
    //return currentBlockNumber - creationBlockNumber < duration / 3;
}

async function register() {
    var obj = getObj("taskSolution");
    var gasAmount = await estimateGas(
        airdrop, "register",
        obj.value, magicNumber
    );
    write(
        airdrop, "register", showTxStatusRegister,
        {from: selectedAccount, gas: gasAmount},
        obj.value, magicNumber
    );
    getObj("btnRegisterSubmit").disabled = true;
}

function toWords(wordList, indexes) {
    var words = [];
    for (const i of indexes) {
        words.push(wordList[Number(i)]);
    }
    return words.join(", ");
}

async function getPeerAnswersAndValidations() {
    var x = await read(airdrop, "peerValidations");
    var y = await read(airdrop, "peerAnswers");
    var wordList = await getWordList(0); // TODO: from contract!!!
    var peers = [];
    for (var i = 0; i < numPeers; ++i) { //peer of x.problems) {
        var review = {};
        const peerProblems = x.problems[i];
        const peerSolutions = x.solutions[i];
        const peerReview = x.review[i];
        const peerDidReview = x.didPeerReview[i];
        review.didPeerReview = peerDidReview;
        review.validations = [];
        for (var j = 0; j < numPeers; ++j) { //(const validatedProblem of peer) {
            const validatedProblem = peerProblems[j];
            const validatedSolution = peerSolutions[j];
            const validationResult = [peerDidReview, peerReview[j]];
            //console.log(toWords(validatedProblem), validatedSolution, validationResult);
            review.validations.push(
                {
                    "problem": toWords(wordList, validatedProblem),
                    "solution": validatedSolution,
                    "evaluation": Boolean(Number(peerReview[j]))
                }
            );
        }
        var task = {
            "problem": toWords(wordList, y.problems[i]),
            "solution": y.solutions[i]
        };
        peers.push(
            {
                "review": review,
                "task": task
            }
        );
    }
    return peers;
}

async function claim() {
    var gasAmount = await estimateGas(
        airdrop, "claim"
    );
    write(
        airdrop, "claim", showTxStatusClaim,
        {from: selectedAccount, gas: gasAmount}
    );
    getObj("btnClaim").disabled = true;
}

async function endAirdrop() {
    var gasAmount = await estimateGas(
        factory, "endAirdrop",
        airdrop._address
    );
    write(
        factory, "endAirdrop",
        {from: selectedAccount, gas: gasAmount},
        airdrop._address
    );
}

async function openMintNFTModal() {
    console.log("Not implemented yet");
}

async function showTxStatusRegister(txId) {
    showTxStatus(txId, "Register", "updateRegisterButtons(); updateAirdropPhase(); updateUserStatus(0)");
}

async function showTxStatusValidate(txId) {
    showTxStatus(txId, "Validate", "updateValidateButtons(); updateAirdropPhase(); updateUserStatus(1)");
}

async function showTxStatusClaim(txId) {
    showTxStatus(txId, "Claim", "updateUserStatus(2)");
}

async function showTxStatus(txId, objId, doStuff=null) {
    var objId = "txStatus" + objId;
    var htmlCode = txId + copyButton(txId) + extLinkButton(txLink(txId));
    var obj = getObj(objId);
    obj.style.visibility = "visible";
    obj.innerHTML = iconWork + htmlCode;
    var checkTx = setInterval(
        async function () {
            result = await web3.eth.getTransactionReceipt(txId);
            if (!result) return;
            obj.innerHTML = (result.status ? iconDone : iconWarn) + htmlCode;
            if (doStuff) eval(doStuff);
            clearInterval(checkTx);
        }, 3000
    );
}

function showModal(name) {
    var obj = $("#modal" + name);
    obj.on(
        'hidden.bs.modal', function (e) {
            modalStack.pop();
        }
    );
    obj.on(
        'shown.bs.modal', function (e) {
            modalStack.push(obj);
        }
    );
    obj.modal('show');
}

function closeAllModals() {
    while (modalStack.length > 0) {
        modalStack.pop().modal('hide');
    }
}

const subscribedEvents = {};

const subscribeLogEvent = (contract, eventName) => {
    const eventJsonInterface = web3.utils._.find(contract._jsonInterface, o => o.name === eventName && o.type === 'event', )
    const subscription = web3.eth.subscribe('logs', {
        address: contract.options.address,
        topics: [eventJsonInterface.signature]
    }, (error, result) => {
        if (!error) {
            const eventObj = web3.eth.abi.decodeLog(eventJsonInterface.inputs, result.data, result.topics.slice(1))
            unsubscribeEvent(eventName);
            callback = `fn${eventName}`;
            if (exists(callback)) eval(callback)(eventObj);
        }
    });
    subscribedEvents[eventName] = subscription;
    console.log(`Subscribed to event '${eventName}' of contract '${contract.options.address}' `);
}

const unsubscribeEvent = (eventName) => {
    subscribedEvents[eventName].unsubscribe(function(error, success) {
        if (success) console.log('Successfully unsubscribed!');
    });
}

function debug_endRegistrationPhase() {
    debug_setBlockNumber(20000);
}

function debug_endValidationPhase() {
    debug_setBlockNumber(40000);
}

function debug_endClaimPhase() {
    debug_setBlockNumber(80000);
}

async function debug_setBlockNumber(blockNumber) {
    gasAmount = await estimateGas(
        airdrop, "setBlockNumber",
        blockNumber
    )
    await write(
        airdrop, "setBlockNumber", null,
        {from: selectedAccount, gas: gasAmount},
        blockNumber
    )
}

async function debug_getBlockNumber() {
    return await read(airdrop, "debugBlockNumber");
}

async function main() {
    // Setup wallet connection
    isWalletConnected = false;
    web3Modal = new Web3Modal.default({
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false // optional. For MetaMask / Brave / Opera.
    });

    // Update user balance every 15 seconds
    // var interval = setInterval(
    //     function () {
    //         if (isWalletConnected && isWalletConnectedToTheRightNetwork() && document.hasFocus()) {
    //             displayBalance();
    //         }
    //     }, 5000
    // );
}
