const SimpleStaking = artifacts.require("SimpleStaking");
const TaleToken = artifacts.require("TaleToken");

module.exports = function (deployer) {
    deployer.deploy(SimpleStaking, TaleToken.address);
};