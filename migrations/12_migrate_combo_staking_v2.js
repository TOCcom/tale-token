const ComboStakingV2 = artifacts.require("ComboStakingV2");
const TaleToken = artifacts.require("TaleToken");
const MinterFactory = artifacts.require("MinterFactory");

module.exports = function (deployer) {
    deployer.deploy(ComboStakingV2, TaleToken.address, MinterFactory.address);
};