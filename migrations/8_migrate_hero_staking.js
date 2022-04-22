const HeroStaking = artifacts.require("HeroStaking");
const TaleToken = artifacts.require("TaleToken");

module.exports = function (deployer) {
    deployer.deploy(HeroStaking, TaleToken.address, "1000000000000000");
};
