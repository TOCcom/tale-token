const TaleRental = artifacts.require("TaleRental");

module.exports = function (deployer) {
  deployer.deploy(TaleRental, "0x0000000000000000000000000000000000000000", 0);
};
