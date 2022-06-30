const BuyPack = artifacts.require("BuyPack");
const TaleToken = artifacts.require("TaleToken");

module.exports = function (deployer) {
    deployer.deploy(BuyPack,
        "0x0000000000000000000000000000000000000000", 
        "0x0000000000000000000000000000000000000000", 
        TaleToken.address);
};
