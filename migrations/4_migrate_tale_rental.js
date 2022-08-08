const TaleRental = artifacts.require("TaleRental");

module.exports = function (deployer) {
  deployer.deploy(TaleRental, "0xD9e68327A19E11d38e1708d1c4d6149C4B007E38", 50);
};
