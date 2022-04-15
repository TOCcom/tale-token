const ComboStaking = artifacts.require("ComboStaking");
const TaleToken = artifacts.require("TaleToken");
const MinterFactory = artifacts.require("MinterFactory");

module.exports = function (deployer) {
    deployer.deploy(ComboStaking, TaleToken.address, MinterFactory.address);
};