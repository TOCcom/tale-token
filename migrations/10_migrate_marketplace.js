const Marketplace = artifacts.require("Marketplace");

module.exports = async function (deployer) {
    await deployer.deploy(Marketplace);
};
