const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");
const TaleRental = artifacts.require("TaleRental");

module.exports = function (deployer) {
  deployer.deploy(TalesOfChainHero, "https://talesofchain.com/", MinterFactory.address, TaleRental.address);
};
