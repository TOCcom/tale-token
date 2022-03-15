const MinterFactory = artifacts.require("MinterFactory");

module.exports = function (deployer) {
  deployer.deploy(MinterFactory);
};
