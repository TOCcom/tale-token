const TaleToken = artifacts.require("TaleToken");

module.exports = function (deployer) {
  deployer.deploy(TaleToken, 
    "0xd9dc031e4f57d02b5260c79c9e776eaf0d8de85a", 71104167,
    "0x69dccf78085eb27e18e2641f0f4090d296b795e6", 45900000,
    "0xcd9d0a5a4c813869cf6a4b71b1d37a6a3e4a26f6", 70000000,
    "0x2759baf50fc2b3de8e20233e05d112c93fb1c3aa", 5000000,
    "0x03f30e3cc98ed22a77baf4d26bae94e3ad453a3a", 5527500);
};
